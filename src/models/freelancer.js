import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema({
  title: { type: String, required: true},
  description: { type: String, required:true },
  attachments: {
    type: [{ type: String }],
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
});

const freelancerSchema = new mongoose.Schema(
  {
    _id: { type:mongoose.Schema.Types.ObjectId, ref: "User" },
    accountActive: { type: Boolean, default: true },
    onboarding: {
      type: Boolean, default: false 
    },
    aboutMe: { type: String, default: "About Me" },
    availibilityPerWeek : { type: Number },
    jobRole: { type: String },
    gender: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    language: { type: String, required: true },
    skills: {
      type: [{ type: String }],
      validate: v=> Array.isArray(v) && v.length>0,
      required:true,
    },
    latNLong : {
      lat : {type : Number},
      long : {type : Number}
    },
    location : {type : String},
    workType : {type : String},
    userType : {
      type: String,
      enum: ["StartupOwner", "Freelancer"],
    },
    startupOnboarding: {
      type: Boolean, default: false 
    },
    workPreference: {
      type: String,
      enum: ["Equity", "Freelance", "Both" , "Virtual"],
      required:true
    },
    roleType : {
      type: String,
    },
    hoursPerWeek : {
      type: String,
    },
    businessDetails : {
      type: String,
    },
    availability: {
      type: String,
    },
    jobTitle: { type: String },
    hourlyRate: { type: Number, default:0},
    description: { type: String,required:true },
    category: { type: String },
    subCategory: { type: String},
    responseTime: { type: String },
    lastActive: { type: Date },
    portfolio: [portfolioSchema],
    rating:{
      type:Number,
      default:0
    },
    url:{
      type:String,
    }
  },
  { timestamps: true }
);

const Freelancer = mongoose.model("Freelancer", freelancerSchema);

export { Freelancer };
