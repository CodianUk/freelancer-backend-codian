// @import Packages
import express from "express";

// @import Controllers
import uploadsController from "../controllers/uploadsController.js";

// @import Middleware
import { accessTokenVerify } from "../middleware/authentication.js";

// @import Multer
import { upload } from "../controllers/uploadsController.js";

const router = express.Router();

// @Route   POST /startup/uploadfile
// @desc    Upload Files i.e Logo, Pitch Deck, Business Plan
router.post("/uploadfile", upload.single("file"), uploadsController.uploadFile);

// @Route   GET/startup/getImage/:filename
// @desc    Get Image
router.get("/getImage/:filename", uploadsController.getImageFile);

// @Route   GET/startup/getFile/:filename
// @desc    Download File
router.get("/getFile/:filename", uploadsController.getPdfFile);

export default router;
