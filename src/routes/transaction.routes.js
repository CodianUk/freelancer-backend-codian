import { accessTokenVerify } from "../middleware/authentication.js";
import Controller from "../controllers/transactionController.js";
import { Router } from "express";
const router = Router();

// @Route   GET /transactions/paymentRequests
// @desc    returns all payment requests of users
// TODO: FIX THIS ONE
// router.route("/paymentRequests").get(accessTokenVerify, Controller.getAllPaymentRequests);

// @Route   POST /transactions/order
// @desc    returns the description and status of the order
router.route("/order").post(accessTokenVerify, Controller.getOrderDetails);



export default router;
