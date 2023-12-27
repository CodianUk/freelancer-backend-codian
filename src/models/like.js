import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  liked: [
    {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "MONGODBREF",
    },
  ],
  MONGODBREF: {
    type: String,
    enum: ["Startup", "Freelancer"],
    required: true,
  },
});

const Like = mongoose.model("Like", likeSchema);

export {Like};
