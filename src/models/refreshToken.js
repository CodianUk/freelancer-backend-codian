import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
},{timestamps:true});

RefreshTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30,  });

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);
export default RefreshToken;
