import { Router } from "express";
import stripePass from "stripe";

const router = Router();
import Stripe from "../utils/stripe.js";
const stripe = stripePass(process.env.STRIPE_SECRET_KEY);

import {
  optionalAccessTokenVerify,
  accessTokenVerify,
  admin,
  startup,
} from "../middleware/authentication.js";
import { payOutrules, relaseTransactionRules, validate } from "../middleware/validator.js";
import { Wallet } from "../models/wallet.js";


// router.post('/create_setup_intent',Stripe.createSetupIntent);

router.post(
  "/multiparty-express",
  accessTokenVerify,
  Stripe.createConnectedAccount
);

router.get("/account-connected-success/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let wallet = await Wallet.findOne({ userId: id });
    if (!wallet) {
      return next(new BadRequest("Wallet Not Found"));
    }
    let accountId = null;
    for (let i = 0; i < wallet.paymentMethods.length; i++) {
      if (wallet.paymentMethods[i].method === "stripe") {
        accountId = wallet.paymentMethods[i].accountId;
        break;
      }
    }
    if (!accountId) {
      return next(new BadRequest("Account Not Found"));
    }

    //stripe accountInfo
    let accountInfo = await stripe.accounts.retrieve(accountId);
    if (accountInfo.charges_enabled) {
      return res.status(200).json({ status: "OK", data: { linked: true } });
    } else {
      return res.status(300).json({ status: "OK", data: { linked: false } });
    }
  } catch (err) {
    next(err);
  }
});

router.get("/account-connected-refresh/:id", async (req, res, next) => {
  try {
    let id = req.params.id;
    let wallet = await Wallet.findOne({ userId: id });
    if (!wallet) {
      return next(new BadRequest("Wallet Not Found"));
    }
    let accountId = null;
    for (let i = 0; i < wallet.paymentMethods.length; i++) {
      if (wallet.paymentMethods[i].method === "stripe") {
        accountId = wallet.paymentMethods[i].accountId;
        break;
      }
    }
    if (!accountId) {
      return next(new BadRequest("Account Not Found"));
    }

    //stripe onboarding
    let url = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.BASE_URL}/stripe/account-connected-refresh/${id}`,
        return_url: `${process.env.BASE_URL}/stripe/account-connected-success/${id}`,
        type: "account_onboarding",
    })

    if (!url) {
      return next(new Error("Something went wrong"));
    }

    return res.status(200).json({ status: "OK", data: { data: url } });

    
  } catch (err) {
    next(err);
  }
});

router.post('/create-payment-intent', Stripe.createPaymentIntent);

router.post(
  "/checkout-connected-direct",
  accessTokenVerify,
  startup,
  Stripe.createPaymentIntent
);

// router.post('/create-group-setup-intent', Stripe.createGroupSetupIntent);

// router.post('/payment-sheet-addWallet', Stripe.createPaymentSheet);
router.post(
  "/checkout-connected-destination",
  accessTokenVerify,
  admin,
  relaseTransactionRules(),
  validate,
  Stripe.transferMoney
);


//admin withdraw
router.post(
  "/admin/withdraw",
  accessTokenVerify,
  admin,
  payOutrules(),
  validate,
  Stripe.payOut
)



router.get("/get-publishable-key", async (req, res, next) => {
  try {
    return res.status(200).json({
      status: "OK",
      data: { publishableKey: process.env.STRIPE_PUBLISHED_KEY },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
