import mongoose from "mongoose";

const equityOrderSchema = new mongoose.Schema(
  {
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      required: true,
    },
    clientId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
      minlength: 3,
    },
    description: {
      type: String,
      required: true,
    },
    equity: {
      type: Number,
      require: true,
    },
    partnershipAgreement: {
      type: String,
      required: true,
    },
    offerStatus: {
      type: String,
      enum: ["Sent", "Withdrawn", "Accepted", "Rejected", "Revision"],
      default: "Sent",
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

const EquityOrder = mongoose.model("equityOrder", equityOrderSchema);

export { EquityOrder };
