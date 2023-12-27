import { Like } from "../models/like.js";

const LikeNew = async (req, res, next) => {
  try {
    let { userId } = req.body;
    let _id = req.user._id;
    let role = req.user.role;

    let userLikes = await Like.findOne({ userId: _id });

    if (!userLikes) {
      let newLikeObject = new Like({
        userId: _id,
        MONGODBREF: role === "Freelancer" ? "Startup" : "Freelancer",
      });
      userLikes = await newLikeObject.save({ validateBeforeSave: true });
    }

    if (userLikes.liked.includes(userId)) {
      userLikes.liked = userLikes.liked.filter(
        (freelancer) => freelancer != userId
      );
    } else {
      userLikes.liked.push(userId);
    }

    let response = await userLikes.save({ validateBeforeSave: true });

    return res.status(200).json({ status: "OK", data: response });
  } catch (err) {
    return next(err);
  }
};

const getLiked = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let role = req.user.role;

    let Liked = await Like.find({ userId: _id });

    

    console.log(Liked);

    return res.status(200).json({ status: "OK", data: Liked });
  } catch (err) {
    return next(err);
  }
};

export default {
  LikeNew,
  getLiked,
};
