// @import Packages
import mongoose from "mongoose";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import Grid from "gridfs-stream";

// @import Error Classes
import NOTFOUND from "../errors/notFound.js";
import VALIDATIONERROR from "../errors/validationError.js";

let gfs, gridfsBucket;
mongoose.connection.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection("uploads");
});

const storage = new GridFsStorage({
  url: process.env.MONGO_URL,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});

export const upload = multer({ storage });

// @desc    Upload Files i.e Logo, Pitch Deck, Business Plan
const uploadFile = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return next(new NOTFOUND("Please upload a file"));
    }
    res.send(file);
  } catch (error) {
    return next(error);
  }
};

// @desc    Get Image
const getImageFile = async (req, res, next) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file exists
    if (!file || file.length === 0) {
      return next(new NOTFOUND("No file exists"));
    }
    // Check if image file
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      // send image file
      res.set("Content-Type", file.contentType);
      const readStream = gridfsBucket.openDownloadStream(file._id);
      readStream.pipe(res);
    } else {
      next(new VALIDATIONERROR("Not an image"));
    }
  });
};

// @desc    Download File
const getPdfFile = async (req, res, next) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file exists
    if (!file || file.length === 0) {
      return next(new NOTFOUND("No file exists"));
    }
    // Check if image file
    if (file.contentType === "application/pdf") {
      // download file
      res.set("Content-Disposition", "attachment");
      const downloadStream = gridfsBucket.openDownloadStream(file._id);
      downloadStream.pipe(res);
    } else {
      return next(new VALIDATIONERROR("Not a pdf"));
    }
  });
};

export default { uploadFile, getImageFile, getPdfFile };
