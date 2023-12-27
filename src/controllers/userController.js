import { User } from "../models/user.js";
import BadRequest from "../errors/badRequest.js";
import NOTFOUND from "../errors/notFound.js";
import bcrypt from "bcryptjs";

const updateEmail = async (req, res, next) => {
  try {
    let _id = req.user._id;

    let foundUser = await User.findById(_id);
    if(!foundUser){
      let err = new NOTFOUND("User not found");
      return next(err);
    }
    if(foundUser.authType === "google" || foundUser.authType === "facebook"){
      let err = new BadRequest("You can't change your email as you are using social login");
      return next(err);
    }

    foundUser.email = req.body.email;
    foundUser.emailVerified = true;
    let response = await foundUser.save({ validateBeforeSave: true, new: true });

    if (response) {
      res.status(200).json({
        status: "OK",
        data: response,
      });
    } else {
      let err = new Error("Something went wrong");
      return next(err);
    }
  } catch (err) {
    return next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let { newPassword, oldPassword } = req.body;

    let user = await User.findById(_id);
    if (!user) {
      let err = new NOTFOUND("User not found");
      return next(err);
    }

    if(user.authType === "google" || user.authType === "facebook"){
      let err = new BadRequest("You can't change your password as you are using social login");
      return next(err);
    }

    let isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      let err = new BadRequest("Incorrect Password");
      return next(err);
    }
    let salt = await bcrypt.genSalt(10);
    let hashed = await bcrypt.hash(newPassword, salt);

    user.password = hashed;
    let response = await user.save({ validateBeforeSave: true, new: true });

    if (response) {
      return res.status(200).json({
        status: "OK",
        data: { msg: "Password Successfully Changed" },
      });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};

const modifyNotification = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let response = await User.findByIdAndUpdate(
      _id,
      { notification: req.body.notification },
      { new: true }
    );
    if (response) {
      return res.status(200).json({
        status: "OK",
        data: {
          msg:
            "Notification turned " +
            (req.body.notification === true
              ? "on successfully"
              : "off successfully"),
        },
      });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let { password, confirmPassword } = req.body;

    let user = await User.findById(_id);
    if (user) {
      let isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        let err = new BadRequest("Password doesn't match");
        return next(err);
      }
      if (err) {
        let err = new BadRequest("Password is incorrect");
        return next(err);
      } else {
        if (password !== confirmPassword) {
          let err = new BadRequest("Passwords doesn't match");
          return next(err);
        }
        let response = await User.findByIdAndUpdate(_id, { isDeleted: true });
        if (response) {
          return res.status(200).json({
            status: "OK",
            data: { msg: "User Deleted Successfully" },
          });
        }
        let err = new Error("Something went wrong");
        return next(err);
      }
    } else {
      let err = new NOTFOUND("No Such user Found");
      return next(err);
    }
  } catch (err) {
    return next(err);
  }
};

const updatePhone = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let { phoneNumber } = req.body;
    let response = await User.findByIdAndUpdate(
      _id,
      { phoneNumber: phoneNumber },
      { new: true }
    );
    if (response) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({
          status: "OK",
          data: { msg: "Phone Number Updated Successfully" },
        });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};


const updateProfile = async (req, res, next) => {
  try{
    
    let _id = req.user._id;
    let { avatar, name } = req.body;

    let response = await User.findByIdAndUpdate(_id,{avatar:avatar,name:name},{new:true}).select("-_id name email avatar phoneNumber authType role");
    if(response){
      return res.status(200).json({
        status:"OK",
        data:{user:response}
      });
    }
    let err = new Error("Something went wrong");
    return next(err);

  }catch(err){
    return next(err);
  }
}
const searchfreelancers = async (req,res,next) => {
  try {
    let {keyword} = req.body;
    let freelancers = await User.find({$and:[{$or:[{"name":{$regex:keyword}},{"email":{$regex:keyword}}]},{"role":"Freelancer"}]})
    if (freelancers.length > 0) {
      return res.status(200).json({
        status: "OK",
        results: freelancers.length,
        data: freelancers,
      });
    }
    else {
      return res.status(200).json({
        status: "OK",
        mssg: "No freelancers found",
        data: freelancers,
      });
    }
    
  }
  catch(err) {
    return next(err)

  }
}


export default {
  updateEmail,
  updatePassword,
  modifyNotification,
  deleteUser,
  updatePhone,
  updateProfile,
  searchfreelancers
};
