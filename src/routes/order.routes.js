import { accessTokenVerify, freelancer, startup, admin } from "../middleware/authentication.js";
import Controller from "../controllers/orderController.js";

// import stripePass from "stripe";
// const stripe = stripePass(process.env.STRIPE_SECRET_KEY);

import {
  OneTimeOrderCreationRules,
  equityOrdereCreationRules,
  validate,
  deliverOneTimeOrderRules,
  cancelOneTimeOrderRules,
  reviewRules,
  orderOfferStatusRules,
  orderStatusUpdate,
  updateEquityOrderStatus,
  UpdateCancelRequestStatusOfOneTimeOrder,
} from "../middleware/validator.js";

import { Router } from "express";

const router = Router();

// @Route   GET /orders/
// @desc    returns all orders of freelancer (active,pending,completed and cancelled)
router.route("/").get(accessTokenVerify,freelancer, Controller.getAllOrders);

// @Route   GET /orders/category
// @desc    returns all orders of freelancer (active OR pending OR completed OR cancelled) based on category
router.route("/category").post(accessTokenVerify,freelancer, Controller.getAllOrders);

// @Route   GET /orders/order
// @desc    return specific order's details
router.route("/order").post(accessTokenVerify,freelancer, Controller.getOrderById);
router.route("/getorderdetails").post(accessTokenVerify,admin, Controller.getOrderDetails);

router.route("/getOrdersByFreelancerId/:clientId").get(accessTokenVerify,freelancer, Controller.getOrdersByFreelancerId);

// @Route   POST /orders/create/oneTime
// @desc    creates a new order of oneTimeOrder type  (i.e should be called from chats based on order acceptence)
router
  .route("/create/oneTime")
  .post(
    accessTokenVerify,
    freelancer,
    OneTimeOrderCreationRules(),
    validate,
    Controller.createAOneTimeOrder
  );

router
  .route("/oneTime/offerStatus")
  .put(
    accessTokenVerify,
    orderOfferStatusRules(),
    validate,
    Controller.oneTimeOfferStatusUpdate
  );

// @Route   PUT /orders/oneTime/deliver
// @desc    takes details of delivery and deliver a project (status not completed until startup marks it accepted)
router
  .route("/oneTime/deliver")
  .put(
    accessTokenVerify,
    freelancer,
    deliverOneTimeOrderRules(),
    validate,
    Controller.deliverOneTimeOrder
  );

// @Route   PUT /orders/oneTime/deliveryStatus/update
// @desc    takes orderId and status of the order and updates it
router
  .route("/oneTime/deliveryStatus/update")
  .put(
    accessTokenVerify,
    startup,
    orderStatusUpdate(),
    validate,
    Controller.updateDeliveryStatus
  );

// @Route   PUT /orders/oneTime/cancel
// @desc    takes reason of cancel and cancel the order (status set to Cancelled)
router
  .route("/oneTime/cancel")
  .put(
    accessTokenVerify,
    freelancer,
    cancelOneTimeOrderRules(),
    validate,
    Controller.cancelOneTimeOrder
  );

// @Route   POST /orders/equity/
// @desc    takes details of creating equity type order and creates it
router
  .route("/create/equity")
  .post(
    accessTokenVerify,
    startup,
    equityOrdereCreationRules(),
    validate,
    Controller.createEquityOrder
  );

  router
  .route("/equity-orders/:startupId")
  .get(
    accessTokenVerify,
    startup,
    Controller.getEquityOrdersByStartupId
  );

// @Route   PUT /orders/equity/update
// @desc    takes orderId and status of the order and updates it
router
  .route("/equity/update")
  .put(
    accessTokenVerify,
    startup,
    orderStatusUpdate(),
    validate,
    Controller.updateEquityOrderStatus
  );

  

router
  .route("/equity/offerStatus")
  .put(
    accessTokenVerify,
    freelancer,
    updateEquityOrderStatus(),
    validate,
    Controller.EquityOfferStatusUpdate
  );

// @Route   POST /orders/review/
// @desc    takes details of creating equity type order and creates it
router
  .route("/order/review")
  .post(accessTokenVerify, startup ,reviewRules(), validate, Controller.addReview);

// @Route   GET /startup/orders/
// @desc    returns all orders of startup (active,pending and completed)
router.route("/user").get(accessTokenVerify,startup, Controller.getUserOrders);


// @Route   PUT /orders/order/cancel-request-update
// @desc    takes orderId and status of the order and updates it based on cancel request by startup
router.route('/order/cancel-request-update').put(accessTokenVerify, freelancer ,UpdateCancelRequestStatusOfOneTimeOrder(),validate,Controller.updateOrderCancelRequestStatus);







export default router;
