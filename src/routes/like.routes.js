import { Router } from "express";
import Controller from "../controllers/likeController.js";
import { accessTokenVerify, freelancer, startup } from "../middleware/authentication.js";
const router = Router();


router.route("/").post(
    accessTokenVerify,
    Controller.LikeNew);


router.route("/").get(
    accessTokenVerify,
    Controller.getLiked);





export default router;

