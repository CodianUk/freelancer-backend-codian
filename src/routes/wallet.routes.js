import { Router } from "express";
const router = Router();
import Controller from "../controllers/walletController.js";
import { accessTokenVerify, freelancer, startup } from "../middleware/authentication.js";
import {
  addWalletPaymentMethodRules,
  validate,
} from "../middleware/validator.js";

// @Route: /wallet
// @DESC: Get freelancer wallet details
router.route("/user").get(accessTokenVerify,freelancer, Controller.freelancerWallet);


// @Route: /wallet/withdrawlRequest
// @DESC: make a withdrawl request
router
  .route("/withdrawlRequest")
  .get(accessTokenVerify,freelancer, Controller.withdrawlRequest);


router.route("/startup").get(accessTokenVerify,startup, Controller.startupWallet);


export default router;
