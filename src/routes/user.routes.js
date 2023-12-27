import express from "express";
const router = express.Router();
import Controller from "../controllers/userController.js";
import { accessTokenVerify, startup } from "../middleware/authentication.js";
import {
  deleteUserRules,
  updatePhoneRules,
  suspendStatusRules,
  modifyNotification,
  updateEmailRules,
  updatePasswordRules,
  validate,
  startupUpdateNameOrAvatarRules,
} from "../middleware/validator.js";

// @Route   PUT users/update/email
// @Desc    update user email
router
  .route("/update/email")
  .put(accessTokenVerify, updateEmailRules(), validate, Controller.updateEmail);

// @Route   PUT users/update/password
// @Desc    update user password by taking new password and confirm password
router
  .route("/update/password")
  .put(
    accessTokenVerify,
    updatePasswordRules(),
    validate,
    Controller.updatePassword
  );

// @Route   PUT users/notification
// @Desc    update user notifications on or off take a boolean "notification"
router
  .route("/notification")
  .put(
    accessTokenVerify,
    modifyNotification(),
    validate,
    Controller.modifyNotification
  );

// @Route   PUT users/update/phone
// @Desc    update user phone number by taking a string "phoneNumber"
router
  .route("/update/phone")
  .put(accessTokenVerify, updatePhoneRules(), validate, Controller.updatePhone);

// @Route   DELETE users/delete
// @Desc    delete users User and aslo startUp and Freelancer profile
router
  .route("/delete")
  .delete(
    accessTokenVerify,
    deleteUserRules(),
    validate,
    Controller.deleteUser
  );


// @Route   PUT users/update/profilePhoto
// @Desc    update user profile photo by taking a string "avatar"
router
  .route("/update/profilePhotoandName")
  .put(accessTokenVerify, startup ,startupUpdateNameOrAvatarRules(),validate, Controller.updateProfile);

  router
  .route("/searchfreelancers")
  .post(
    Controller.searchfreelancers
  )
export default router;
