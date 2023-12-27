import mongoose from "mongoose";
import NOTFOUND from "../errors/notFound.js";
import { JobRequest } from "../models/jobRequest.js";
import { ProjectRoles } from "../models/projectRoles.js";
import { Startup } from "../models/startup.js";
import { User } from "../models/user.js";
import BadRequest from "../errors/badRequest.js";

const ObjectIdMaker = (id) => {
  return mongoose.Types.ObjectId(id);
};
// GET ALL Available Jobs
// if category is provided in the params will give filtered result
const getAllAvailableJobs = async (req, res, next) => {
  try {
    let category = req.body.category;
    let aggrPipeLine = [
      {
        $lookup: {
          from: "startups",
          localField: "startupid",
          foreignField: "_id",
          as: "startup",
        },
      },
      {
        $unwind: {
          path: "$startup",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$roles",
          preserveNullAndEmptyArrays: true,
        },
      },
      // ... Other pipeline stages ...

      // Include only the 'businessName' and 'budget' fields from the startup
      {
        $project: {
          _id: 0,
          startupid: 1,
          role: {
            _id: "$roles._id",
            position: "$roles.title",
            description: "$roles.description",
            type: "$roles.type",
            postedOn: "$roles.createdAt",
          },
          "startup.businessName": 1,
          "startup.budget": 1,
          "startup.stage" : 1,
          "startup.category" : 1,
          "startup.logo" : 1,
          "startup.location" : 1,
          "startup.promoMedia" : 1
        },
      },
    ];

    if (category) {
      aggrPipeLine.push({
        $match: {
          // Case-insensitive search
          "roles.title": { $regex: category, $options: "i" },
        },
      });
    }

    // ... The rest of your pipeline ...

    let aggCursor = await ProjectRoles.aggregate(aggrPipeLine);
    let categories = [];
    if (aggCursor.length > 0) {
      // Get positions into an array from roles array without duplicates
      categories = [...new Set(aggCursor.map((item) => item.role.position))];
    }

    if (aggCursor) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({
          status: "OK",
          data:
            aggCursor.length > 0
              ? { aggCursor, categories }
              : { aggCursor: [], categories: [] },
        });
    }
  } catch (err) {
    next(err);
  }
};



// ========= SPECIFIC JOB =================================//

//requires----> startUpId(in Params) -- JobId(In Params)
const getJobById = async (req, res, next) => {
  try {
    if (!req.body.jobId && !req.body.startupId) {
      return next(new BadRequest("JobId and StartupId are required"));
    }
    let startupId = ObjectIdMaker(req.body.startupId);
    let roleId = ObjectIdMaker(req.body.roleId);
    let job = await ProjectRoles.findOne(
      { startupid: startupId, "roles._id": roleId },
      { _id: 0, startupid: 1, roles: { $elemMatch: { _id: roleId } } }
    );
    if (job) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: job });
    }
    let err = new NOTFOUND("No such Job exsists!");
    return next(err);
  } catch (err) {
    next(err);
  }
};

//requires----> userId(FreelancersId) -- jobData(In Body)
const applyToAvaialbelJob = async (req, res, next) => {
  try {
    if (!req.body.jobId && !req.body.startupId) {
      return next(new BadRequest("JobId and StartupId are required"));
    }

    console.log(req.user);

    // let _id = ObjectIdMaker(req.user._id);
    let email = req.user._id;
    let startupId = ObjectIdMaker(req.body.startupId);
    let roleId = ObjectIdMaker(req.body.roleId);

    let appliedResponse = await JobRequest.findOne({startupid: startupId, roleId: roleId});
    if (appliedResponse) {
      let already =  appliedResponse.usersWhoHaveApplied.some(request => request == email)
      if(already){
        return next(new BadRequest("You have already applied to this job"));
      }
      else {
        const updatedReq = await JobRequest.updateOne({
          startupid: startupId,
          roleId: roleId,
        },{
          $push:{
            usersWhoHaveApplied: email
        }
        
        })
        if (updatedReq) {
          return res
            .status(200)
            .setHeader("Content-Type", "application/json")
            .json({ status: "Succesfully Applied for job" });
        }

      }
    }
    
    



    let aggCursor = await ProjectRoles.aggregate([
      {
        $match: {
          startupid: startupId,
        },
      },
      {
        $unwind: {
          path: "$roles",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "roles._id": roleId,
        },
      },
    ]);
    if (aggCursor.length === 0) {
      let err = new NOTFOUND("No such Job exsists!");
      return next(err);
    }
    let applied = await JobRequest.findOne({
      startupid: startupId,
      // freelancerId: _id,
      roleId: roleId,
    });
    let title = aggCursor[0].roles.title;
    if (applied) {
      return next(new BadRequest("You have already applied to this job"));
    }
    let newRequest = await JobRequest.create({
      startupid: startupId,
      // freelancerId: _id,
      position: title,
      roleId: roleId,
    });
    const updatedReq = await JobRequest.updateOne({
      startupid: startupId,
      position: title,
      roleId: roleId,
    },{
      $push:{
        usersWhoHaveApplied: email
    }
    
    })
    // let response = await newRequest.save({ validateBeforeSave: true });
    if (updatedReq) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "Successfully Applied for job" });
    }
    let err = new NOTFOUND("No such Job exsists!");
    return next(err);
  } catch (err) {
    next(err);
  }
};



//================= RELATED JOB MANAGEMENT

//================= STARTUP JOB MANAGEMENT

const getStartupJobs = async (req, res, next) => {
  //
  let jobRequests;
  // 
  let FormatedResponse = [];
  try {
    let { startupid } = req.body;
    if (!startupid) {
      return next(new BadRequest("StartupId is required"));
    }
    let allStartupIds = await Startup.find({ userid: req.user._id }).select(
      "_id"
    );
    if (allStartupIds.length === 0) {
      return res.status(200).json({ status: "OK", data: [] });
    }
    jobRequests = await JobRequest.find({
      startupid: { $in: allStartupIds },
    })
      .populate("freelancerId", "jobTitle")
      .populate("startupid", "businessName");

    if (jobRequests.length > 0) {
      new Promise((resolve, reject) => {
        jobRequests.forEach(async (job) => {
          let tempJob = job.toObject();
          let freelancer = await User.findById(tempJob.freelancerId._id).select(
            "_id name avatar"
          );
          tempJob.startup = {
            _id: tempJob.startupid._id,
            name: tempJob.startupid.businessName,
            position: tempJob.position,
          };
          tempJob.freelancer = {
            _id: freelancer._id,
            name: freelancer.name,
            avatar: freelancer.avatar,
            JobTitle: tempJob.freelancerId.jobTitle,
          };
          tempJob.appliedOn = tempJob.createdAt;
          delete tempJob.startupid;
          delete tempJob.freelancerId;
          delete tempJob.roleId;
          delete tempJob.position;
          delete tempJob.createdAt;
          delete tempJob.updatedAt;
          delete tempJob.__v;
          FormatedResponse.push(tempJob);
          if (FormatedResponse.length === jobRequests.length) {
            resolve();
          }
        });
      }).then(() => {
        return res
          .status(200)
          .setHeader("Content-Type", "application/json")
          .json({ status: "OK", data: FormatedResponse });
      });
    } else {
      return res.status(200).json({ status: "OK", data: [] });
    }
  } catch (err) {
    next(err);
  }
};


// Controller function to get freelancers who have applied for a job
const getJobsAppliedByFreelancer = async (req, res, next) => {
  try {
    const freelancerId = req.user._id; // The freelancer's ID
    // Find all job requests where the freelancerId is in the usersWhoHaveApplied array
    const jobsAppliedFor = await JobRequest.find({
      usersWhoHaveApplied: freelancerId,
    }).populate({
      path: 'startupid', // Populate the 'startupid' field
      model: 'Startup', // Model to populate from
    }).populate({
      path: 'usersWhoHaveApplied',
      model: 'User', // Model to populate from (User model)
      select: '_id avatar', // Select only the _id and avatar fields
    });

    return res.status(200).json({ status: 'OK', data: jobsAppliedFor });
  } catch (err) {
    next(err);
  }
};



export default {
  getAllAvailableJobs,
  getJobById,
  getJobsAppliedByFreelancer,
  applyToAvaialbelJob,
  getStartupJobs,
};
