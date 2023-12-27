import stripePass from "stripe";
import { Wallet } from "../models/wallet.js";
import { OneTimeOrder } from "../models/oneTimeOrder.js";
const stripe = stripePass(process.env.STRIPE_SECRET_KEY);
import NOTFOUND from "../errors/notFound.js";
import { Transaction } from "../models/transaction.js";
import { User } from "../models/user.js";


//for stripe
const findOrCreateCustomerId = async(userId)=>{
  try{

    let customerId= null;
    let wallet =null;
    
    wallet = await Wallet.findOne({userId:userId});
    let user = await User.findById({_id:userId});
    if(!wallet){
      return new NOTFOUND("User Not Found");
    }
    else if(wallet.paymentMethods.length>0){
      for(let i=0;i<wallet.paymentMethods.length;i++){
        if(wallet.paymentMethods[i].method === "stripe"){
          if(wallet.paymentMethods[i].customerId){
            customerId = wallet.paymentMethods[i].customerId;
            return customerId;
          }
          let newCustomer = await stripe.customers.create({
            name:user.name,
            email:user.email
          });
          if(!newCustomer){
            return new Error("Something went wrong Customer not created");
          }
          wallet.paymentMethods[i].customerId = newCustomer.id;
          await wallet.save();
          return newCustomer.id;
        }
      }
    }
    let newCustomer = await stripe.customers.create({
      name:user.name,
      email:user.email
    });

    if(!newCustomer){
      return new Error("Something went wrong Customer not created");
    }

    wallet.paymentMethods.push({
      method:"stripe",
      customerId:newCustomer.id
    })

    await wallet.save();
    return newCustomer.id;


  }catch(err){
    return err;
  }
}


//for stripe
const findOrCreateAccountId = async(userId)=>{
  try{

    let accountId = null;
    let customer = null;

    customer = await Wallet.findOne({userId:userId});
    if(!customer){
      return new NOTFOUND("User Not Found");
    }
    else if(customer.paymentMethods.length>0){
      for(let i=0;i<customer.paymentMethods.length;i++){
        if(customer.paymentMethods[i].method === "stripe"){
          accountId = customer.paymentMethods[i].accountId;
          return accountId;
        }
      }
    }
    return new NOTFOUND("Connected Account Not Found"); 

  }catch(err){
    return err;
  }
}


//find Order
const getOrderDetails = async(orderId)=>{
  try{

    let order = null;
    order = await OneTimeOrder.findById(orderId);
    if(!order){
      return new NOTFOUND("Order Not Found");
    }
    return order;

  }catch(err){
    return err;
  }

}




// Currently Currency is hard coded as USD
// create payment intent for startup as they are not storing any wallet
const createPaymentIntent = async (req, res, next) => {
  try {
    
    let { orderId } = req.body;
    let order = await getOrderDetails(orderId);
    
    let customerId = await findOrCreateCustomerId(req.user._id);

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId},
      { apiVersion: "2022-08-01" }
    );

    //create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.totalPrice * 100,
      currency: 'usd',
      customer: customerId,
      payment_method_types: ['card'],
      transfer_group: orderId,
    });

    if(!paymentIntent){
      return next(new Error("Something went wrong Payment Intent not created"));
    }

    //storing the paymentIntentId in order data
    order.paymentIntentId = paymentIntent.id;
    await order.save();

    return res.status(200).setHeader("Content-Type","application/json").json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customerId: customerId,
      publishableKey: process.env.STRIPE_PUBLISHED_KEY,
    });

  } catch (err) {
    return next(err);
  }
};


//stripe money transafer to freelancer
const transferMoney = async (req, res, next) => {
  try{

    let {amount, userId, transactionId} = req.body;
    let accountId = await findOrCreateAccountId(userId);
    let transaction = await Transaction.findById(transactionId);
    if(transaction.status === "Release"){
      return next(new Error("Money Already Released"));
    }
    let userWallet = await Wallet.findOne({userId:userId});
    if(!userWallet){
      return next(new NOTFOUND("User Wallet is not Connected with Stripe yet"));
    }
    let onboarded = false;
    for(let i=0;i<userWallet.paymentMethods.length;i++){
      if(userWallet.paymentMethods[i].method === "stripe"){
        onboarded = true;
        break;
      }
    }
    if(!onboarded){
      return next(new NOTFOUND("User is not Connected with Stripe yet"));
    }
    if(!transaction){
      return next(new NOTFOUND("Transaction Not Found"));
    }

    let accountInfo = stripe.accounts.retrieve(accountId);
    if(!accountInfo){
      return next(new NOTFOUND("Account Not Found"));
    }
    if(accountInfo.charges_enabled === false){
      return next(new Error("Account is not Completely Connected with Stripe yet"));
    }

    const transafer = await stripe.transfers.create({
      amount: amount * 100,
      currency: 'usd',
      destination: accountId,
      transfer_group:userId.toString()
    });

    if(!transafer){
      return next(new Error("Something went wrong Transfer not created"));
    }

    userWallet.balance = userWallet.availableBalance - amount;
    await userWallet.save();
    transaction.status = "Release";
    await transaction.save();


    return res.status(200).setHeader('Content-Type','application/json').json({
      status:"OK",
      data:transafer
    })

  }catch(err){
    return next(err);
  }
}



//create a connected Account to Stripe
const createConnectedAccount = async (req, res, next) => {
  try{

    let wallet = await Wallet.findOne({userId:req.user._id});
    if(!wallet){
      return next(new Error("Something went wrong User Wallet not found"));
    }
    
    let accountId = null;
    if(wallet.paymentMethods.length>0){
      for(let i=0;i<wallet.paymentMethods.length;i++){
        if(wallet.paymentMethods[i].method === "stripe"){
          accountId = wallet.paymentMethods[i].accountId;
          break;
        }
      }
    }


    //check if user is already linked or not
    if(accountId){
      //stripe accountInfo
      let accountInfo = await stripe.accounts.retrieve(accountId);
      if (accountInfo.charges_enabled) {
        return res.status(200).json({ status: "OK", data: { msg:"Already Linked", linked:true } });
      } 
    }
    
    
    if(!accountId){
      const account = await stripe.accounts.create({
        type:"express",
        capabilities:{ 
          card_payments:{requested:true},
          transfers:{requested:true},
          
        }
      });
    
      
    accountId = account.id;
    if(!accountId){
      return next(new Error("Something went wrong Account not created"));
    }

    wallet.paymentMethods.push({method:"stripe",accountId:accountId});
    let walletResponse = await wallet.save();
    if(!walletResponse){
      return next(new Error("Something went wrong User Wallet not updated"));
    }

  }

    let returnUrl = `${process.env.BASE_URL}/stripe/account-connected-success/${req.user._id}`

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.BASE_URL}/stripe/account-connected-refresh/${req.user._id}`,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    const { url } = accountLink;
    if(!url){
      return next(new Error("Something went wrong Account Link not created"));
    }

    return res.status(200).setHeader('Content-Type','application/json').json({status:"OK",data:{res:accountLink,returnUrl,msg:"Not Linked", linked:false} });

  }catch(err){
    return next(err);
  }
}


const payOut = async (req, res, next) => {
  try{  

    let {amount} = req.body;
    const payout = await stripe.payouts.create({
      amount: amount,
      currency: 'usd',
    });

    if(!payout){
      return next(new Error("Something went wrong Payout unsuccessfull"));
    }

    let Trsansaction = new Transaction({
      userId:req.user._id,
      amount:amount,
      status:"Release",
    })

    await Trsansaction.save();

    return res.status(200).setHeader('Content-Type','application/json').json({
      status:"OK",
      data:payout
    })
    
  }catch(err){
    return next(err);
  }
}






// const createACustomer = async (details) => {
//   try {
//     let cutomer = await stripe.customers.create(details);
//     return cutomer;
//   } catch (err) {
//     return new Error(err);
//   }
// };

// const getACustomer = async (customerId) => {
//   try {
//     let customer = await stripe.customers.retrieve(customerId);
//     return customer;
//   } catch (err) {
//     return new Error(err);
//   }
// };

// const getCustomerStripeCustomerId = async (userId) => {
//   try {
//     let customerId;
//     let user = await Wallet.findOne({ userId: userId });
//     if (user) {
//       let paymenttMethods = user.paymentMethods;
//       for (let i = 0; i < paymenttMethods.length; i++) {
//         if (paymenttMethods[i].method === "stripe") {
//           customerId = paymenttMethods[i].accountId;
//           break;
//         }
//       }
//       if (customerId) {
//         return customerId;
//       }
//       let newCustomer = await stripe.customers.create({
//         name: user.name,
//         email: user.email,
//       });
//       user.paymentMethods.push({
//         method: "stripe",
//         accountId: newCustomer.id,
//       })
//       return newCustomer.id;
//     }
//     return new Error("User Not Found");
//   } catch (err) {
//     return new Error(err);
//   }
// };

// const setupIntent = async (customerId) => {
//   try {
//     const setupIntent = await stripe.setupIntents.create({
//       payment_method_types: ["card_present"],
//       customer: customerId,
//     });
//     return setupIntent;
//   } catch (err) {
//     return new Error(err);
//   }
// };

// const retrieveSteupIntent = async (setupIntentId) => {
//   try {
//     const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
//     return setupIntent;
//   } catch (err) {
//     return new Error(err);
//   }
// };

// const createSetupIntent = async (req, res, next) => {
//   try {
//     let customerId = await getCustomerStripeCustomerId(req.user._id);
//     const setupIntent = await stripe.setupIntents.create({
//       payment_method_types: ["card_present"],
//       customer: customerId,
//     });
//     return res.json({
//       setupIntent: setupIntent.client_secret,
//     });
//   } catch (err) {
//     return next(err);
//   }
// };

// const createGroupSetupIntent = async (req, res, next) => {
//   try {
//     let { orderId, amount, currency } = req.body;
//     // let customerId = await getCustomerStripeCustomerId(req.user._id);
//     const setupIntent = await stripe.setupIntents.create({
//       // payment_method_types: ["card_present"],
//       // customer: customerId,
//       amount: amount,
//       currency: currency,
//       transfer_group: orderId,
//       confirm: true,
//     });
//     return res.json({
//       setupIntent: setupIntent.client_secret,
//     });
//   } catch (err) {
//     return next(err);
//   }
// };

// const paymentMethods = async (customerId) => {
//   try {
//     const paymentMethods = await stripe.customers.listPaymentMethods(
//       customerId,
//       { type: "card" }
//     );
//     return paymentMethods;
//   } catch (err) {
//     return new Error(err);
//   }
// };

// const processSetupIntent = async (readerId, setupIntentId) => {
//   try {
//     const reader = await stripe.terminal.readers.processSetupIntent(readerId, {
//       setup_intent: setupIntentId,
//       customer_consent_collected: true,
//     });
//     return reader;
//   } catch (err) {
//     return new Error(err);
//   }
// };

// const payOutForACompletedOrderToAdmin = async (orderId) => {
//   try {
//     let Order = await OneTimeOrder.findById(orderId);
//     //TODO: find admin logic based on what will be done
//     const transafer = await stripe.transfers.create({
//       amount: Order.amount - (Order.amount * process.env.APP_PERCENT) / 100,
//       currency: 'usd',
//       destination: process.env.ADMIN_STRIPE_ACCOUNT_ID,
//       transfer_group: orderId,
//     });
//     return transafer;
//   } catch (err) {
//     return new Error(err);
//   }
// };


// //TODO: ACCOUNT ID IS NOT BEING PASSED
// const payOutToUserForACompletedOrder = async (orderId) => {
//   let Order = await OneTimeOrder.findById(orderId);
//   let customersAccountId = "";
//   let customerId = await getCustomerStripeCustomerId(Order.freelancerId);
//   const transafer = await stripe.transfers.create({
//     amount: Order.amount - (Order.amount * process.env.APP_PERCENT) / 100,
//     currency: 'usd',
//     destination: customersAccountId,
//     transfer_group: orderId,
//   });

// }




// // SURE used for creating the payment sheet for adding wallet
// const createPaymentSheet = async (req, res, next) => {
//   const customerId = await getCustomerStripeCustomerId(req.user._id);
//   const ephemeralKey = await stripe.ephemeralKeys.create(
//     {customer: customerId},
//     {apiVersion: '2022-08-01'}
//   );
//   const setupIntent = await stripe.setupIntents.create({
//     customer: customerId,
//   });
//   res.json({
//     setupIntent: setupIntent.client_secret,
//     ephemeralKey: ephemeralKey.secret,
//     customer: customerId,
//     publishableKey: process.env.STRIPE_PUBLISHED_KEY
//   })
// }


// const refund = async (req, res, next) => {};

// export default {
//   createPaymentIntent,
//   createACustomer,
//   setupIntent,
//   createSetupIntent,
//   paymentMethods,
//   processSetupIntent,
//   retrieveSteupIntent,
//   createGroupSetupIntent,
//   payOutToUserForACompletedOrder,
//   payOutForACompletedOrderToAdmin,
//   createPaymentSheet
// };


export default {
  createPaymentIntent,
  transferMoney,
  createConnectedAccount,
  payOut

}
