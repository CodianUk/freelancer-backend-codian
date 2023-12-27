import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import twilioClient from "twilio";
import nodemailer from 'nodemailer';
import randomstring from 'randomstring';

import {
  accessTokenGenerator,
  refreshTokenGenerator,
} from "../middleware/authentication.js";

import { User } from "../models/user.js";
import { Wallet } from "../models/wallet.js";
// import createACustomer from "../utils/stripe.js";
import RefreshToken from "../models/refreshToken.js";


import NOTFOUND from "../errors/notFound.js";
import UnAuthorized from "../errors/unAuthorized.js";
import router from "../routes/order.routes.js";
import BadRequest from "../errors/badRequest.js";
import { Startup } from "../models/startup.js";
import { Freelancer } from "../models/freelancer.js";

// import createACustomer from '../utils/stripe.js'

const twilio = twilioClient(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);



const Login = async (req, res, next) => {
  let email = req.body.email;
  let password = req.body.password;

  try {
    let user = await User.findOne({ email: email });
    if (!user) {
      let err = new NOTFOUND("User does not exsists");
      return next(err);
    } else {
      if (user.status === "Suspended") {
        let err = new UnAuthorized("You are suspended Contact Admin");
        return next(err);
      }
      if (user.isDeleted) {
        let err = new UnAuthorized("Your account has been deleted");
        return next(err);
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        let err = new Error("Email or Password is incorrect");
        return next(err);
      }

      let onboarding;
      let startupOnboarding;
      // getting onboarding status

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

      let accessToken = accessTokenGenerator(user);
      let refreshToken = refreshTokenGenerator(user);

      //if refresh token already exsists then update it else create a new one
      await RefreshToken.findOneAndUpdate(
        { userId: user._id },
        { userId: user._id, refreshToken: refreshToken },
        { upsert: true }
      );

      res.status(200).json({
        status: "OK",
        accessToken,
        refreshToken,
        user: {
          _id : user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          phoneNumber: user.phoneNumber,
          role: user.role,
          authtype: user.authType,
        },
        onboarding: user.role==="Admin"?NaN:onboarding,
        startupOnboarding: user.role==="Admin"?NaN:startupOnboarding,
      });
    }
  } catch (err) {
    next(err);
  }
};

const SignUp = async (req, res, next) => {
  let { email, avatar, name, password, phoneNumber, role } = req.body;
  let salt = await bcrypt.genSalt(10);
  let hashed = await bcrypt.hash(password, salt);

  try {
    // Check if a user with the same email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ status: "ERROR", message: "There is already an account with this email address" });
    }

    // If no existing user, proceed to create the new user
    let newUser = new User({
      email,
      name,
      password: hashed,
      avatar,
      phoneNumber,
      authType: "local",
      role,
    });
    
    let userObj = await newUser.save();
    if (!userObj) {
      let err = new Error("Something went wrong Could not create user");
      return next(err);
    }
    
    let wallet = new Wallet({
      userId: userObj._id,
    });

    await wallet.save();
    let accessToken = accessTokenGenerator(userObj);
    let refreshToken = refreshTokenGenerator(userObj);
    delete userObj["password"];
    await RefreshToken.create({ userId: userObj._id, refreshToken });
    let onboarding = false;
    
    return res
      .status(201)
      .json({ status: "OK", accessToken, refreshToken, user: userObj, onboarding });
  } catch (err) {
    next(err);
  }
};


// Refresh Access Token=========================================================================================
const RefreshAccessToken = async (req, res, next) => {
  let refreshToken = req.body.refreshToken;
  let verified = await auth.verifyRefreshToken(refreshToken);

  if (!verified) {
    let err = new UnAuthorized("You are not Authroized");
    return next(err);
  }
  let found = await RefreshToken.findOne({ refreshToken: refreshToken });
  if (!found) {
    let err = new UnAuthorized("You are not Authroized");
    return next(err);
  }
  let user = await User.findById(verified._id);
  if (!user) {
    let err = new UnAuthorized("You are not Authroized");
    return next(err);
  }
  let accessToken = accessTokenGenerator(user);
  res
    .status(201)
    .setHeader("Content-Type", "application/json")
    .json({ status: "OK", accessToken, refreshToken });
};

const setRole = async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id);
    if (!user) {
      let err = new NOTFOUND("User does not exsists");
      return next(err);
    }
    user.role = req.body.role;
    let response = await user.save({ validateBeforeSave: true });
    if (!response) {
      let err = new Error("Something went wrong");
      return next(err);
    }
    res.status(200).json({ status: "OK", message: "Role set successfully" });
  } catch (err) {
    return next(err);
  }
};

const SENDOTPTOCLIENT = async (req, res, next) => {
  try {
    const { to, channel } = req.body;
    twilio.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({ to: to, channel: channel })
      .then((data) => {
        res
          .status(200)
          .json({ status: "OK", message: "OTP send successfully" });
      })
      .catch(() => {
        res
          .status(400)
          .json({ status: "ERROR", message: "OTP verification failed" });
      });
  } catch (err) {
    next(err);
  }
};

const VERIFYCLIENTOTP = async (req, res, next) => {
  try {
    const { to, code } = req.body;
    twilio.verify
      .services(process.env.TWILIO_SERVICE_SID)
      .verificationChecks.create({ to: to, code: code })
      .then((data) => {
        if (data.status === "approved") {
          res
            .status(200)
            .json({ status: "OK", message: "OTP verified successfully" });
        } else {
          res
            .status(400)
            .json({ status: "ERROR", message: "OTP verification failed" });
        }
      })
      .catch(() => {
        res
          .status(400)
          .json({ status: "ERROR", message: "OTP verification failed" });
      });
  } catch (err) {
    next(err);
  }
};



const forgotPassword = async (req, res, next) => {
  try{

    let {newPassword, confirmPassword, email} = req.body;
    if(newPassword !== confirmPassword){
      let err = new BadRequest("Password and Confirm Password does not match");
      return next(err);
    }
    let user = await User.findOne({email: email});
    if(!user){
      let err = new NOTFOUND("User does not exsists");
      return next(err);
    }
    let salt = await bcrypt.genSalt(10);
    let hashed = await bcrypt.hash(newPassword, salt);
    user.password = hashed;
    let response = await user.save({validateBeforeSave: true});
    if(!response){
      let err = new Error("Something went wrong");
      return next(err);
    }
    return res.status(200).json({status: "OK", message: "Password changed successfully"});

  }catch(err){
    return next(err)
  }
}

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'zohaibjawaid92@gmail.com',
    pass: 'zvbsmxwswfxszkvq',
  },
});

// Generate and store OTPs (e.g., in-memory or a database)
const otpStore = new Map();

// Generate a random OTP
const generateOTP = () => {
  return randomstring.generate(6); // 6-character OTP, you can change the length
};

// Endpoint for sending OTP via email


const sendOtpOnEmail = async (req, res, next) => {
  const { email } = req.body;

  // Generate an OTP
  const otp = generateOTP();

  // Store the OTP (you might want to store it in a database for verification)
  otpStore.set(email, otp);

  // Email options
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'OTP Verification',
    text: `Your OTP is: ${otp}`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    } else {
      console.log('Email sent: ' + info.response);
      res.status(200).json({ success: true, message: 'OTP sent successfully' ,  OTP : otp });
    }
  });
}



export default {
  Login,
  SignUp,
  setRole,
  RefreshAccessToken,
  SENDOTPTOCLIENT,
  sendOtpOnEmail,
  VERIFYCLIENTOTP,
  forgotPassword
};
