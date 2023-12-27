import mongoose from "mongoose";
import { Freelancer } from "../models/freelancer.js";
import { User } from "../models/user.js";
import NOTFOUND from "../errors/notFound.js";
import BadRequest from "../errors/badRequest.js";
import UnAuthorized from "../errors/unAuthorized.js";
import crypto from "crypto";
import { Like } from "../models/like.js";
import { earned } from "../models/earned.js";

// @import Redis
import Redis from "ioredis";
const redisClient = new Redis(process.env.REDIS_URL);

// crypto
const algorithm = "aes-256-ctr";
const initVector = process.env.CRYPTO_INIT_VECTOR;
const key = process.env.CRYPTO_ENCRIPTION_KEY;

// ============= HELPER FUNCTIONS =============================//

const userExsistance = (userId) => {
  return new Promise(async (resolve, reject) => {
    let user = await User.findById(userId);
    if (!user) {
      return reject("User not Found");
    }
    return resolve(user);
  });
};

const freelancerExsistance = async (userId) => {
  let freelancer = await Freelancer.findById(userId);
  return freelancer;
};

const encrypt = (text) => {
  let cipher = crypto.createCipheriv(algorithm, key, initVector);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString("hex");
};

const decrypt = (hash) => {
  // let iv = Buffer.from(initVector, 'hex');
  let iv = initVector;
  let encryptedText = Buffer.from(hash, "hex");
  let decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// ============= ONBOARDING =============================//
// const onboarding = async (req, res, next) => {
//   try {
//     let _id = req.user._id;
//     let freelancer = await freelancerExsistance(_id);
//     let response;

//     if (freelancer) {
//       if (freelancer.onboarding === true) {
//         return next(
//           new BadRequest("You have already completed the onboarding process")
//         );
//       } else {
//         response = await Freelancer.findByIdAndUpdate(
//           _id,
//           { ...req.body },
//           { new: true }
//         );
//       }
//     } else {
//       let encryptedData = encrypt(_id.toString());

//       let step = new Freelancer({
//         _id,
//         ...req.body,
//         url: "freelancer/byUrl/" + encryptedData,
//       });
//       step.onboarding = true;

//       let userResponse = await User.findByIdAndUpdate(
//         _id,
//         { avatar: req.body.image },
//         { new: true }
//       );

//       let responseFreelancer = await step.save({
//         validateBeforeSave: true,
//         new: true,
//       });

//       response = { ...responseFreelancer._doc, ...userResponse.avatar };
//     }
//     if (response) {
//       return res
//         .status(201)
//         .setHeader("Content-Type", "application/json")
//         .json({ status: "OK", data: response });
//     }
//   } catch (err) {
//     return next(err);
//   }
// };

const onboarding = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let freelancer = await freelancerExsistance(_id);
    let response;
    if (freelancer) {
      if (freelancer.onboarding === true || freelancer.startupOnboarding === true) {
        return next(
          new BadRequest("You have already completed the onboarding process")
        );
      } else {
        // Check userType and update the corresponding onboarding field
        if (freelancer.userType === "Freelancer") {
          freelancer.onboarding = true;
        } else if (freelancer.userType === "StartupOwner") {
          freelancer.startupOnboarding = true;
        }

        response = await freelancer.save({ new: true });
      }
    } else {
      let encryptedData = encrypt(_id.toString());

      let step = new Freelancer({
        _id,
        ...req.body,
        url: "freelancer/byUrl/" + encryptedData,
      });

      // Check userType and set the corresponding onboarding field
      if (step.userType === "Freelancer") {
        step.onboarding = true;
      } else if (step.userType === "StartupOwner") {
        step.startupOnboarding = true;
      }

      let userResponse = await User.findByIdAndUpdate(
        _id,
        { avatar: req.body.image },
        { new: true }
      );

      let responseFreelancer = await step.save({
        validateBeforeSave: true,
        new: true,
      });

      response = { ...responseFreelancer._doc, ...userResponse.avatar };
    }

    if (response) {
      return res
        .status(201)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
  } catch (err) {
    return next(err);
  }
};


const ObjectIdMaker = (id) => {
  return mongoose.Types.ObjectId(id);
};

// ============= PROFILE AS A WHOLE =============================//

const getFreelancersProfile = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let response = null;
    let aggCursor = await Freelancer.aggregate([
      {
        $match: {
          _id: _id,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "ratingandreviews",
          localField: "_id",
          foreignField: "freelancerId",
          as: "ratingAndReviews",
        },
      },
      {
        $unwind: {
          path: "$ratingAndReviews",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "ratingAndReviews.reviewBy",
          foreignField: "_id",
          as: "reviewGiverData",
        },
      },
      {
        $unwind: {
          path: "$reviewGiverData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          services: {
            description: "$description",
            skills: "$skills",
            hourlyRate: "$hourlyRate",
            roleType: "$roleType", // Add roleType
            hoursPerWeek: "$hoursPerWeek", // Add hoursPerWeek
            businessDetails: "$businessDetails", // Add businessDetails
          },
          about: {
            joinedData: "$userData.createdAt",
            lastActive: "50",
            language: "$language",
            responseTime: "50",
            availability: "$availability",
            workPreference: "$workPreference", // Corrected typo in the field name
            country: "$country",
            city: "$city",
            jobTitle: "$jobTitle",
            accountActive: "$accountActive",
            aboutMe: "$aboutMe",
            availibilityPerWeek : "$availibilityPerWeek",
            jobRole : "$jobRole"
          },
          userInfo: {
            email: "$userData.email",
            avatar: "$userData.avatar",
            phoneNumber: "$userData.phoneNumber",
            role: "$userData.role",
            name: "$userData.name",
            gender: "$gender",
            onboarding: "$onboarding",
            rating: "$rating",
            url: "$url",
          },
          portfolio: "$portfolio",
          ratingAndReviews: {
            avatar: "$reviewGiverData.avatar",
            name: "$reviewGiverData.name",
            time: "$ratingAndReviews.createdAt",
            rating: "$ratingAndReviews.rating",
            review: "$ratingAndReviews.review",
            orderId: "$ratingAndReviews.orderId",
            reviewBy: "$ratingAndReviews.reviewBy",
            clientId: "$ratingAndReviews.clientId",
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          userInfo: { $first: "$userInfo" },
          about: { $first: "$about" },
          services: { $first: "$services" },
          portfolio: { $first: "$portfolio" },
          ratingAndReviews: { $push: "$ratingAndReviews" },
        },
      },
      {
        $project: {
          userInfo: 1,
          about: 1,
          services: 1,
          portfolio: 1,
          ratingAndReviews: {
            $cond: {
              if: { $eq: ["$ratingAndReviews", [{}]] },
              then: [],
              else: "$ratingAndReviews",
            },
          },
        },
      },
    ]);

    if (aggCursor.length === 0) {
      return res
        .status(404)
        .setHeader("Content-Type", "application/json")
        .json({ status: "Error", data: { userInfo: { onboarding: false }}});
    }

    response = aggCursor[0];

    if (response) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }

    return res
      .status(404)
      .setHeader("Content-Type", "application/json")
      .json({ status: "Error", data: { userInfo: { onboarding: false } }});
  } catch (err) {
    next(err);
  }
};


// const getFreelancersProfile = async (req, res, next) => {
//   try {
//     let _id = ObjectIdMaker(req.user._id);
//     let response = null;
//       let aggCursor = await Freelancer.aggregate([
//         {
//           $match: {
//             _id: _id,
//           },
//         },
//         {
//           $lookup: {
//             from: "users",
//             localField: "_id",
//             foreignField: "_id",
//             as: "userData",
//           },
//         },
//         {
//           $unwind: {
//             path: "$userData",
//             preserveNullAndEmptyArrays: false,
//           },
//         },
//         {
//           $lookup: {
//             from: "ratingandreviews",
//             localField: "_id",
//             foreignField: "freelancerId",
//             as: "ratingAndReviews",
//           },
//         },
//         {
//           $unwind: {
//             path: "$ratingAndReviews",
//             preserveNullAndEmptyArrays: true,
//           },
//         },
//         {
//           $lookup: {
//             from: "users",
//             localField: "ratingAndReviews.reviewBy",
//             foreignField: "_id",
//             as: "reviewGiverData",
//           },
//         },
//         {
//           $unwind: {
//             path: "$reviewGiverData",
//             preserveNullAndEmptyArrays: true,
//           },
//         },
//         {
//           $set: {
//             services: {
//               description: "$description",
//               skills: "$skills",
//               hourlyRate: "$hourlyRate",
//               roleType: "$roleType", // Add roleType
//               hoursPerWeek: "$hoursPerWeek", // Add hoursPerWeek
//               businessDetails: "$businessDetails", // Add businessDetails
//             },
//             about: {
//               joinedData: "$userData.createdAt",
//               lastActive: "50",
//               language: "$language",
//               responseTime: "50",
//               availability: "$availability",
//               workPreference: "$workPrefrence",
//               country: "$country",
//               city: "$city",
//               jobTitle: "$jobTitle",
//               accountActive: "$accountActive",
//               aboutMe: "$aboutMe",
//             },
//             userInfo: {
//               email: "$userData.email",
//               avatar: "$userData.avatar",
//               phoneNumber: "$userData.phoneNumber",
//               role: "$userData.role",
//               name: "$userData.name",
//               gender: "$gender",
//               onboarding: "$onboarding",
//               rating: "$rating",
//               url: "$url",
//             },
//             portfolio: "$portfolio",
//             ratingAndReviews: {
//               avatar: "$reviewGiverData.avatar",
//               name: "$reviewGiverData.name",
//               time: "$ratingAndReviews.createdAt",
//               rating: "$ratingAndReviews.rating",
//               review: "$ratingAndReviews.review",
//               orderId: "$ratingAndReviews.orderId",
//               reviewBy: "$ratingAndReviews.reviewBy",
//               clientId: "$ratingAndReviews.clientId",
//             },
//           },
//         },
//         {
//           $group: {
//             _id: "$_id",
//             userInfo: { $first: "$userInfo" },
//             about: { $first: "$about" },
//             services: { $first: "$services" },
//             portfolio: { $first: "$portfolio" },
//             ratingAndReviews: { $push: "$ratingAndReviews" },
//           },
//         },
//         {
//           $project: {
//             userInfo: 1,
//             about: 1,
//             services: 1,
//             portfolio: 1,
//             ratingAndReviews: {
//               $cond: {
//                 if: { $eq: ["$ratingAndReviews", [{}]] },
//                 then: [],
//                 else: "$ratingAndReviews",
//               },
//             },
//           },
//         },
//       ]);
//       if (aggCursor.length === 0) {
//         return res
//           .status(404)
//           .setHeader("Content-Type", "application/json")
//           .json({ status: "Error", data: { userInfo: { onboarding: false } } });
//       }
//       response = aggCursor[0];
//     if (response) {
//       return res
//         .status(200)
//         .setHeader("Content-Type", "application/json")
//         .json({ status: "OK", data: response });
//     }

//     return res
//       .status(404)
//       .setHeader("Content-Type", "application/json")
//       .json({ status: "Error", data: { userInfo: { onboarding: false } } });
//   } catch (err) {
//     next(err);
//   }
// };

// ============= SERVICES =============================//

const editProfileServices = async (req, res, next) => {
  try {
    let _id = req.user._id;

    //set redis key
    const redisKey = `freelancerProfile:${_id}`;

    if (Object.keys(req.body).length === 0) {
      return next(new BadRequest("No data provided"));
    }
    let response = await Freelancer.findByIdAndUpdate(
      _id,
      {
        ...req.body,
      },
      { new: true }
    );
    if (response) {
      //get redis key
      await redisClient.del(redisKey);

      return res
        .status(201)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    } else {
      let err = new UnAuthorized(
        "You are not authorized to perform this operation"
      );
      return next(err);
    }
  } catch (err) {
    next(err);
  }
};

// ============= PORTFOLIO =============================//

const addProfilePortfolio = async (req, res, next) => {
  let _id = req.user._id;
  let { title, description, attachments } = req.body;
  try {
    //set redis key
    const redisKey = `freelancerProfile:${_id}`;
    let response = await Freelancer.findByIdAndUpdate(
      { _id, _id },
      {
        $push: {
          portfolio: {
            title: title,
            description: description,
            attachments: attachments,
          },
        },
      },
      { new: true }
    );
    if (response) {
      //delete redis key
      await redisClient.del(redisKey);

      return res
        .status(201)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    } else {
      let err = new UnAuthorized(
        "You are not authorized to perform this operation"
      );
      return next(err);
    }
  } catch (err) {
    next(err);
  }
};

//========= FOR A SPECIFIC PORTFOLIO

const getPortfolioById = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let portfolioId = req.body.portfolioId;
    let portfolio = null;
    //set redis key
    const redisKey = `freelancerProfile:${_id}`;
    //check if data is in redis
    let redisData = await redisClient.get(redisKey);
    if (redisData) {
      redisData = JSON.parse(redisData);
      for (let i = 0; i < redisData.portfolio.length; i++) {
        if (redisData.portfolio[i]._id == portfolioId) {
          portfolio = redisData.portfolio[i];
          break;
        }
      }
    } else {
      let responseProtfolio = await Freelancer.findOne(
        { _id: _id, "portfolio._id": portfolioId },
        { _id: 0, portfolio: { $elemMatch: { _id: portfolioId } } }
      );
      portfolio = responseProtfolio.portfolio;
    }
    if (portfolio) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: portfolio });
    } else {
      let err = new NOTFOUND("No Such Portfolio found");
      return next(err);
    }
  } catch (err) {
    next(err);
  }
};

const editPortfolioById = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let { portfolioId, ...toStore } = req.body;

    let response = await Freelancer.findOneAndUpdate(
      { _id: _id, portfolio: { $elemMatch: { _id: portfolioId } } },
      {
        $set: {
          "portfolio.$.title": toStore.title,
          "portfolio.$.description": toStore.description,
          "portfolio.$.attachments": toStore.attachments,
        },
      },
      { new: true, findAndModify: false }
    );

    if (response) {
      //set redis key
      const redisKey = `freelancerProfile:${_id}`;
      //delete data from redis
      await redisClient.del(redisKey);

      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response.portfolio });
    }
    let err = new NOTFOUND("No such portfolio found");
    return next(err);
  } catch (err) {
    next(err);
  }
};

const deletePortfolioById = async (req, res, next) => {
  let _id = req.user._id;
  let portfolioId = req.body.portfolioId;
  try {
    let response = await Freelancer.findOneAndUpdate(
      { _id: _id, portfolio: { $elemMatch: { _id: portfolioId } } },
      { $pull: { portfolio: { _id: portfolioId } } },
      { upsert: false, new: true, useFindAndModify: false }
    );
    if (response) {
      //set redis key
      const redisKey = `freelancerProfile:${_id}`;
      //delete data from redis
      await redisClient.del(redisKey);

      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
    let err = new NOTFOUND("No Such portfolio found");
    return next(err);
  } catch (err) {
    next(err);
  }
};

//=============================== GET FREELANCER THROUGH URL========================
const getFreelancerByURL = async (req, res, next) => {
  try {
    let hash = req.params.id;
    let id = decrypt(hash);
    let freelancerId = ObjectIdMaker(id);
    let response = null;
    //set redis key
    const redisKey = `freelancerProfile:${id}`;
    //check if data is in redis
    let redisData = await redisClient.get(redisKey);
    if (redisData) {
      response = redisData;
    } else {
      let aggCursor = await Freelancer.aggregate([
        {
          $match: {
            _id: freelancerId,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userData",
          },
        },
        {
          $unwind: {
            path: "$userData",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "ratingandreviews",
            localField: "_id",
            foreignField: "freelancerId",
            as: "ratingAndReviews",
          },
        },
        {
          $unwind: {
            path: "$ratingAndReviews",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "ratingAndReviews.reviewBy",
            foreignField: "_id",
            as: "reviewGiverData",
          },
        },
        {
          $unwind: {
            path: "$reviewGiverData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            services: {
              description: "$description",
              skills: "$skills",
              hourlyRate: "$hourlyRate",
            },
            about: {
              joinedData: "$userData.createdAt",
              lastActive: "50",
              language: "$language",
              responseTime: "50",
              availability: "$availability",
              workPreference: "$workPrefrence",
              country: "$country",
              city: "$city",
              jobTitle: "$jobTitle",
              accountActive: "$accountActive",
              aboutMe: "$aboutMe",
            },
            userInfo: {
              email: "$userData.email",
              avatar: "$userData.avatar",
              phoneNumber: "$userData.phoneNumber",
              role: "$userData.role",
              name: "$userData.name",
              gender: "$gender",
              onboarding: "$onboarding",
              rating: "$rating",
              url: "$url",
            },
            portfolio: "$portfolio",
            ratingAndReviews: {
              avatar: "$reviewGiverData.avatar",
              name: "$reviewGiverData.name",
              time: "$ratingAndReviews.createdAt",
              rating: "$ratingAndReviews.rating",
              review: "$ratingAndReviews.review",
              orderId: "$ratingAndReviews.orderId",
              reviewBy: "$ratingAndReviews.reviewBy",
              clientId: "$ratingAndReviews.clientId",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            userInfo: { $first: "$userInfo" },
            about: { $first: "$about" },
            services: { $first: "$services" },
            portfolio: { $first: "$portfolio" },
            ratingAndReviews: { $push: "$ratingAndReviews" },
          },
        },
        {
          $project: {
            userInfo: 1,
            about: 1,
            services: 1,
            portfolio: 1,
            ratingAndReviews: {
              $cond: {
                if: { $eq: ["$ratingAndReviews", [{}]] },
                then: [],
                else: "$ratingAndReviews",
              },
            },
          },
        },
      ]);

      if (aggCursor.length === 0) {
        return next(new NOTFOUND("Freelancer not found"));
      }
      response = aggCursor[0];
      //set data in redis
      await redisClient.set(
        redisKey,
        JSON.stringify(response),
        "EX",
        60 * 60 * 24
      );
    }
    if (response) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
    return next(new NOTFOUND("Freelancer not found"));
  } catch (err) {
    return next(err);
  }
};

// ==================== FUNDS CLEARED ===========================
const getFundsCleared = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    let pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    };

    let _id = ObjectIdMaker(req.user._id);
    let response = await earned.aggregate([
      {
        $match: {
          $and: [{ userId: _id }, { status: "released" }],
        },
      },
      {
        $facet: {
          metaData: [
            {
              $count: "total",
            },
            {
              $addFields: {
                page: pagination.page,
              },
            },
          ],
          clearedFunds: [
            {
              $sort: {
                updatedAt: -1,
              },
            },
            {
              $skip: (pagination.page - 1) * pagination.limit,
            },
            {
              $limit: pagination.limit,
            },
            {
              $lookup: {
                from: "onetimeorders",
                localField: "orderId",
                foreignField: "_id",
                as: "orderData",
              },
            },
            {
              $unwind: {
                path: "$orderData",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $project: {
                orderId: "$orderData._id",
                orderTitle: "$orderData.jobTitle",
                orderAmount: "$orderData.totalPrice",
                clearedOn: "$updatedAt",
              },
            },
          ],
        },
      },
    ]);

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: response[0] });
  } catch (err) {
    next(err);
  }
};

// ======================= ABOUT ===============================

const editProfileAboutMe = async (req, res, next) => {
  try {
    let _id = req.user._id;
    let {
      name,
      jobTitle,
      city,
      country,
      language,
      hourlyRate,
      aboutMe,
      avatar,
      workType,
      latNLong,
      roleType,
      skills,
      description,
      hoursPerWeek,
      businessDetails
    } = req.body;
    let response = await Freelancer.findByIdAndUpdate(
      _id,
      {
        jobTitle,
        city,
        country,
        language,
        hoursPerWeek,
        description,
        businessDetails,
        skills,
        roleType,
        hourlyRate,
        aboutMe,
        workType,
        latNLong
      },
      { new: true }
    );
    if (response) {
      let newResponse = null;
      let avatarResponse = await User.findByIdAndUpdate(
        _id,
        { name: name, avatar: avatar },
        { new: true }
      );
      if (avatarResponse) {
        newResponse = {
          ...response._doc,
          avatar: avatarResponse.avatar,
          name: avatarResponse.name,
        };
      } else {
        return next(new Error("Something went wrong"));
      }

      //set redis key
      // const redisKey = `freelancerProfile:${_id}`;
      //delete data from redis
      // await redisClient.del(redisKey);

      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: newResponse });
    } else {
      let err = new UnAuthorized(
        "You are not authorized to perform this operation"
      );
      return next(err);
    }
  } catch (err) {
    next(err);
  }
};

const viewAllFreelancers = async (req, res, next) => {
  try {
    const { page, limit, type = "all", category = null } = req.body;

    let pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    };

    let _id = null;
    if (req.user) {
      _id = ObjectIdMaker(req.user._id);
    }

    //this pipeleine is same for all types
    const paginatedPipeLine = [
      {
        $skip: (pagination.page - 1) * pagination.limit,
      },
      {
        $limit: pagination.limit,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $unwind: {
          path: "$users",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          name: "$users.name",
          avatar: "$users.avatar",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          avatar: 1,
          jobTitle: 1,
          rating: 1,
          hourlyRate: 1,
          workPreference: 1,
          latNLong: 1,
          location: 1,
          workType : 1,
          category : 1,
          subCategory : 1
        },
      },
    ];

    let filterStagePipeLine = [];
    //filter stage in case you send skills to filter from
    if (category) {
      let filterStage = {
        $match: {
          category: category,
        },
      };
      filterStagePipeLine.push(filterStage);
    }

    const firstStage = [];

    //aggCursor
    let aggCursor = [];
    let empty = {
      total: 0,
      page: pagination.page,
      totalPage: 0,
      limit: pagination.limit,
    };

    if (type === "all") {
      let allResponse = await Freelancer.aggregate([
        ...filterStagePipeLine,
        {
          $facet: {
            popularMetaData: [
              {
                $sort: {
                  rating: -1,
                },
              },

              {
                $count: "total",
              },
              {
                $addFields: {
                  page: pagination.page,
                  totalPage: {
                    $ceil: {
                      $divide: ["$total", pagination.limit],
                    },
                  },
                  limit: pagination.limit,
                },
              },
            ],
            popular: [
              {
                $sort: {
                  rating: -1,
                },
              },
              ...paginatedPipeLine,
            ],
            fixedMetaData: [
              {
                $sort: {
                  hourlyRate: 1,
                },
              },
              {
                $count: "total",
              },
              {
                $addFields: {
                  page: pagination.page,
                  totalPage: {
                    $ceil: {
                      $divide: ["$total", pagination.limit],
                    },
                  },
                  limit: pagination.limit,
                },
              },
            ],
            fixedRate: [
              {
                $sort: {
                  hourlyRate: 1,
                },
              },
              ...paginatedPipeLine,
            ],
            equityMetaData: [
              {
                $match: {
                  $or: [
                    { workPreference: "Equity" },
                    { workPreference: "Both" },
                  ],
                },
              },

              {
                $count: "total",
              },
              {
                $addFields: {
                  page: pagination.page,
                  totalPage: {
                    $ceil: {
                      $divide: ["$total", pagination.limit],
                    },
                  },
                  limit: pagination.limit,
                },
              },
            ],
            equity: [
              {
                $match: {
                  $or: [
                    { workPreference: "Equity" },
                    { workPreference: "Both" },
                  ],
                },
              },
              ...paginatedPipeLine,
            ],
          },
        },
      ]);

      if (allResponse[0].popularMetaData.length === 0) {
        allResponse[0].popularMetaData = [empty];
      }
      if (allResponse[0].equityMetaData.length === 0) {
        allResponse[0].equityMetaData = [empty];
      }
      if (allResponse[0].fixedMetaData.length === 0) {
        allResponse[0].fixedMetaData = [empty];
      }

      return res.status(200).json({
        status: "OK",
        data: allResponse[0],
      });
    } else if (type === "fixedRate") {
      firstStage.push(...filterStagePipeLine, {
        $sort: {
          hourlyRate: 1,
        },
      });
    } else if (type === "equity") {
      firstStage.push(
        ...filterStagePipeLine,
        {
          $match: {
            $or: [{ workPreference: "Equity" }, { workPreference: "Both" }],
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        }
      );
    } else if (type === "popular") {
      firstStage.push(...filterStagePipeLine, {
        $sort: {
          rating: -1,
        },
      });
    } else {
      firstStage.push(...filterStagePipeLine, {
        $sort: {
          createdAt: -1,
        },
      });
    }

    aggCursor.push(...paginatedPipeLine);
    let aggResponse = await Freelancer.aggregate([
      ...firstStage,
      {
        $facet: {
          metaData: [
            {
              $count: "total",
            },
            {
              $addFields: {
                page: pagination.page,
                totalPage: {
                  $ceil: {
                    $divide: ["$total", pagination.limit],
                  },
                },
                limit: pagination.limit,
              },
            },
          ],
          freelancers: aggCursor,
        },
      },
    ]);

    if (req.user) {
      let likes = await Like.findOne({ userId: _id });

      if (likes) {
        aggResponse[0].freelancers = aggResponse[0].freelancers.map((item) => {
          if (likes.liked.includes(item._id)) {
            return { ...item, liked: true };
          }
          return { ...item, liked: false };
        });
      } else {
        aggResponse[0].freelancers = aggResponse[0].freelancers.map((item) => {
          return { ...item, liked: false };
        });
      }
    } else {
      aggResponse[0].freelancers = aggResponse[0].freelancers.map((item) => {
        return { ...item, liked: null };
      });
    }
    if (aggResponse[0].metaData.length === 0) {
      aggResponse[0].metaData = [empty];
    }
    if (aggResponse) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({
          status: "OK",
          data: aggResponse.length > 0 ? aggResponse : [],
        });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};

const getFreelancerById = async (req, res, next) => {
  try {
    let _id = req.body.freelancerId;
    console.log(_id);
    if (!_id) {
      return next(new BadRequest("Freelancer's Id is required"));
    }
    let response = null;
    //set redis key
    // const redisKey = `freelancerProfile:${_id}`;
    //get data from redis
    // let redisData = await redisClient.get(redisKey);
    // if (redisData) {
    //   response = JSON.parse(redisData);
    // } else {
      _id = ObjectIdMaker(_id);
      let aggCursor = await Freelancer.aggregate([
        {
          $match: {
            _id: _id,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userData",
          },
        },
        {
          $unwind: {
            path: "$userData",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "ratingandreviews",
            localField: "_id",
            foreignField: "freelancerId",
            as: "ratingAndReviews",
          },
        },
        {
          $unwind: {
            path: "$ratingAndReviews",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "ratingAndReviews.reviewBy",
            foreignField: "_id",
            as: "reviewGiverData",
          },
        },
        {
          $unwind: {
            path: "$reviewGiverData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            services: {
              description: "$description",
              skills: "$skills",
              hourlyRate: "$hourlyRate",
            },
            about: {
              joinedData: "$userData.createdAt",
              lastActive: "50",
              language: "$language",
              responseTime: "50",
              availability: "$availability",
              workPreference: "$workPrefrence",
              country: "$country",
              city: "$city",
              jobTitle: "$jobTitle",
              accountActive: "$accountActive",
              aboutMe: "$aboutMe",
            },
            userInfo: {
              email: "$userData.email",
              avatar: "$userData.avatar",
              phoneNumber: "$userData.phoneNumber",
              role: "$userData.role",
              name: "$userData.name",
              gender: "$gender",
              onboarding: "$onboarding",
              rating: "$rating",
              url: "$url",
            },
            portfolio: "$portfolio",
            ratingAndReviews: {
              avatar: "$reviewGiverData.avatar",
              name: "$reviewGiverData.name",
              time: "$ratingAndReviews.createdAt",
              rating: "$ratingAndReviews.rating",
              review: "$ratingAndReviews.review",
              orderId: "$ratingAndReviews.orderId",
              reviewBy: "$ratingAndReviews.reviewBy",
              clientId: "$ratingAndReviews.clientId",
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            userInfo: { $first: "$userInfo" },
            about: { $first: "$about" },
            services: { $first: "$services" },
            portfolio: { $first: "$portfolio" },
            ratingAndReviews: { $push: "$ratingAndReviews" },
          },
        },
        {
          $project: {
            userInfo: 1,
            about: 1,
            services: 1,
            portfolio: 1,
            ratingAndReviews: {
              $cond: {
                if: { $eq: ["$ratingAndReviews", [{}]] },
                then: [],
                else: "$ratingAndReviews",
              },
            },
          },
        },
      ]);

      if (aggCursor.length === 0) {
        return next(new NOTFOUND("Freelancer not found"));
      }

      response = aggCursor[0];
      //set data to redis
      // await redisClient.set(
      //   redisKey,
      //   JSON.stringify(response),
      //   "EX",
      //   60 * 60 * 24
      // );
    // }
    if (response) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
    return next(new NOTFOUND("Freelancer not found"));
  } catch (err) {
    next(err);
  }
};

const findFreelancerByName = async (req, res, next) => {
  try {
    let name = req.body.name;
    if (!name) {
      return next(new BadRequest("Name is required"));
    }
    let aggCursor = await User.aggregate([
      {
        $match: {
          name: {
            $regex: `^${name}`,
            $options: "i",
          },
        },
      },
      {
        $lookup: {
          from: "freelancers",
          localField: "_id",
          foreignField: "_id",
          as: "freelancerData",
        },
      },
      {
        $unwind: {
          path: "$freelancerData",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          _id: 1,
          name: 1,
          avatar: 1,
        },
      },
    ]);

    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: aggCursor });
  } catch (err) {
    return next(err);
  }
};

export default {
  onboarding,
  getFreelancersProfile,
  editProfileServices,
  addProfilePortfolio,
  getPortfolioById,
  editPortfolioById,
  deletePortfolioById,
  editProfileAboutMe,
  viewAllFreelancers,
  getFreelancerById,
  findFreelancerByName,
  getFreelancerByURL,
  getFundsCleared,
};
