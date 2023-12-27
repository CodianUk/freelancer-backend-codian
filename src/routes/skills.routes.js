import { Router } from "express";
const router = Router();
import { Skill } from "../models/skill.js";


// @Route   GET /skills
// @desc    returns all skills
router.route("/").get(async (req, res, next) => {
  try {
    let response = await Skill.find({}).select("-_id title");
    if (response) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: response });
    }
    return next(new NOTFOUND("No skills found"));
  } catch (err) {
    return next(err);
  }
});

export default router;
