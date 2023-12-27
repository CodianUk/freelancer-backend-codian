import { OneTimeOrder } from "../models/oneTimeOrder.js";
import { EquityOrder } from "../models/equityOrder.js";
import mongoose from "mongoose";
import NOTFOUND from "../errors/notFound.js";
import UnAuthorized from "../errors/unAuthorized.js";
import BadRequest from "../errors/badRequest.js";
import { RatingAndReview } from "../models/ratingandreview.js";
import { Transaction } from "../models/transaction.js";
import stripePass from "stripe";
const stripe = stripePass(process.env.STRIPE_SECRET_KEY);

// @import Redis
import Redis from "ioredis";
const redisClient = new Redis(process.env.REDIS_URL);

import { User } from "../models/user.js";
import { Startup } from "../models/startup.js";
import { Wallet } from "../models/wallet.js";
import { earned } from "../models/earned.js";
import { appEarnings } from "../models/appEarnings.js";
import cron from "node-cron";

// runnig this everyday at midnight to check if 7 days have passed
// if yes then adding that amount to the available balance of the user
cron.schedule("*/30 * * * *", async () => {
  let tobeReleased = await earned.find({
    status: "pending",
    // if createdAt is greater than or equal to 7 days ago
    createdAt: {
      $lte: new Date(
        new Date().getTime() -
          parseInt(process.env.RELEASE_AFTER_DAYS) * 86400000
      ),
    },
  });

  if (tobeReleased.length > 0) {
    for (let i = 0; i < tobeReleased.length; i++) {
      let wallet = await getUsersWallet(tobeReleased[i].userId);
      wallet.availableBalance += tobeReleased[i].amount;
      wallet.pendingClearence -= tobeReleased[i].amount;
      await wallet.save();
      await earned.findByIdAndUpdate(tobeReleased[i]._id, {
        status: "released",
      });
    }
  }
});

//helper function
const ObjectIdMaker = (id) => {
  return mongoose.Types.ObjectId(id);
};

//helper function
const getWalletPaymentMethod = async (userId, method) => {
  return new Promise(async (resolve, reject) => {
    let _id = ObjectIdMaker(userId);
    let wallet = await Wallet.findOne(
      { userId: _id },
      {
        availableBalance: 1,
        paymentMethods: { $elemMatch: { method: method } },
      }
    );
    if (wallet.paymentMethods.length > 0) {
      return resolve(wallet);
    }
    return reject(new NOTFOUND("Wallet not found"));
  });
};

const getUsersWallet = async (userId) => {
  return new Promise(async (resolve, reject) => {
    let wallet = await Wallet.findOne({ userId: userId });
    if (wallet) {
      return resolve(wallet);
    }
    return reject(new NOTFOUND("Wallet not found"));
  });
};

// helper function
const getAdminWallet = async () => {
  return new Promise(async (resolve, reject) => {
    let adminId = await User.findOne({ role: "Admin" }, { _id: 1 });
    let wallet = await Wallet.findOne({ userId: adminId._id });
    if (wallet) {
      return resolve(wallet);
    }
    return reject(new NOTFOUND("Admin wallet not found"));
  });
};

//get all orders of a freelancer
const getAllOrders = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let category = req.body.category;
    let aggPipeLine = [];
    aggPipeLine.push({
      $match: {
        $and: [
          {
            freelancerId: _id,
          },
          {
            offerStatus: "Accepted",
          },
        ],
      },
    });
    if (category) {
      aggPipeLine.push({
        $match: {
          status: {
            $regex: category,
            $options: "i",
          },
        },
      });
    }
    aggPipeLine.push(
      {
        $lookup: {
          from: "users",
          localField: "clientId",
          foreignField: "_id",
          as: "clientData",
        },
      },
      {
        $unwind: {
          path: "$clientData",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "ratingandreviews",
          localField: "_id",
          foreignField: "orderId",
          as: "ratingData",
        },
      },
      {
        $unwind: {
          path: "$ratingData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          employer: {
            avatar: "$clientData.avatar",
            name: "$clientData.name",
            email: "$clientData.email",
          },
          rating: {
            $cond: {
              if: {
                $gt: ["$ratingData.rating", 0],
              },
              then: "$ratingData.rating",
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          employer: 1,
          jobTitle: 1,
          totalPrice: 1,
          deliveryTime: 1,
          createdAt: 1,
          updatedAt: 1,
          description: 1,
          rating: 1,
          deliverdOn: "$delivery.updatedAt",
        },
      }
    );
    let response = await OneTimeOrder.aggregate(aggPipeLine);
    if (response) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response.length > 0 ? response : [] });
    }
  } catch (err) {
    next(err);
  }
};

//get details of a specific order
const getOrderById = async (req, res, next) => {
  try {
    let orderId = ObjectIdMaker(req.body.orderId);
    let _id = ObjectIdMaker(req.user._id);
    let response = null;
    // set redis key
    let redisKey = `order_${req.body.orderId}`;
    // get redis data
    let redisData = await redisClient.get(redisKey);
    if (redisData) {
      response = JSON.parse(redisData);
    } else {
      let aggPipeLine = await OneTimeOrder.aggregate([
        {
          $match: {
            $and: [
              {
                _id: orderId,
              },
              {
                freelancerId: _id,
              },
              {
                offerStatus: "Accepted",
              },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "clientId",
            foreignField: "_id",
            as: "clientData",
          },
        },
        {
          $unwind: {
            path: "$clientData",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "ratingandreviews",
            localField: "_id",
            foreignField: "orderId",
            as: "reviewData",
          },
        },
        {
          $unwind: {
            path: "$reviewData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "reviewData.reviewBy",
            foreignField: "_id",
            as: "reviewerData",
          },
        },
        {
          $unwind: {
            path: "$reviewerData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            employer: {
              avatar: "$clientData.avatar",
              name: "$clientData.name",
              email: "$clientData.email",
            },
          },
        },
        {
          $project: {
            employer: 1,
            jobTitle: 1,
            totalPrice: 1,
            deliveryTime: 1,
            createdAt: 1,
            description: 1,
            delivery: {
              $cond: {
                if: { $eq: ["$status", "Delivered"] },
                then: {
                  attachments: "$delivery.attachments",
                  comment: "$delivery.comment",
                  date: "$delivery.updatedAt",
                },
                else: false,
              },
            },
            review: {
              $cond: {
                if: { $eq: ["$status", "Completed"] },
                then: {
                  reviewId: "$reviewData._id",
                  avatar: "$reviewerData.avatar",
                  name: "$reviewerData.name",
                  email: "$reviewerData.email",
                  rating: "$reviewData.rating",
                  comment: "$reviewData.review",
                  date: "$reviewData.createdAt",
                },
                else: false,
              },
            },
            cancelledInfo: {
              $cond: {
                if: { $eq: ["$status", "Cancelled"] },
                then: {
                  reason: "$cancelled.reason",
                  date: "$cancelled.updatedAt",
                },
                else: false,
              },
            },
          },
        },
      ]);

      if (aggPipeLine.length <= 0) {
        return next(new NOTFOUND("No such order found"));
      }
      response = aggPipeLine[0];
      // set redis data
      await redisClient.set(
        redisKey,
        JSON.stringify(response),
        "EX",
        60 * 60 * 24
      );
    }
    if (!response) {
      let err = new NOTFOUND("No such order found");
      return next(err);
    }
    return res.status(200).setHeader("Content-Type", "application/json").json({
      status: "OK",
      data: response,
    });
  } catch (err) {
    next(err);
  }
};
//get order details for admin
const getOrderDetails = async (req, res, next) => {
  try {
    let orderId = ObjectIdMaker(req.body.orderId);
    let _id = ObjectIdMaker(req.user._id);
    let response = null;
    // set redis key
    // let redisKey = `order_${req.body.orderId}`;
    // get redis data
    // let redisData = await redisClient.get(redisKey);
      // response = JSON.parse(redisData);
      // console.log("redis", response)
      let aggPipeLine = await OneTimeOrder.aggregate([
        {
          $match: {
            $and: [
              {
                _id: orderId,
              }
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "clientId",
            foreignField: "_id",
            as: "clientData",
          },
        },
        {
          $unwind: {
            path: "$clientData",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "ratingandreviews",
            localField: "_id",
            foreignField: "orderId",
            as: "reviewData",
          },
        },
        {
          $unwind: {
            path: "$reviewData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "reviewData.reviewBy",
            foreignField: "_id",
            as: "reviewerData",
          },
        },
        {
          $unwind: {
            path: "$reviewerData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            employer: {
              avatar: "$clientData.avatar",
              name: "$clientData.name",
              email: "$clientData.email",
            },
          },
        },
        {
          $project: {
            employer: 1,
            jobTitle: 1,
            totalPrice: 1,
            deliveryTime: 1,
            createdAt: 1,
            description: 1,
            status:1,
            delivery: {
              $cond: {
                if: { $eq: ["$status", "Delivered"] },
                then: {
                  attachments: "$delivery.attachments",
                  comment: "$delivery.comment",
                  date: "$delivery.updatedAt",
                },
                else: false,
              },
            },
            review: {
              $cond: {
                if: { $eq: ["$status", "Completed"] },
                then: {
                  reviewId: "$reviewData._id",
                  avatar: "$reviewerData.avatar",
                  name: "$reviewerData.name",
                  email: "$reviewerData.email",
                  rating: "$reviewData.rating",
                  comment: "$reviewData.review",
                  date: "$reviewData.createdAt",
                },
                else: false,
              },
            },
            cancelledInfo: {
              $cond: {
                if: { $eq: ["$status", "Cancelled"] },
                then: {
                  reason: "$cancelled.reason",
                  date: "$cancelled.updatedAt",
                },
                else: false,
              },
            },
          },
        },
      ]);
      

      if (aggPipeLine.length <= 0) {
        return next(new NOTFOUND("No such order found"));
      }
      response = aggPipeLine[0];
      // set redis data
      // await redisClient.set(
      //   redisKey,
      //   JSON.stringify(response),
      //   "EX",
      //   60 * 60 * 24
      // );
    if (!response) {
      let err = new NOTFOUND("No such order found");
      return next(err);
    }
    return res.status(200).setHeader("Content-Type", "application/json").json({
      status: "OK",
      data: response,
    });
  } catch (err) {
    next(err);
  }
};

// creates a one time order
const createAOneTimeOrder = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let isoDate = new Date(req.body.deliveryTime).toISOString();
    if (Date.parse(isoDate) < Date.parse(new Date(Date.now()))) {
      return next(new BadRequest("Delivery time cannot be in the past"));
    }
    let newOrder = new OneTimeOrder({
      freelancerId: _id,
      ...req.body,
      deliveryTime: isoDate,
      appPercentage: parseInt(process.env.APP_PERCENT),
    });
    let response = await newOrder.save();
    if (response) {
      return res
        .status(201)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
  } catch (err) {
    next(err);
  }
};

// This route should only be called when the stripe payment is successfull
// update offer status based on the offer is accepted,rejected or withdrawn
const oneTimeOfferStatusUpdate = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let { orderId, OfferStatus } = req.body;

    //getting orderDetails from database
    let orderDetails = await OneTimeOrder.findById(orderId);
    if (!orderDetails) {
      return next(new NOTFOUND("No such order found"));
    }

    // set redis key
    let redisKey = `order_${orderId}`;

    // updation can only be done by the client or the freelancer thata has created this order
    if (
      orderDetails.clientId.toString() !== _id.toString() &&
      orderDetails.freelancerId.toString() !== _id.toString()
    ) {
      return next(
        new UnAuthorized("You are not authorized to perform this action")
      );
    }

    // Validation for client only able to accept or reject the offer
    if (OfferStatus === "Accepted" || OfferStatus === "Rejected") {
      if (orderDetails.clientId.toString() !== _id.toString()) {
        return next(
          new UnAuthorized("You are not authorized to perform this action")
        );
      }
    }
    // Validation for freelancer only able to withdraw the offer
    else if (OfferStatus === "Withdrawn") {
      if (orderDetails.freelancerId.toString() !== _id.toString()) {
        return next(
          new UnAuthorized("You are not authorized to perform this action")
        );
      }
    }

    if (OfferStatus === "Accepted") {
      // Add to total spending of startup owner
      let cleintWallet = await getUsersWallet(orderDetails.clientId);
      cleintWallet.spending += orderDetails.totalPrice;
      await cleintWallet.save();
      //---------------------------------------------

      let response = await OneTimeOrder.findOneAndUpdate(
        { _id: orderId },
        { offerStatus: OfferStatus, status: "Active" },
        { new: true }
      );
      if (response) {
        // delete the redis key
        await redisClient.del(redisKey);

        return res
          .status(200)
          .setHeader("Content-Type", "application/json")
          .json({ status: "OK", data: response });
      }
      let err = new NOTFOUND("No such order found");
      return next(err);
    }
    // if status is rejected or withdrawn then just update the status
    let response = await OneTimeOrder.findOneAndUpdate(
      { _id: orderId },
      { offerStatus: OfferStatus, status: "InActive" },
      { new: true }
    );
    if (response) {
      // delete the redis key
      await redisClient.del(redisKey);

      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
    let err = new NOTFOUND("No such order found");
    return next(err);
  } catch (err) {
    return next(err);
  }
};


const getOrdersByFreelancerId = async (req, res, next) => {
  try {
    const clientId = req.params.clientId;

    // Find all orders with the specified clientId
    const orders = await EquityOrder.find({ clientId });

    // Create an array to store the combined results
    const combinedResults = [];

    // Loop through each order and retrieve startup data
    for (const order of orders) {
      const startupId = order.startupId; // Replace 'startupId' with the actual field name in your EquityOrder model
      const startupData = await Startup.findById(startupId);

      // Combine order and startup data
      const combinedResult = {
        order: order,
        startup: startupData,
      };

      combinedResults.push(combinedResult);
    }

    return res.status(200).json({ status: 'OK', data: combinedResults });
  } catch (err) {
    next(err);
  }
};



// const getOrdersByFreelancerId = async (req, res, next) => {
//   try {
//     const clientId = req.params.clientId;
//     const orders = await EquityOrder.find({ clientId });

//     return res.status(200).json({ status: 'OK', data: orders });
//   } catch (err) {
//     next(err);
//   }
// };



// 
const getEquityOrdersByStartupId = async (req, res, next) => {
  try {
    const startupId = req.params.startupId;

    // Find all equity orders for the specified startupId
    const equityOrders = await EquityOrder.find({ startupId }).exec();

    if (!equityOrders) {
      return res.status(404).json({ message: "No equity orders found for the specified startupId" });
    }

    // Return the equity orders as JSON response
    return res.status(200).json({ status: "OK", data: equityOrders });
  } catch (err) {
    next(err);
  }
};

// creates an equity Order
const createEquityOrder = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let newOrder = new EquityOrder({
      freelancerId: _id,
      ...req.body,
    });
    let response = await newOrder.save();
    if (response) {
      return res
        .status(201)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
  } catch (err) {
    next(err);
  }
};

// update offer status based on the offer is accepted,rejected or withdrawn
const EquityOfferStatusUpdate = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let { orderId, startupId, offerStatus, position } = req.body;

    if (orderId && offerStatus) {
      let response = null;
      let order = await EquityOrder.findById(orderId);
      if (!order) {
        let err = new NOTFOUND("No such order found");
        return next(err);
      }

      //set redis key
      let redisKey = `order_${orderId}`;

      // Validation --------------------------------------------------------
      if (offerStatus === "Accepted" || offerStatus === "Rejected") {
        if (_id.toString() !== order.clientId.toString()) {
          let err = new UnAuthorized(
            "You are not authorized to perform this action"
          );
          return next(err);
        }
      } else if (offerStatus === "Withdrawn") {
        if (_id.toString() !== order.freelancerId.toString()) {
          let err = new UnAuthorized(
            "You are not authorized to perform this action"
          );
          return next(err);
        }
      }
      // ------------------------------------------------------------------------

      if (offerStatus === "Accepted") {
        if (!startupId || !position) {
          let err = new BadRequest("StartupId and Position are required");
          return next(err);
        }

        order.offerStatus = offerStatus;
        order.startupId = startupId;
        order.position = position;
        response = await order.save();
        if (response) {
          const findStartup = await Startup.findById(startupId);
          if (findStartup) {
            let newmember = {
              member: _id,
              position: position,
              role: response.jobTitle,
            };
            findStartup.members.push(newmember);
            await findStartup.save();
          }
        }
      } else if (offerStatus === "Rejected" || offerStatus === "Withdrawn") {
        order.offerStatus = offerStatus;
        response = await order.save();
      }
      if (response) {
        // delete the redis key
        // await redisClient.del(redisKey);

        return res
          .status(200)
          .setHeader("Content-Type", "application/json")
          .json({ status: "OK", data: response });
      }
      let err = new NOTFOUND("No such order found");
      return next(err);
    } else {
      let err = new BadRequest("OrderId and Status are requried");
      return next(err);
    }
  } catch (err) {
    return next(err);
  }
};

//deliver a onetimeProject
const deliverOneTimeOrder = async (req, res, next) => {
  try {
    let { orderId, attachments, ...toStore } = req.body;
    let freelancerId = req.user._id;
    let orderData = await OneTimeOrder.findById(orderId);

    //CHECKS-------------------------------------------------
    if (!orderData) {
      return next(new NOTFOUND("No such order found"));
    }
    if (freelancerId !== orderData.freelancerId.toString()) {
      let err = new BadRequest("You are not authorized to deliver this order");
      return next(err);
    }
    if (orderData.status === "Completed") {
      let err = new BadRequest("Order is already completed");
      return next(err);
    }
    if (orderData.status === "Cancelled") {
      let err = new BadRequest("Order is already cancelled");
      return next(err);
    }
    if (orderData.offerStatus !== "Accepted") {
      let err = new BadRequest("Offer is not accepted by the client");
      return next(err);
    }
    // -----------------------------------------------------

    // set redis key
    let redisKey = `order_${orderId}`;

    let response = await OneTimeOrder.findOneAndUpdate(
      { _id: orderId, freelancerId: freelancerId },
      {
        status: "Pending",
        delivered: true,
        delivery: { ...toStore, attachments: attachments },
      },
      { new: true, runValidators: true }
    );
    if (response) {
      // delete the redis key
      await redisClient.del(redisKey);

      return res
        .status(201)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    } else {
      let err = new NOTFOUND("No such order found");
      return next(err);
    }
  } catch (err) {
    next(err);
  }
};

// accept the delivery or cancel and send for revision
const updateDeliveryStatus = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let { orderId, status } = req.body;
    let orderData = await OneTimeOrder.findById(orderId).select(
      "clientId freelancerId totalPrice appPercentage"
    );
    if (!orderData) {
      return next(new NOTFOUND("No such order found"));
    }

    // set redis key
    let redisKey = `order_${orderId}`;

    //validation only client can accept or reject the delivery
    let clientId = ObjectIdMaker(orderData.clientId);
    let freelancerId = ObjectIdMaker(orderData.freelancerId);

    if (clientId.toString() !== _id.toString()) {
      let err = new UnAuthorized(
        "You are not authorized to perform this action"
      );
      return next(err);
    }

    if (status === "Completed") {
      let newPendingClearence = new earned({
        userId: freelancerId,
        orderId,
        dbRef: "oneTimeOrder",
        amount:
          orderData.totalPrice -
          (orderData.totalPrice * orderData.appPercentage) / 100,
      });

      // Adding the amount to freelancer wallet as pending clearence
      let freelancerWallet = await getUsersWallet(freelancerId);
      freelancerWallet.pendingClearence =freelancerWallet.pendingClearence +(orderData.totalPrice -(orderData.totalPrice * orderData.appPercentage) / 100);
      await freelancerWallet.save();
      // ---------------------------------------------------------------

      let response = await OneTimeOrder.findByIdAndUpdate(
        orderId,
        { status: status },
        { new: true }
      );
      if (response) {
        let responseClearence = await newPendingClearence.save();
        if (!responseClearence) {
          let err = new BadRequest("Transaction not created");
          return next(err);
        }
        let newAppEarning = new appEarnings({
          userId: freelancerId,
          orderId,
          dbRef: "oneTimeOrder",
          appEarning: (orderData.totalPrice * orderData.appPercentage) / 100,
        });

        // Add to admin wallet the amount earned by the app in available balance and net income
        let adminWallet = await getAdminWallet();
        adminWallet.availableBalance +=
          (orderData.totalPrice * orderData.appPercentage) / 100;
        adminWallet.netIncome +=
          (orderData.totalPrice * orderData.appPercentage) / 100;
        // adminWallet.pendingClearence -= orderData.totalPrice;
        await newAppEarning.save();
        // ----------------------------------------------------------------------------------

        // delete the redis key
        await redisClient.del(redisKey);

        return res
          .status(201)
          .setHeader("Content-Type", "application/json")
          .json({ status: "OK", data: response });
      }
      let err = new Error("Something went wrong");
      return next(err);
    } else if (status === "Revision") {
      let response = await OneTimeOrder.findByIdAndUpdate(
        orderId,
        { status: status },
        { new: true }
      );

      // delete the redis key
      await redisClient.del(redisKey);

      return res
        .status(201)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};

const updateOrderCancelRequestStatus = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let { orderId, status } = req.body;

    let order = await OneTimeOrder.findOne({
      _id: orderId,
      status: "RequestedCancellation",
    });

    if (!order) {
      let err = new BadRequest("No such order found");
      return next(err);
    }

    // set redis key
    let redisKey = `order_${orderId}`;

    if (status === "Accept") {
      order.status = "Cancelled";
      order.cancelled.status = true;
      let refundResponse = null;
      let refund = await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        amount:
          order.totalPrice - (order.totalPrice * order.appPercentage) / 100,
      });
      if (refund) {
        refundResponse = await stripe.refunds.retrieve(refund.id);
      }
    } else if (status === "Reject") {
      if (order.delivered === true) {
        order.status = "Pending";
      } else {
        order.status = "Active";
      }
    }
    let response = await order.save();
    if (!response) {
      let err = new Error("Something went wrong");
      return next(err);
    }

    // delete the redis key
    await redisClient.del(redisKey);

    return res
      .status(201)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: { response, refundResponse } });
  } catch (err) {
    return next(err);
  }
};

//update status of equity Order
const updateEquityOrderStatus = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let { orderId, status } = req.body;
    let orderData = await EquityOrder.findById(orderId).select(
      "startupId freelancerId"
    );

    // set redis key
    let redisKey = `order_${orderId}`;

    let startUp = ObjectIdMaker(orderData.startupId);
    let freelancerId = ObjectIdMaker(orderData.freelancerId);
    if (startUp !== _id) {
      let err = new UnAuthorized(
        "You are not authorized to perform this action"
      );
      return next(err);
    }
    if (status === "Completed") {
      let newTransaction = new Transaction({
        userId: freelancerId,
        orderId,
        dbRef: "equityOrder",
        gross: orderData.totalPrice,
        appEarning: 350,
      });

      let response = await EquityOrder.findByIdAndUpdate(
        orderId,
        { status: status },
        { new: true }
      );
      if (response) {
        let responseTransaction = await newTransaction.save();
        if (!responseTransaction) {
          let err = new BadRequest("Transaction not created");
          return next(err);
        }
        // delete the redis key
        await redisClient.del(redisKey);
        return res
          .status(201)
          .setHeader("Content-Type", "application/json")
          .json({ status: "OK", data: response });
      }
      let err = new Error("Something went wrong");
      return next(err);
    }
  } catch (err) {
    return next(err);
  }
};

//cancel an order
const cancelOneTimeOrder = async (req, res, next) => {
  try {
    let { orderId, reason } = req.body;
    let freelancerId = req.user._id;

    // set redis key
    let redisKey = `order_${orderId}`;

    let response = await OneTimeOrder.findOneAndUpdate(
      { _id: orderId, freelancerId: freelancerId },
      { status: "Cancelled", cancelled: { status: true, reason: reason } },
      { new: true, runValidators: true }
    );
    if (response) {
      let refundResponse = null;
      let refund = await stripe.refunds.create({
        payment_intent: response.paymentIntentId,
        amount:
          response.totalPrice -
          (response.totalPrice * response.appPercentage) / 100,
      });
      if (refund) {
        refundResponse = await stripe.refunds.retrieve(refund.id);
      }
      // delete the redis key
      await redisClient.del(redisKey);
      return res
        .status(201)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: { response, refundResponse } });
    } else {
      let err = new NOTFOUND("No such order found");
      return next(err);
    }
  } catch (err) {
    next(err);
  }
};

// client will give a review on an order
const addReview = async (req, res, next) => {
  try {
    let { orderId, review, rating } = req.body;
    let OrderDeatails = await OneTimeOrder.findById(orderId).select(
      "freelancerId clientId"
    );
    let _id = req.user._id;

    orderRedisKey = `order_${orderId}`;
    freelancerRedisKey = `freelancerProfile:${OrderDeatails.freelancerId}`;

    if (!OrderDeatails) {
      let err = new NOTFOUND("No such Order found");
      return next(err);
    }
    if (OrderDeatails.clientId.toString() !== _id.toString()) {
      let err = new UnAuthorized("You are not authorized to add review");
      return next(err);
    }
    let reviewDoc = await RatingAndReview.create({
      reviewBy: _id,
      clientId: OrderDeatails.clientId,
      freelancerId: OrderDeatails.freelancerId,
      ...req.body,
    });
    let response = await reviewDoc.save({ validateBeforeSave: true });
    if (response) {
      let allRatings = await RatingAndReview.find({
        freelancerId: OrderDeatails.freelancerId,
      }).select("rating");
      let totalRatings = allRatings.length;
      let sum = 0;
      allRatings.forEach((rating) => {
        sum += rating.rating;
      });
      let averageRating = sum / totalRatings;
      await Freelancer.findByIdAndUpdate(
        OrderDeatails.freelancerId,
        { rating: averageRating },
        { new: true }
      );
      // delete the redis key
      await redisClient.del(orderRedisKey);
      await redisClient.del(freelancerRedisKey);
      return res.status(200).json({ message: "Review added successfully" });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};

const getUserOrders = async (req, res, next) => {
  let allOrders = {
    completed: [],
    pending: [],
    active: [],
    cancelled: [],
    new: [],
  };
  try {
    // let startups = await Startup.find({ userid: req.user._id }).select("_id");
    // let startupIds = startups.map((startup) => startup._id);
    let _id = ObjectIdMaker(req.user._id);
    let orders = await OneTimeOrder.find({
      clientId: { $eq: _id },
      offerStatus: { $eq: "Accepted" },
    })
      .populate("freelancerId", "jobTitle")
      .sort({ createdAt: -1 });
    new Promise((resolve, reject) => {
      orders.forEach(async (order, index) => {
        let tempOrder = order.toObject();
        let freelancer = await User.findById(tempOrder.freelancerId._id).select(
          "_id name avatar"
        );
        tempOrder.freelancer = {
          ...freelancer.toObject(),
          jobTitle: tempOrder.freelancerId.jobTitle,
        };
        delete tempOrder.freelancerId;
        delete tempOrder.clientId;
        delete tempOrder.__v;
        delete tempOrder.updatedAt;
        if (tempOrder.status === "Completed") {
          allOrders.completed.push(tempOrder);
        } else if (tempOrder.status === "Pending") {
          allOrders.pending.push(tempOrder);
        } else if (tempOrder.status === "Active") {
          allOrders.active.push(tempOrder);
        } else if (tempOrder.status === "Cancelled") {
          allOrders.cancelled.push(tempOrder);
        }
        if (allOrders.new.length < 3) {
          allOrders.new.push(tempOrder);
        }
        if (orders.length - 1 === index) {
          resolve();
        }
      });
    })
      .then(() => {
        return res
          .status(200)
          .setHeader("Content-Type", "application/json")
          .json({ status: "OK", data: allOrders });
      })
      .catch((err) => {
        return next(err);
      });
  } catch (err) {
    return next(err);
  }
};

export default {
  getAllOrders,
  getOrderById,
  getOrderDetails,
  createAOneTimeOrder,
  createEquityOrder,
  getEquityOrdersByStartupId,
  deliverOneTimeOrder,
  updateDeliveryStatus,
  getOrdersByFreelancerId,
  cancelOneTimeOrder,
  oneTimeOfferStatusUpdate,
  EquityOfferStatusUpdate,
  updateEquityOrderStatus,
  addReview,
  getUserOrders,
  updateOrderCancelRequestStatus,
};
