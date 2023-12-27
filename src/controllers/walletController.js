import NOTFOUND from "../errors/notFound.js";
import { appEarnings } from "../models/appEarnings.js";
import { Transaction } from "../models/transaction.js";
import { Wallet } from "../models/wallet.js";
import mongoose from "mongoose";

const ObjectIdMaker = (id) => {
  return mongoose.Types.ObjectId(id);
};

//helper function to get the wallet of the user
const getUsersWallet = async (userId) => {
  
    let wallet = await Wallet.findOne({ userId: userId });
    if (wallet) {
      return wallet;
    }
    else{
      return null;
    }

};

const freelancerWallet = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    const fromDate = new Date(currentYear, currentMonth, 1);
    const toDate = new Date(currentYear, currentMonth + 1, 0);
    let aggrCursor = await Wallet.aggregate([
      {
        $match: {
          userId: _id,
        },
      },
      {
        $lookup: {
          from: "earneds",
          localField: "userId",
          foreignField: "userId",
          as: "earned",
        },
      },
      {
        $lookup: {
          from: "onetimeorders",
          localField: "userId",
          foreignField: "freelancerId",
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
        $match: {
          "orderData.status": {
            $ne: {$exsists:false}
          },
        },
      },
      {
        $group: {
          _id: null,
          activeJobs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $eq: ["$orderData.status", "Active"],
                    },
                    {
                      $eq: ["$orderData.status", "Pending"],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          jobsCompleted: {
            $sum: {
              $cond: [
                {
                  $eq: ["$orderData.status", "Completed"],
                },
                1,
                0,
              ],
            },
          },
          netIncome: {
            $first: "$netIncome",
          },
          pendingClearence: {
            $first: "$pendingClearence",
          },
          earned: {
            $first: "$earned",
          },
          walletId:{
            $first:"$_id"
          }
        },
      },
      {
        $unwind: {
          path: "$earned",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$earned.userId",
          pendingClearence: {
            $first: "$pendingClearence",
          },
          netIncome: {
            $first: "$netIncome",
          },
          earningsThisMonth: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $gte: ["$earned.createdAt", fromDate],
                    },
                    {
                      $lte: ["$earned.createdAt", toDate],
                    },
                  ],
                },
                "$earned.amount",
                0,
              ],
            },
          },
          activeJobs: {
            $first: "$activeJobs",
          },
          jobsCompleted: {
            $first: "$jobsCompleted",
          },
          walletId:{
            $first:"$walletId"
          }
        },
      },
    ]);
    if (aggrCursor.length === 0) {
      let err = new NOTFOUND("Wallet not found");
      return next(err);
    }

    if(aggrCursor[0].pendingClearence === undefined)aggrCursor.pendingClearence = 0;
    if(aggrCursor[0].netIncome === undefined)aggrCursor.netIncome = 0;
    if(aggrCursor[0].earningsThisMonth === undefined)aggrCursor.earningsThisMonth = 0;
    if(aggrCursor[0].activeJobs === undefined)aggrCursor.activeJobs = 0;
    if(aggrCursor[0].jobsCompleted === undefined)aggrCursor.jobsCompleted = 0;

    aggrCursor[0]._id = aggrCursor[0].walletId;
    delete aggrCursor[0].walletId;

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: aggrCursor[0] });
  } catch (err) {
    return next(err);
  }
};

const withdrawlRequest = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let wallet = await getUsersWallet(_id);

    if(!wallet){
      let err = new NOTFOUND("Wallet not found");
      return next(err);
    }
   
    if ( wallet.availableBalance  <= 0) {
      let err = new NOTFOUND("Amount must be greater than 0");
      return next(err);
    }
    // Checkcing if there are any paymentMethods
    if (wallet.paymentMethods.length < 0) {
      let err = new NOTFOUND("Please add a payment method first");
      return next(err);
    }
    else{
      for(let i=0;i<wallet.paymentMethods.length;i++){
        if(wallet.paymentMethods[i].method==="stripe"){
          if(wallet.paymentMethods[i].accountId===null){
            let err = new NOTFOUND("Please add a payment method first");
            return next(err);
          }
        }
      }
    }
    let newTransaction = new Transaction({
      userId: _id,
      amount: wallet.availableBalance,
    });
    let transactionResponse = await newTransaction.save({
      runValidators: true,
      new: true,
    });
    if (!transactionResponse) {
      let err = new NOTFOUND("Withdraw request couldn't be made");
      return next(err);
    }
    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: {status:"OK",msg:"Withdraw request successfully made"} });
  } catch (err) {
    return next(err);
  }
};


const startupWallet = async (req, res, next) => {
  try{  

    let _id = ObjectIdMaker(req.user._id);
    let wallet = await getUsersWallet(_id);
    if(!wallet){
      let err = new NOTFOUND("Wallet not found");
      return next(err);
    }
    return res.status(200).setHeader("Content-Type","application/json").json({status:"OK",data:{spendings:wallet.spending}});

  }catch(err){
    return next(err);
  }
}


export default {
  freelancerWallet,
  withdrawlRequest,
  startupWallet
};
