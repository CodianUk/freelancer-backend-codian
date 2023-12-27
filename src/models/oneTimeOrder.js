import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: true,
    },
    attachments: {
      type: [String],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const cancelSchema = new mongoose.Schema(
  {
    status: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const oneTimeOrderSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
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
    totalPrice: {
      type: Number,
      require: true,
    },
    deliveryTime: {
      type: Date,
      required: true,
    },
    attachments: {
      type: [{ type: String }],
    },
    offerStatus: {
      type: String,
      enum: ["Sent", "Withdrawn", "Accepted", "Rejected"],
      default: "Sent",
    },
    status: {
      type: String,
      enum: [
        "Active",
        "Pending",
        "Completed",
        "Cancelled",
        "RequestedCancellation",
        "InActive"
      ],
    },
    appPercentage: {
      type: Number,
      required: true,
    },
    cancelled: cancelSchema,
    delivered: {
      type: Boolean,
      default: false,
    },
    delivery: deliverySchema,
    paymentIntentId:{
      type:String,
    }
  },
  {
    timestamps: true,
  }
);

const OneTimeOrder = mongoose.model("oneTimeOrder", oneTimeOrderSchema);

export { OneTimeOrder };
