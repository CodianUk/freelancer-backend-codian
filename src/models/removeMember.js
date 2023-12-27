import mongoose from "mongoose";

const removeMemberSchema = mongoose.Schema(
  {
    startupid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
    },
    memberid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Accepted", "Rejected"],
    },
  },
  {
    timestamps: true,
  }
);

const RemoveMember = mongoose.model("RemoveMember", removeMemberSchema);

export { RemoveMember };
