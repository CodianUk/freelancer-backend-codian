import express from "express";
const router = express.Router();
import { Warning } from "../models/warnings.js";
import { Startup } from "../models/startup.js";


import {
  accessTokenVerify,
  freelancer,
  startup,
} from "../middleware/authentication.js";
import Controller from "../controllers/warningController.js";
import {
  acceptWarningRequestRules,
  getSpecificWarning,
  requestWarning,
  validate,
} from "../middleware/validator.js";

// @Route   GET /warnings/warning/
// @desc    returns all warnings given to a freelancer
router.route("/").get(accessTokenVerify, freelancer, Controller.getAllWarnings);
// router.route("/:startupid").get(accessTokenVerify, freelancer, Controller.getAllWarningsbyId);

router.get("/warnings/:startupid", async (req, res) => {
  try {
    const { startupid } = req.params;

    // Find all warnings for the given startupid
    const warnings = await Warning.find({ startupid });

    // Populate startup details for each warning
    const populatedWarnings = await Promise.all(
      warnings.map(async (warning) => {
        const startup = await Startup.findById(warning.startupid);
        return {
          ...warning.toObject(),
          startup: {
            logo: startup.logo,
            businessName: startup.businessName,
            category: startup.category,
          },
        };
      })
    );

    res.status(200).json(populatedWarnings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// @Route   POST /warnings/request/
// @desc    takes startupId and warningTo and reason and creates a warning request
router
  .route("/request")
  .post(
    accessTokenVerify,
    freelancer,
    requestWarning(),
    validate,
    Controller.requestWarning
  );

// @Route   GET /warnings/warning/
// @desc    takes warningId and startupId and returns specific warning details
router
  .route("/warning")
  .post(
    accessTokenVerify,
    freelancer,
    getSpecificWarning(),
    validate,
    Controller.getWarningById
  );

router
  .route("/warning/request/respond")
  .post(
    accessTokenVerify,
    startup,
    acceptWarningRequestRules(),
    validate,
    Controller.respondToWarningRequest
  );

// FOR ADMIN
router.route("/all").post(accessTokenVerify, Controller.getWarnings);

export default router;
