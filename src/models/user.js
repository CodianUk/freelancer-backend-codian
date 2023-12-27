import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      default: "Active",
      enum: ["Active", "Suspended"],
      required: true,
    },
    googleId: { type: String },
    facebookId: { type: String },
    name: { type: String, required: true },
    avatar: {
      type: String,
      required: true,
      default:
        "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541",
    },
    email: { type: String, required: true},
    phoneNumber: { type: String },
    password: { type: String },
    authType: {
      type: String,
      required: true,
      enum: ["local", "google", "facebook"],
    },
    role: {
      type: String,
      enum: ["Startup Owner", "Freelancer", "Admin"],
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    latNLong : {
      lat : {type : Number},
      long : {type : Number}
    },
    notification: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    url:{
      type: String,
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export { User };
