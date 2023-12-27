import mongoose from "mongoose";

const ratingAndReviewSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: "Freelancer" },
    orderId:{type:mongoose.Schema.Types.ObjectId,ref:"Order"},
    rating: { type: Number, required: true },
    review: { type: String, required: true },
  },
  { timestamps: true }
);

const RatingAndReview = mongoose.model(
  "RatingAndReview",
  ratingAndReviewSchema
);

export { RatingAndReview };
