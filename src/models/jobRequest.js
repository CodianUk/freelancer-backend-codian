import mongoose from "mongoose";

const jobRequestSchema = new mongoose.Schema(
  {
    startupid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    usersWhoHaveApplied:[
      {
        type : String
        // type: mongoose.Schema.Types.ObjectId,
        // ref: "User",
      }
    ]
    ,
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectRoles",
      required: true,
    },
    amount: { type: Number },
    position: { type: String, required: true },
  },
  { timestamps: true }
);

const JobRequest = mongoose.model("JobRequest", jobRequestSchema);

export { JobRequest };
