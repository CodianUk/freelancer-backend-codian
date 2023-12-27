import mongoose from "mongoose";

const startupSchema = new mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    onboarding: {
      status: { type: Boolean, default: false },
      step: { type: Number, default: 1, required: true },
    },
    logo: {
      type: String,
    },
    promoMedia: {
      mediatype: { type: String },
      url: { type: String },
    },
    businessName: {
      type: String,
    },
    problemStatement: { type: String },
    impactStatement: { type: String },
    competition: { type: String },
    story: { type: String },
    category: {
      type: String,
    },
    subCategory: { type: String},
    location: {
      type: String,
    },
    workType : {type : String},
    latNLong : {
      lat : {type : Number},
      long : {type : Number}
    },
    budget: { type: Number },
    stage: { type: String },
    businessPlan: { type: String },
    businessType: { type: String },
    members: [
      {
        member: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        position: { type: String },
        role: { type: String },
      },
    ],
    partnershipTerms: [{ type: String }],
    milestones: [
      {
        title: { type: String },
        description: { type: String },
        progress: { type: Number, default: 0 },
        dueDate: { type: String },
      },
    ],
    pitchDeck: { type: String },
    addtional_details :  { type : String},
    expenses :  { type : String},
    vision :  { type : String},
    url: {
      type: String,
    },
  },
  { timestamps: true }
);

const Startup = mongoose.model("Startup", startupSchema);

export { Startup };
