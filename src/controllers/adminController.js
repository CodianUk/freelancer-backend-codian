// @import Packages
import mongoose from "mongoose";

// @import Error Classes
import BADREQUEST from "../errors/badRequest.js";
import NOTFOUND from "../errors/notFound.js";
import stripePass from "stripe";
const stripe = stripePass(process.env.STRIPE_SECRET_KEY);

// @import Models
import { User } from "../models/user.js";
import { Startup } from "../models/startup.js";
import { StartupStatus } from "../models/startupStatus.js";
import { ProjectRoles } from "../models/projectRoles.js";
import { Warning } from "../models/warnings.js";
import { Wallet } from "../models/wallet.js";
import { appEarnings } from "../models/appEarnings.js";
import { Transaction } from "../models/transaction.js";
import { Freelancer } from "../models/freelancer.js";
import BadRequest from "../errors/badRequest.js";
import { OneTimeOrder } from "../models/oneTimeOrder.js";
import { EquityOrder } from "../models/equityOrder.js";
import RefreshToken from "../models/refreshToken.js";
import { Skill } from "../models/skill.js";
import { RemoveMember } from "../models/removeMember.js";
import { Todos } from "../models/todos.js";
import { Category } from "../models/category.js";
import {Subcategory } from '../models/subcategory.js';
import { earned } from "../models/earned.js";
//------------------------------------------------------------

// @desc    Get Admin Dashboard Counts
const getAdminDashboard = async (req, res, next) => {
  try {
    const startups = await StartupStatus.aggregate([
      {
        $group: {
          _id: null,
          total: { $count: {} },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$status", "Approved"] }, 1, 0],
            },
          },
          unapproved: {
            $sum: { $cond: [{ $eq: ["$status", "Unapproved"] }, 1, 0] },
          },
          suspended: {
            $sum: { $cond: [{ $eq: ["$status", "Suspended"] }, 1, 0] },
          },
        },
      },
      {
        $unset: "_id",
      },
    ]);

    const freelancers = await User.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [{ $eq: ["$role", "Freelancer"] }, 1, 0],
            },
          },
          active: {
            $sum: {
              $cond: [
                { $eq: ["$role", "Freelancer"] },
                { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
                0,
              ],
            },
          },
          suspended: {
            $sum: {
              $cond: [
                { $eq: ["$role", "Freelancer"] },
                { $cond: [{ $eq: ["$status", "Suspended"] }, 1, 0] },
                0,
              ],
            },
          },
        },
      },
      {
        $unset: "_id",
      },
    ]);

    const warnings = await Warning.find({}).select("warnings");
    let tempWarnings = {
      total: 0,
      requested: 0,
      approved: 0,
    };
    for (let i = 0; i < warnings.length; i++) {
      warnings[i].warnings.forEach((warning) => {
        tempWarnings.total++;
        if (warning.status === "Request") {
          tempWarnings.requested++;
        } else if (warning.status === "Approved") {
          tempWarnings.approved++;
        }
      });
    }
    res.status(200).json({
      startups,
      freelancers,
      warnings: tempWarnings,
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit } = req.body;
    let pagination = {
      page: page || 1,
      limit: limit || 10,
    };

    let tempUsers = [];
    const Users = await User.find({ role: { $ne: "Admin" }, isDeleted: false })
      .select("name avatar email phoneNumber role status _id") // Include the _id field for population
      .populate({
        path: "_id",
        select: "jobTitle", // Select the jobTitle field from the Freelancer model
        model: Freelancer, // Specify the Freelancer model for population
      })
      .limit(pagination.limit)
      .skip((pagination.page - 1) * pagination.limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments({ role: { $ne: "Admin" }, isDeleted: false });

    const allWarnings = await Warning.find({}).select("warnings");
    Users.forEach((user) => {
      let tempuser = user.toObject();
      tempuser.warnings = 0;
      allWarnings.forEach((warningsObj) => {
        warningsObj.warnings.forEach((warning) => {
          if (
            warning?.warnedTo.toString() === tempuser._id?.toString() &&
            warning.status === "Approved"
          ) {
            tempuser.warnings++;
          }
        });
      });
      tempUsers.push(tempuser);
    });

    return res.status(200).json({
      data: {
        metaData: [
          {
            total: count,
            page: pagination.page,
          },
        ],
        users: tempUsers,
      },
    });
  } catch (error) {
    return next(error);
  }
};


// const getAllUsers = async (req, res, next) => {
//   try {
//     const { page, limit } = req.body;
//     let pagination = {
//       page: page || 1,
//       limit: limit || 10,
//     };

//     let tempUsers = [];
//     const Users = await User.find({ role: { $ne: "Admin" }, isDeleted: false })
//       .select("name avatar email phoneNumber role status ")
//       .limit(pagination.limit)
//       .skip((pagination.page - 1) * pagination.limit)
//       .sort({ createdAt: -1 });

//     const count = await User.countDocuments({ role: { $ne: "Admin" }, isDeleted: false });

//     const allWarnings = await Warning.find({}).select("warnings");
//     Users.forEach((user) => {
//       let tempuser = user.toObject();
//       tempuser.warnings = 0;
//       allWarnings.forEach((warningsObj) => {
//         warningsObj.warnings.forEach((warning) => {
//           if (
//             warning.warnedTo.toString() === tempuser._id.toString() &&
//             warning.status === "Approved"
//           ) {
//             tempuser.warnings++;
//           }
//         });
//       });
//       tempUsers.push(tempuser);
//     });

//     return res.status(200).json({
//       data: {
//         metaData: [
//           {
//             total: count,
//             page: pagination.page,
//           },
//         ],
//         users: tempUsers,
//       },
//     });
//   } catch (error) {
//     return next(error);
//   }
// };

const getAllStartups = async (req, res, next) => {
  try {
    const { page, limit } = req.body;

    let pagination = {
      page: page || 1,
      limit: limit || 10,
    };

    const allStartups = await Startup.aggregate([
      {
        $match: {
          "onboarding.status": true,
        },
      },
      {
        $facet: {
          metaData: [
            {
              $count: "total",
            },
            {
              $addFields: {
                page: pagination.page,
              },
            },
          ],
          startups: [
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $skip: (pagination.page - 1) * pagination.limit,
            },
            {
              $limit: pagination.limit,
            },
            {
              $lookup: {
                from: "startupstatuses",
                localField: "_id",
                foreignField: "startupid",
                as: "status",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userid",
                foreignField: "_id",
                as: "startupAdmin",
              },
            },
            {
              $project: {
                _id: 1,
                createdAt: 1,
                logo: 1,
                businessName: 1,
                admin: "$startupAdmin.name",
                email: "$startupAdmin.email",
                status: "$status.status",
              },
            },
            {
              $unwind: "$status",
            },
            {
              $unwind: "$admin",
            },
            {
              $unwind: "$email",
            },
          ],
        },
      },
    ]);

    return res.status(200).json({
      data: allStartups,
    });
  } catch (error) {
    return next(error);
  }
};

const changeStartupStatus = async (req, res, next) => {
  try {
    const { startupid, status } = req.body;
    if (!startupid || !status) {
      return next(new BADREQUEST("Invalid Request"));
    }
    const startupstatus = await StartupStatus.findOneAndUpdate(
      { startupid },
      {
        status,
      },
      {
        new: true,
        validateBeforeSave: true,
        runValidators: true,
      }
    );
    if (!startupstatus) {
      return  next(new NOTFOUND("Startup Not Found"));
    }
    return res.status(200).json({
      status: "OK",
      message: "Startup Status Updated",
    });
  } catch (error) {
    return next(error);
  }
};

const getStartupStatus = async (req, res, next) => {
  try {
    const { startupid } = req.body;
    if (!startupid) {
      return next(new BADREQUEST("Invalid Request"));
    }
    const startupstatus = await StartupStatus.findOne(
      { startupid }
    );
    if (!startupstatus) {
      return  next(new NOTFOUND("Startup Not Found"));
    }
    return res.status(200).json({
      status: "OK",
      message: "Startup Status Found",
      data: startupstatus.status
    });
  } catch (error) {
    return next(error);
  }
};

const deleteStartup = async (req, res, next) => {
  let startup;
  let equityOrders = [];
  try {
    const { startupid } = req.body;
    if (!startupid) {
      return next(BADREQUEST("Invalid Request"));
    }
    startup = await Startup.findById(startupid);
    if (!startup) {
      return next(NOTFOUND("Startup Not Found"));
    }
    equityOrders = await EquityOrder.find({
      startupId: startupid,
      status: "Pending",
    });
    if (equityOrders.length > 0) {
      return next(BADREQUEST("Startup has pending equity orders"));
    }
    await StartupStatus.findOneAndUpdate(
      { startupid },
      {
        status: "Deleted",
      },
      {
        new: true,
        validateBeforeSave: true,
        runValidators: true,
      }
    );
    return res.status(200).json({
      status: "OK",
      message: "Startup Deleted",
    });
  } catch (error) {
    return next(error);
  }
};

// @desc   Get all removal requests
const getAllRemovalRequests = async (req, res, next) => {
  let removalRequests = [];
  try {
    let { page, limit } = req.body;
    if (!page || !limit) {
      page = 1;
      limit = 10;
    }
    removalRequests = await RemoveMember.find({})
      .populate("startupid", "_id businessName logo")
      .populate("memberid", "_id avatar name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    let count = await RemoveMember.countDocuments({});
    return res.status(200).json({
      data: {
        metaData: [
          {
            total: count,
            page: page,
          },
        ],
        removalRequests,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Remove a member from Startup
const removeMember = async (req, res, next) => {
  let removalDoc;
  let startUp;
  try {
    let { requestId } = req.body;
    removalDoc = RemoveMember.findById(requestId);
    if (!removalDoc) {
      return next(new NOTFOUND("Request not Found"));
    }
    let { startupid, memberid } = removalDoc;
    startUp = await Startup.findOneAndUpdate(
      { _id: startupid },
      {
        $pull: {
          members: { _id: memberid },
        },
      },
      { new: true, runValidators: true }
    );
    if (!startUp) return next(new NOTFOUND("Startup not found"));

    // Remove all todos of the member
    const todos = await Todos.findOneAndUpdate(
      { startupid: startupid },
      {
        $pull: {
          todos: { members: { $elemMatch: { _id: memberid } } },
        },
      },
      { new: true, runValidators: true }
    );
    if (!todos) return next(new NOTFOUND("No todos found"));
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({
    status: "OK",
    message: "Member removed from startup",
  });
};

const RejectRemovalRequest = async (req, res, next) => {
  let removalDoc;
  try {
    let { removalId } = req.body;
    removalDoc = RemoveMember.findById(removalId);
    if (!removalDoc) {
      return next(new NOTFOUND("Request Not Found"));
    }
    RemoveMember.findByIdAndDelete({
      _id: removalId,
    });
    return res.json({
      status: "OK",
      message: "Member removal request rejected sucessfully",
    });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return next(new BadRequest("Invalid Request"));
    }
    let user = await User.findById(userId);
    let response = null;

    // Validation --------------------------------------------
    if (!user) {
      return next(new NOTFOUND("User Not Found"));
    }
    if (user.isDeleted) {
      return next(new BADREQUEST("User Already Deleted"));
    }
    // -------------------------------------------------------

    if (user.role === "Startup") {
      // One time orders Check ------------------------------------
      let oneTimeOrders = await OneTimeOrder.find({
        freelancerId: userId,
        $or: [
          { status: "Active" },
          { status: "Pending" },
          { status: "RequestedCancellation" },
        ],
      });

      if (oneTimeOrders.length > 0) {
        return next(new BADREQUEST("User has ongoing Jobs"));
      }
      //-------------------------------------------------------------
      // equity orders Check ----------------------------------------
      let equityJobs = await EquityOrder.find({
        clientId: userId,
        status: "Pending",
      });

      if (equityJobs.length > 0) {
        return next(new BADREQUEST("User has ongoing Jobs"));
      }
      //-------------------------------------------------------------
    }

    if (user.role === "Freelancer") {
      // One time orders Check ------------------------------------
      let oneTimeOrders = await OneTimeOrder.find({
        freelancerId: userId,
        $or: [
          { status: "Active" },
          { status: "Pending" },
          { status: "RequestedCancellation" },
        ],
      });

      if (oneTimeOrders.length > 0) {
        return next(new BADREQUEST("User has ongoing Jobs"));
      }
      //-------------------------------------------------------------
      // equity orders Check ----------------------------------------
      let equityJobs = await EquityOrder.find({
        freelancerId: userId,
        status: "Pending",
      });

      if (equityJobs.length > 0) {
        return next(new BADREQUEST("User has ongoing Jobs"));
      }
      //-------------------------------------------------------------
    }

    user.isDeleted = true;

    await RefreshToken.findOneAndDelete({ userId: user._id });

    response = await user.save();

    if (!response) {
      return next(new Error("Something went wrong"));
    }
    return res.status(200).json({
      status: "OK",
      message: "User Deleted",
    });
  } catch (error) {
    return next(error);
  }
};

const adminWallet = async (req, res, next) => {
  try {
    let thisMonthAppEarnings = await appEarnings.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(1)),
            $lte: new Date(),
          },
        },
      },
    ]);
    //get earnings of this month
    let thisMonthEarning = await appEarnings.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(1)),
            $lte: new Date(),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$appEarning",
          },
        },
      },
    ]);

    let prevMonth = new Date().getMonth(new Date().getMonth() - 1);

    //get earnings of previous month
    let prevMonthEarning = await appEarnings.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(prevMonth), 1),
            $lte: new Date(new Date().setDate(0)),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$appEarning",
          },
        },
      },
    ]);

    //calculate increase percentage
    let increasePercentage = 0;
    if (prevMonthEarning.length > 0) {
      increasePercentage =
        (((thisMonthEarning.length>0 ? thisMonthEarning[0].total : 0) - (prevMonthEarning.length>0?prevMonthEarning[0].total:0)) /
          (prevMonthEarning.length>0?prevMonthEarning[0].total:0)) *
        100;
    }

    let adminId = await User.findOne({ role: "Admin" }).select("_id");

    let aggrCursor = await Wallet.aggregate([
      {
        $match: {
          userId: adminId._id,
        },
      },
      {
        $project: {
          _id: 1,
          withdrawn: 1,
          netIncome: 1,
          availableBalance: 1,
          // pendingClearence: 1,
        },
      },
    ]);
    if (aggrCursor.length === 0) {
      let err = new NOTFOUND("Wallet not found");
      return next(err);
    }

    let pendingClearencePipeline = await earned.aggregate([
      {
        $match: {
          status: "pending",
        }
      },{
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    console.log("pendingClearencePipeline", pendingClearencePipeline);

    let pendingClearence = pendingClearencePipeline.length>0 ? pendingClearencePipeline[0].total : 0;


    const balance = await stripe.balance.retrieve();
    console.log(balance.available[0].amount)
    const availableBalnce = balance.available[0].amount;

    aggrCursor[0].availableBalance = availableBalnce;
    aggrCursor[0].availableForWithdrawl = availableBalnce - pendingClearence;
    aggrCursor[0].pendingClearence = pendingClearence;

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({
        status: "OK",
        data: {
          wallet: aggrCursor[0],
          // thisMonthEarning: thisMonthEarning,
          thisMonthAppEarning: thisMonthAppEarnings,
          increasePercentage: increasePercentage,
        },
      });
  } catch (err) {
    return next(err);
  }
};

//get withdrawl history of admin
const getWithdrawlHistory = async (req, res, next) => {
  try {
    let admin = await User.findOne({ role: "Admin" }).select("_id");
    const { page, limit } = req.body;
    const options = {
      page: page || 1,
      limit: limit || 10,
      sort: { createdAt: -1 },
    };
    const withdrawlHistory = await Transaction.find({ userId: admin._id })
      .select("amount status createdAt")
      .limit(options.limit)
      .skip(options.limit * (options.page - 1))
      .sort(options.sort);
    return res.status(200).json({
      status: "OK",
      withdrawlHistory,
    });
  } catch (error) {
    return next(error);
  }
};

// returns all transactions of users
const getWithdrawlRequests = async (req, res, next) => {
  try {
    let admin = await User.findOne({ role: "Admin" }).select("_id");
    const { page, limit } = req.body;

    let aggrCursor = await Transaction.aggregate([
      {
        $match: {
          userId: { $ne: admin._id },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          metaData: [
            { $count: "total" },
            { $addFields: { page: page !== null ? page : 1 } },
          ],
          data: [
            {
              $skip:
                ((page !== null ? page : 1) - 1) *
                (limit !== null ? limit : 10),
            },
            { $limit: limit !== null ? limit : 10 },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                amount: 1,
                status: 1,
                createdAt: 1,
                userId: 1,
                userName: "$user.name",
                userEmail: "$user.email",
                avatar: "$user.avatar",
              },
            },
          ],
        },
      },
    ]);

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: aggrCursor });
  } catch (err) {
    return next(err);
  }
};

// change the status of the transaction and if it is release then adds the amount to the wallet of the user
const changTransactionStatus = async (req, res, next) => {
  try {
    let { transactionId } = req.body;
    let response = null;
    response = await Transaction.findByIdAndUpdate(
      transactionId,
      { status: "Pause" },
      { new: true }
    );

    if (!response) {
      let err = new NOTFOUND("Transaction not found");
      return next(err);
    }
    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: response });
  } catch (err) {
    return next(err);
  }
};

// TODO: Correct the naming when returned
// get all app earnings record
const getAllAppEarnings = async (req, res, next) => {
  try {
    let { page, limit } = req.body;

    let earnings = await appEarnings
      .find({})
      .populate("userId", "name email avatar")
      .populate("orderId", "_id totalAmount")
      .sort({ createdAt: -1 })
      .skip(((page !== null ? page : 1) - 1) * (limit ? limit : 10))
      .limit(limit ? limit : 10);

    // earnings.toObject();
    // earnings.user = earnings.userId;
    // earnings.order = earnings.orderId;
    // delete earnings.userId;
    // delete earnings.orderId;

    // let aggrCursor = await appEarnings.aggregate([
    //   {
    //     $sort: {
    //       createdAt: -1,
    //     }
    //   },{
    //     $facet: {
    //       metaData: [{ $count: "total" }, { $addFields: { page: page } }],
    //       data: [{ $skip: page * limit }, { $limit: limit},
    //       {
    //         $lookup:{
    //           from: "users",
    //           localField: "userId",
    //           foreignField: "_id",
    //           as: "user"
    //         }
    //       },
    //       {
    //         $unwind:{
    //           path: "$user",
    //           preserveNullAndEmptyArrays: true
    //         }
    //       }
    //       ,{
    //         $lookup:{
    //           from: "startups",
    //         }
    //       }
    //       ]
    //     }
    //   }
    // ])

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: earnings });
  } catch (err) {
    return next(err);
  }
};

// freelancer profile data for profile page  for admin
const freelancerProfileData = async (req, res, next) => {
  try {
    const { freelancerId } = req.body;

    let freelancerData = await User.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(freelancerId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 1,
          avatar: "$user.avatar",
          name: "$user.name",
          email: "$user.email",
          phone: "$user.phoneNumber",
          city: 1,
          gender: 1,
          dob: 1,
          jobTitle: 1,
          accountActive: 1,
          suspended: "$user.suspended",
          joinedOn: "$createdAt",
          status:"$user.status"
        },
      },
    ]);

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: freelancerData });
  } catch (err) {
    return next(err);
  }
};

// freelancer profile earnings for profile page for admin
const getFreelancerProfileEarnings = async (req, res, next) => {
  try {
    const { freelancerId, page, limit } = req.body;

    let pagination = {
      page: page ? page : 1,
      limit: limit ? limit : 10,
    };

    let freelancersEarnings = await Wallet.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(freelancerId),
        },
      },
      {
        $lookup: {
          from: "earneds",
          localField: "userId",
          foreignField: "userId",
          as: "paymentDetails",
        },
      },
      {
        $unwind: {
          path: "$paymentDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $facet: {
          metaData: [
            { $count: "total" },
            { $addFields: { page: pagination.page } },
          ],
          earnings: [
            {
              $sort: {
                "paymentDetails.createdAt": -1,
              },
            },
            {
              $skip: (pagination.page - 1) * pagination.limit,
            },
            {
              $limit: pagination.limit,
            },
            {
              $lookup: {
                from: "onetimeorders",
                localField: "paymentDetails.orderId",
                foreignField: "_id",
                as: "orderData",
              },
            },
            {
              $unwind: {
                path: "$orderData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "startups",
                localField: "orderData.startupId",
                foreignField: "_id",
                as: "startup",
              },
            },
            {
              $unwind: {
                path: "$startup",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "startup.userid",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $set: {
                paymentDetail: {
                  paymentId: "$paymentDetails._id",
                  avatar: "$user.avatar",
                  name: "$user.name",
                  email: "$user.email",
                  amount: "$paymentDetails.amount",
                  status: "$paymentDetails.status",
                },
              },
            },
            {
              $group: {
                _id: "$_id",
                allPayments: {
                  $push: "$paymentDetail",
                },
                netIncome: {
                  $first: "$netIncome",
                },
                availableBalance: {
                  $first: "$availableBalance",
                },
                pendingClearence: {
                  $first: "$pendingClearence",
                },
              },
            },
            {
              $project: {
                totalAmount: "$netIncome",
                availableForWithdrawl: "$availableBalance",
                pending: "$pendingClearence",
                allPayments: {
                  $cond: {
                    if: { $eq: ["$allPayments", [{}]] },
                    then: [],
                    else: "$allPayments",
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: freelancersEarnings });
  } catch (err) {
    return next(err);
  }
};

// freelancer profile warnings for profile page for admin
const getFreelancerProfileWarnings = async (req, res, next) => {
  try {
    const { freelancerId, page, limit } = req.body;

    let pagination = {
      page: page ? page : 1,
      limit: limit ? limit : 10,
    };

    let freelancerWarnings = await Warning.aggregate([
      {
        $unwind: {
          path: "$warnings",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "warnings.warnedTo": mongoose.Types.ObjectId(freelancerId),
        },
      },
      {
        $lookup: {
          from: "startups",
          localField: "startupid",
          foreignField: "_id",
          as: "startup",
        },
      },
      {
        $unwind: {
          path: "$startup",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$startup._id",
          warningCount: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$warnings.warnedTo",
                    mongoose.Types.ObjectId(freelancerId),
                  ],
                },
                1,
                0,
              ],
            },
          },
          startup: {
            $first: "$startup",
          },
          lastWarning: {
            $last: "$warnings",
          },
        },
      },
      {
        $facet: {
          metaData: [
            { $count: "total" },
            { $addFields: { page: pagination.page } },
          ],
          warnings: [
            {
              $sort: {
                "warnings.updatedAt": -1,
              },
            },
            {
              $skip: (pagination.page - 1) * pagination.limit,
            },
            {
              $limit: pagination.limit,
            },
            {
              $lookup: {
                from: "users",
                localField: "startup.userid",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                startupId: "$_id",
                startupName: "$startup.businessName",
                sartupLogo: "$startup.logo",
                email: "$user.email",
                warningCount: 1,
                lastWarnedOn: "$lastWarning.updatedAt",
                warnedBy: "$user.name",
                reason:"$lastWarning.reason"
              },
            },
          ],
        },
      },
    ]);
    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: freelancerWarnings });
  } catch (err) {
    return next(err);
  }
};

// freelancer profile campaigns for profile page for admin
const getFreelancerProfileCampaigns = async (req, res, next) => {
  try {
    const { freelancerId } = req.body;

    let joinedCampaigns = await Startup.aggregate([
      {
        $unwind: {
          path: "$members",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "members.member": mongoose.Types.ObjectId(freelancerId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userid",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          startupId: "$_id",
          startupName: "$buinessName",
          startupAvatar: "$logo",
          startupCreatetionDate: "$createdAt",
          startupOwnerName: "$user.name",
          startupOwnerEmail: "$user.email",
          freelancerRole: "$members.role",
        },
      },
    ]);

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: joinedCampaigns });
  } catch (err) {
    return next(err);
  }
};

const suspendUser = async (req, res, next) => {
  try {
    const { userId, status } = req.body;
    if (!userId || !status) {
      return next(new BadRequest("Invalid Request"));
    }
    let user = await User.findById(userId);
    let response = null;

    // Validation --------------------------------------------
    if (!user) {
      return next(new NOTFOUND("User Not Found"));
    }
    if (user.status === "Suspended" && status === "Suspend") {
      return next(new BADREQUEST("User Already Suspended"));
    }
    if (user.status === "Active" && status === "Unsuspend") {
      return next(new BADREQUEST("User Already Active"));
    }
    // -------------------------------------------------------

    if (user.role === "Startup") {
      // One time orders Check ------------------------------------
      let oneTimeOrders = await OneTimeOrder.find({
        freelancerId: userId,
        $or: [
          { status: "Active" },
          { status: "Pending" },
          { status: "RequestedCancellation" },
        ],
      });

      if (oneTimeOrders.length > 0) {
        return next(new BADREQUEST("User has ongoing Jobs"));
      }
      //-------------------------------------------------------------
      // equity orders Check ----------------------------------------
      let equityJobs = await EquityOrder.find({
        clientId: userId,
        status: "Pending",
      });

      if (equityJobs.length > 0) {
        return next(new BADREQUEST("User has ongoing Jobs"));
      }
      //-------------------------------------------------------------
    }

    if (user.role === "Freelancer") {
      // One time orders Check ------------------------------------
      let oneTimeOrders = await OneTimeOrder.find({
        freelancerId: userId,
        $or: [
          { status: "Active" },
          { status: "Pending" },
          { status: "RequestedCancellation" },
        ],
      });

      if (oneTimeOrders.length > 0) {
        return next(new BADREQUEST("User has ongoing Jobs"));
      }
      //-------------------------------------------------------------
      // equity orders Check ----------------------------------------
      let equityJobs = await EquityOrder.find({
        freelancerId: userId,
        status: "Pending",
      });

      if (equityJobs.length > 0) {
        return next(new BADREQUEST("User has ongoing Jobs"));
      }
      //-------------------------------------------------------------
    }

    user.status = status === "Suspend" ? "Suspended" : "Active";

    await RefreshToken.findOneAndDelete({ userId: user._id });

    response = await user.save();

    if (!response) {
      return next(new Error("Something went wrong"));
    }
    return res.status(200).json({
      status: "OK",
      message: "Status updated Successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const addCategory = async (req, res, next) => {
  try {
    let { title, avatar } = req.body;
    if (!title) {
      return next(new BadRequest("Provide Category Title"));
    }
    if (!avatar) {
      return next(new BadRequest("Provide Category Avatar"));
    }
    let newCategory = new Category({
      title,
      avatar,
    });

    await newCategory.save({ validateBeforeSave: true, new: true });

    return res.status(200).json({
      status: "OK",
      message: "Category Added Successfully",
    });
  } catch (err) {
    return next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  let categoryDoc;
  try {
    let { categoryId } = req.body;
    if (!categoryId) {
      return next(new BadRequest("Provide Category Id"));
    }
    categoryDoc = await Category.findByIdAndDelete(categoryId);
    if (!categoryDoc) {
      return next(new Error("Something went wrong"));
    }
    return res.status(200).json({
      status: "OK",
      message: "Category Deleted Successfully",
    });
  } catch (err) {
    return next(err);
  }
};

const updateCategory = async (req, res, next) => {
  let categoryDoc;
  try {
    let { categoryId } = req.body;
    if (!categoryId) {
      return next(new BadRequest("Provide Category Id"));
    }
    categoryDoc = await Category.findById(categoryId);
    if (!categoryDoc) {
      return next(new NOTFOUND("Category Not Found"));
    }
    categoryDoc.title = req.body.title || categoryDoc.title;
    categoryDoc.avatar = req.body.avatar || categoryDoc.avatar;
    categoryDoc = await categoryDoc.save({ validateBeforeSave: true });
    if (!categoryDoc) {
      return next(new Error("Something went wrong"));
    }
    return res.status(200).json({
      status: "OK",
      message: "Category Updated Successfully",
    });
  } catch (err) {
    return next(err);
  }
};

const getAllCategory = async (req, res, next) => {
  let categoryDoc = [];
  try {
    categoryDoc = await Category.find({});
    return res.status(200).json({
      status: "OK",
      data: categoryDoc,
    });
  } catch (err) {
    return next(err);
  }
};


// -------------- add subcategory --------

const addSubcategory = async (req, res, next) => {
  const { categoryId } = req.body;
  const { title } = req.body;

  try {
    // Check if the category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: "Category not found" });
    }

    // Create a new subcategory and set the category reference
    const newSubcategory = new Subcategory({ title, category: categoryId });
    await newSubcategory.save();

    return res.status(201).json({ status: "OK", subcategory: newSubcategory });
  } catch (error) {
    return next(error);
  }
};

const getAllSubcategoriesByCategory = async (req, res, next) => {
  const { categoryId } = req.params;

  try {
    // Find the category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: "Category not found" });
    }

    // Find all subcategories for the given category
    const subcategories = await Subcategory.find({ category: categoryId });

    return res.status(200).json({ status: "OK", subcategories });
  } catch (error) {
    return next(error);
  }
};



//--------------------  Skills ---------------------------------
const addSkill = async (req, res, next) => {
  try {
    let { skill } = req.body;
    if (!skill) {
      return next(new BadRequest("Invalid Request"));
    }

    let newSkill = new Skill({
      title: skill,
    });
    let response = await newSkill.save({ validateBeforeSave: true, new: true });

    if (!response) {
      return next(new Error("Something went wrong"));
    }

    return res.status(200).setHeader("Content-Type", "application/json").json({
      status: "OK",
      data: response,
    });
  } catch (err) {
    return next(err);
  }
};

const deleteSkill = async (req, res, next) => {
  try {
    let { skillId } = req.body;
    if (!skillId) {
      return next(new BadRequest("Invalid Request skillId is missing"));
    }
    let response = await Skill.findByIdAndDelete(skillId);
    if (!response) {
      return next(new Error("Something went wrong"));
    }
    return res
      .setHeader("Content-Type", "application/json")
      .status(200)
      .json({
        status: "OK",
        data: { msg: "Successfully Deleted Skill" },
      });
  } catch (err) {
    return next(err);
  }
};

const updateSkill = async (req, res, next) => {
  try {
    const { skillId, skill } = req.body;
    if (!skillId || !skill) {
      return next(new BadRequest("Invalid Request skillId or skill is missing"));
    }
    let response = await Skill.findByIdAndUpdate(
      skillId,
      { title: skill },
      { new: true, validateBeforeSave: true }
    );
    if (!response) {
      return next(new Error("Something went wrong"));
    }
    return res.setHeader("Content-Type", "application/json").status(200).json({
      status: "OK",
      data: response,
    });
  } catch (err) {
    return next(err);
  }
};

//let all skills with count of freelancers having that skill
const getAllSkills = async (req, res, next) => {
  try {
    let skills = await Skill.aggregate([
      {
        $lookup: {
          from: "freelancers",
          localField: "title",
          foreignField: "skills",
          as: "freelancers",
        },
      },
      {
        $project: {
          _id: 0,
          skillId: "$_id",
          title: 1,
          count: { $size: "$freelancers" },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
    return res.setHeader("Content-Type", "application/json").status(200).json({
      status: "OK",
      data: skills,
    });
  } catch (err) {
    return next(err);
  }
};

export default {
  getAdminDashboard,
  getAllUsers,
  getAllStartups,
  changeStartupStatus,
  deleteStartup,
  getStartupStatus,
  getAllRemovalRequests,
  removeMember,
  RejectRemovalRequest,
  adminWallet,
  getWithdrawlHistory,
  getWithdrawlRequests,
  getAllAppEarnings,
  suspendUser,
  freelancerProfileData,
  getFreelancerProfileWarnings,
  getFreelancerProfileCampaigns,
  getFreelancerProfileEarnings,
  changTransactionStatus,
  deleteUser,
  getAllSkills,
  addSkill,
  addSubcategory,
  getAllSubcategoriesByCategory,
  updateSkill,
  deleteSkill,
  addCategory,
  getAllCategory,
  updateCategory,
  deleteCategory,
};
