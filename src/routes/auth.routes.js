import { Router } from "express";

import Controller from "../controllers/authController.js";
import passport from "passport";
import {
  accessTokenGenerator,
  refreshTokenGenerator,
} from "../middleware/authentication.js";
import UnAuthorized from "../errors/unAuthorized.js";
import {
  signUpValidationRules,
  loginValidationRules,
  validate,
  setRoles,
  forgotPasswordRules,
  signUporLoginMobileGoogleRules,
  signUporLoginMobileFacebookRules,
} from "../middleware/validator.js";
import RefreshToken from "../models/refreshToken.js";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.js";
import { Wallet } from "../models/wallet.js";
import BadRequest from "../errors/badRequest.js";
import { Freelancer } from "../models/freelancer.js";
import { Startup } from "../models/startup.js";
import {TermsAndConditions} from "../models/termsConditions.js";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = Router();
// 
router.post("/login", loginValidationRules(), validate, Controller.Login);
router.post("/signup", Controller.SignUp);

// Google Routes
router.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: ["email", "profile"],
  })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/auth/google/done",
    failureRedirect: "/auth/google/fail",
    session: true,
  })
);

router.post(
  "/forgotPassword",
  forgotPasswordRules(),
  validate,
  Controller.forgotPassword
);

router.get("/google/done", async (req, res, next) => {
  let accessToken = accessTokenGenerator(req.user);
  let refreshToken = refreshTokenGenerator(req.user);
  await RefreshToken.findOneAndUpdate(
    { userId: req.user._id },
    { userId: req.user._id, refreshToken: refreshToken },
    { upsert: true }
  );
  return res
    .status(200)
    .json({ status: "OK", accessToken, refreshToken, user: req.user });
});
router.get("/google/fail", (req, res, next) => {
  return next(new UnAuthorized("Google Authentication Failed"));
});

//for google and facebook role set
router.put("/setRole", setRoles(), validate, Controller.setRole);
// Facebook Routes
// router.get("/facebook",passport.authenticate("facebook",{session:false,scope:["email"]}));
// app.get('/facebook/callback',
//   passport.authenticate('facebook', { failureRedirect: '/facebook/fail' }),
//   function(req, res) {
//     // Successful authentication, redirect home.
//     res.redirect('/facebook/done');
// });
// router.get('/facebook/done',async(req,res,next)=>{
//     let accessToken = accessTokenGenerator(req.user);
//     let refreshToken = refreshTokenGenerator(req.user);
//     await RefreshToken.findOneAndUpdate({userId:req.user._id},{userId:req.user._id,refreshToken:refreshToken},{upsert:true});
//     return res.status(200).json({status:"OK",accessToken,refreshToken,user:req.user})
// });
// router.get('/facebook/fail',(req,res,next)=>{
//     return next(new UnAuthorized("Facebook Authentication Failed"))
// });

//Refresh Access Token
router.post("/RefreshAccessToken", Controller.RefreshAccessToken);

// @ROUTE  POST /auth/sendOTP
// @DESC   Send OTP
router.post("/sendOTP", Controller.SENDOTPTOCLIENT);

// @DESC   Send OTP
router.post("/sendOTPonEmail", Controller.sendOtpOnEmail);

// @ROUTE  POST /auth/verifyOTP
// @DESC   Verify OTP
router.post("/verifyOTP", Controller.VERIFYCLIENTOTP);

//@ ROUTE  POST /auth/google/mobile
//@ DESC   Google Login for Mobile
router.post(
  "/google/mobile",
  signUporLoginMobileGoogleRules(),
  validate,
  async (req, res, next) => {
    try {
      const { tokenId, role } = req.body;
      const ticket = await client.verifyIdToken({
        idToken: tokenId,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      let onboarding;
      let startupOnboarding;

      const { sub, email_verified, name, email } = ticket.getPayload();
      let user = await User.findOne({ googleId: sub });1
      
      // getting onboarding status
      if(user){
        if(user.role==="Freelancer"){
          let onBoardData = await Freelancer.findById(user._id);
          if(!onBoardData){
            onboarding = false;
          }else{
            onboarding = onBoardData.onboarding;
          }
        }
        else if(user.role==="Startup Owner"){

          let getFromFreelancerModel = await Freelancer.findById(user._id);
          console.log(getFromFreelancerModel)
          if(!getFromFreelancerModel){
            startupOnboarding = false;
          }else{
            startupOnboarding = getFromFreelancerModel.startupOnboarding;
          }

          let onBoardData = await Startup.findById(user._id);
          if(!onBoardData){
            onboarding = {status:false, step:1};
          }else{
            onboarding = onBoardData.onboarding;
          }
        }
      }

      if (!user) {

        onboarding = false;

        if(!role || role==null || role==undefined){
          return next(new BadRequest("This account does not exsist. Please Sign Up"));
        }

        let newUser = new User({
          googleId: sub,
          name,
          email,
          emailVerified: email_verified,
          authType: "google",
          role: role,
        });

        user = await newUser.save({ validateBeforeSave: true, new: true });

        if (!user) {
          let err = new Error("Something went Wrong");
          return next(err);
        }
        await Wallet.create({ userId: user._id });
      }

      if (user.status === "Suspended") {
        let err = new UnAuthorized("You are suspended Contact Admin");
        return next(err);
      }
      if (user.isDeleted) {
        let err = new UnAuthorized("Your account has been deleted");
        return next(err);
      }

      let accessToken = accessTokenGenerator(user);
      let refreshToken = refreshTokenGenerator(user);
      await RefreshToken.findOneAndUpdate(
        { userId: user._id },
        { userId: user._id, refreshToken: refreshToken },
        { upsert: true }
      );
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", accessToken, refreshToken, user, onboarding ,  startupOnboarding});
    } catch (err) {
      return next(err);
    }
  }
);

// @ROUTE  POST /auth/facebook/mobile
// @DESC   Facebook Login for Mobile
router.post(
  "/facebook/mobile",
  signUporLoginMobileFacebookRules(),
  validate,
  async (req, res, next) => {
    try {
      let { id, name, email, role } = req.body;

      let onboarding;
      let startupOnboarding;


      let user = await User.findOne({ facebookId: id });

      // getting onboarding status
      if(user){
        if(user.role==="Freelancer"){
          let onBoardData = await Freelancer.findById(user._id);
          if(!onBoardData){
            onboarding = false;
          }else{
            onboarding = onBoardData.onboarding;
          }
        }
        else if(user.role==="Startup Owner"){

          let getFromFreelancerModel = await Freelancer.findById(user._id);
          console.log(getFromFreelancerModel)
          if(!getFromFreelancerModel){
            startupOnboarding = false;
          }else{
            startupOnboarding = getFromFreelancerModel.startupOnboarding;
          }

          let onBoardData = await Startup.findById(user._id);
          if(!onBoardData){
            onboarding = {status:false, step:1};
          }else{
            onboarding = onBoardData.onboarding;
          }
        }
      }

      if (!user) {
          
        if(!role || role==null || role==undefined){
          return next(new BadRequest("This account does not exsist. Please Sign Up"));
        }

        onboarding = false;

        let newUser = new User({
          facebookId: id,
          name,
          email,
          emailVerified: true,
          authType: "facebook",
          role: role,
        });

        user = await newUser.save({ validateBeforeSave: true, new: true });

        if (!user) {
          let err = new Error("Something went Wrong");
          return next(err);
        }
        await Wallet.create({ userId: user._id });
      }
      if (user.status === "Suspended") {
        let err = new UnAuthorized("You are suspended Contact Admin");
        return next(err);
      }
      if (user.isDeleted) {
        let err = new UnAuthorized("Your account has been deleted");
        return next(err);
      }
      let accessToken = accessTokenGenerator(user);
      let refreshToken = refreshTokenGenerator(user);
      await RefreshToken.findOneAndUpdate(
        { userId: user._id },
        { userId: user._id, refreshToken: refreshToken },
        { upsert: true }
      );
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", accessToken, refreshToken, user, onboarding  , startupOnboarding});
    } catch (err) {
      return next(err);
    }
  }
);


router.post("/termNconditions", async (req, res, next) => {
  try {
    const { content, version } = req.body;
    const newTerms = new TermsAndConditions({ content, version });
    const savedTerms = await newTerms.save();
    res.status(201).json(savedTerms);
  } catch (error) {
    next(error);
  }
});

// Retrieve the latest terms and conditions
router.get("/termNconditions", async (req, res, next) => {
  try {
    const latestTerms = await TermsAndConditions.findOne().sort({ createdAt: -1 });
    res.status(200).json(latestTerms);
  } catch (error) {
    next(error);
  }
});

// Update the terms and conditions
router.put("/termNconditions/:id", async (req, res, next) => {
  try {
    const { content, version } = req.body;
    const updatedTerms = await TermsAndConditions.findByIdAndUpdate(
      req.params.id,
      { content, version },
      { new: true }
    );
    res.status(200).json(updatedTerms);
  } catch (error) {
    next(error);
  }
});

export default router;
