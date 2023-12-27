import NOTFOUND from "../errors/notFound.js";
import { Transaction } from "../models/transaction.js";
import { Wallet } from "../models/wallet.js";

// TODO: FIX THIS ONE
// const getAllPaymentRequests = async (req, res, next) => {
//   try {
//     let aggCursor = await Transaction.aggregate([
//         {
//             $lookup: {
//                 from: "users",
//                 localField: "userId",
//                 foreignField: "_id",
//                 as: "userData",
//             }
//         }
//         ,{
//             $unwind: {
//                 path: "$userData",
//                 preserveNullAndEmptyArrays: false,
//             }
//         },
//     {
//             $set: {
//                 userId: "$userData._id",
//                 userAvatar: "$userData.avatar",
//                 userName: "$userData.name",
//                 userEmail: "$userData.email",
//             }
//         },{
//           $project: {
//             userId: 1,
//             userAvatar: 1,
//             userName: 1,
//             userEmail: 1,
//             amount:1,
//             _id:1,
//             status:1,
//           }
//         },{
//             $limit: 10
//         },

//     // ])
//     // if(!aggCursor){
//     //     return next(new Error("Something went wrong"));
//     // }
//     // return res.status(200).setHeader("Content-Type", "application/json").json({
//     //     status: "OK",
//     //     data: aggCursor
//     // })

//     let { since, limit = 10 } = req.body;
//     let after = {};
//     if (since) {
//       after = {
//         createdAt: { $gte: since },
//       };
//     }
//     const result = await Transaction.find(after)
//       .limit(limit)
//       .populate("userId", "name email avatar")
//       .populate("orderId", "orderType")
//       .populate({
//         path: "orderId",
//         populate: { path: "startupId", select: "businessName" },
//       })
//       .exec();
//     return res
//       .status(200)
//       .setHeader("Content-Type", "application/json")
//       .json({
//         status: "OK",
//         data: result.length === 0 ? [] : result,
//         // : {
//         //     userId: result.userId._id,
//         //     userAvatar: result.userId.avatar,
//         //     userName: result.userId.name,
//         //     userEmail: result.userId.email,
//         //     orderId: result.orderId._id,
//         //     orderType: result.orderId.orderType,
//         //     startupId: result.orderId.startupId._id,
//         //     startupName: result.orderId.startupId.businessName,
//         //     gross: result.gross,
//         //     appEarning: result.appEarning,
//         //     status: result.status,
//         //   },
//       });
//   } catch (err) {
//     return next(err);
//   }
// };

const getOrderDetails = async (req, res, next) => {
  try {
    let { orderId } = req.body;
    const result = await Transaction.findOne({ orderId })
      .populate("orderId")
      .populate("userId", "name email avatar")
      .exec();
    if (!result) {
      let err = new NOTFOUND("Order not found");
      return next(err);
    }
    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({
        status: "OK",
        data: {
          description: result.orderId.description,
          status: result.orderId.status,
          amount: result.gross,
          userName: result.userId.name,
          userEmail: result.userId.email,
          userAvatar: result.userId.avatar,
        },
      });
  } catch (err) {
    return next(err);
  }
};



const withdrawPayment = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let wallet = await Wallet.findOne({ userId: _id });
    if (!wallet) {
      let err = new NOTFOUND("Wallet not found");
      return next(err);
    }
    // let response =
    // TODO: Will be a stripe payment gateway when the request is successfull will edit the wallet info
  } catch (err) {
    return next(err);
  }
};

export default {
  // getAllPaymentRequests,
  getOrderDetails,
};
