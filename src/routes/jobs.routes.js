import { Router } from "express";
import { accessTokenVerify, freelancer, startup } from "../middleware/authentication.js";
import Controller from "../controllers/jobController.js";

const router = Router();

// @Route   GET /jobs/availableJobs
// @desc    returns all available jobs (that are roles opened by startup)
router
  .route("/availableJobs")
  .get(accessTokenVerify,freelancer, Controller.getAllAvailableJobs);

// @Route   GET /jobs/availableJobs/category
// @desc    takes a category in url params and returns a list of available jobs based on category
router
  .route("/availableJobs/filter")
  .post(accessTokenVerify,freelancer, Controller.getAllAvailableJobs);

// @Route   GET /jobs/job
// @desc    takes jobId and startupId in body and returns the details of the job
router.route("/job").post(accessTokenVerify,freelancer, Controller.getJobById);

// @Route   POST /jobs/apply
// @desc    (startupId,title,roleId) from body and _id from accessToken and apply for a specific job
router.route("/apply").post(accessTokenVerify,freelancer, Controller.applyToAvaialbelJob);


router.route("/getJobsAppliedByFreelancer").get(accessTokenVerify,freelancer, Controller.getJobsAppliedByFreelancer);
// router.get('/job/:jobId/freelancers', getFreelancersAppliedForJob);

// @Route   POST /jobs/startupJobs
// @desc    takes startupId in body and returns all the jobs posted by the startup
router.route("/startupJobs").post(accessTokenVerify,startup, Controller.getStartupJobs);

export default router;
