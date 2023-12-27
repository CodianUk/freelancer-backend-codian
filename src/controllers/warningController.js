import mongoose from "mongoose";
import NOTFOUND from "../errors/notFound.js";
import { Warning } from "../models/warnings.js";

const ObjectIdMaker = (id) => mongoose.Types.ObjectId(id);

const getAllWarnings = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let aggCursor = await Warning.aggregate([
      {
        $facet: {
          data: [
            {
              $unwind: {
                path: "$warnings",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $match: {
                $and: [
                  {
                    "warnings.warnedTo": _id,
                  },
                  {
                    "warnings.status": "Approved",
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "startups",
                localField: "startupid",
                foreignField: "_id",
                as: "startupData",
              },
            },
            {
              $unwind: {
                path: "$startupData",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $set: {
                logo: "$startupData.logo",
                name: "$startupData.businessName",
                category: "$startupData.category",
                startupId: "$startupid",
              },
            },
            {
              $project: {
                _id: 0,
                logo: 1,
                name: 1,
                category: 1,
                warnings: 1,
                startupId: 1,
              },
            },
          ],
          warningsCount: [
            {
              $unwind: {
                path: "$warnings",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $match: {
                $and: [
                  {
                    "warnings.warnedTo": _id,
                  },
                  {
                    "warnings.status": "Approved",
                  },
                ],
              },
            },
            {
              $count: "warningsCount",
            },
          ],
        },
      },
      {
        $set: {
          warnings: "$data",
          // warningsCount:"$warningsCount.warningsCount"
        },
      },
      {
        $project: {
          warnings: 1,
          // warningsCount:1,
          warningsCount: "$warningsCount.warningsCount",
        },
      },
    ]);

    if (aggCursor) {
      return res.status(200).json({
        status: "OK",
        data: aggCursor,
      });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};
const getWarningById = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let warningId = ObjectIdMaker(req.body.warningId);
    let startupId = ObjectIdMaker(req.body.startupId);
    let aggCursor = await Warning.aggregate([
      { $match: { startupid: startupId } },
      {
        $unwind: {
          path: "$warnings",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          $and: [
            { "warnings._id": warningId },
            { "warnings.warnedTo": _id },
            { "warnings.status": "Approved" },
          ],
        },
      },
      {
        $lookup: {
          from: "startups",
          localField: "startupid",
          foreignField: "_id",
          as: "startupData",
        },
      },
      {
        $unwind: {
          path: "$startupData",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $set: {
          logo: "$startupData.logo",
          name: "$startupData.businessName",
          category: "$startupData.category",
        },
      },
      {
        $project: {
          _id: 0,
          warnings: 1,
          logo: 1,
          name: 1,
          category: 1,
        },
      },
    ]);

    if (aggCursor.length === 0) {
      let err = new NOTFOUND("No such warning found");
      return next(err);
    }
    return res
      .status(200)
      .setHeader("Content-Type", "application/json")
      .json({ status: "OK", data: aggCursor });
  } catch (err) {
    return next(err);
  }
};

const requestWarning = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let startupId = ObjectIdMaker(req.body.startupId);
    let warningTo = ObjectIdMaker(req.body.warningTo);
    let reason = req.body.reason;
    let found = await Warning.findOne({ startupid: startupId });
    let response;
    if (found) {
      found.warnings.push({
        warnedBy: _id,
        warnedTo: warningTo,
        reason: reason,
      });
      response = await found.save({ validateBeforeSave: true });
    } else {
      let newWarning = new Warning({
        startupid: startupId,
        warnings: [{ warnedBy: _id, warnedTo: warningTo, reason: reason }],
      });
      response = await newWarning.save({ validateBeforeSave: true });
    }
    if (response) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({
          status: "OK",
          data: { msg: "warning request has been sent to the admin" },
        });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};

const respondToWarningRequest = async (req, res, next) => {
  try {
    let _id = ObjectIdMaker(req.user._id);
    let startupId = ObjectIdMaker(req.body.startupId);
    let warningId = ObjectIdMaker(req.body.warningId);
    let status = req.body.status;
    let response = await Warning.findOneAndUpdate(
      { startupid: startupId, warnings: { $elemMatch: { _id: warningId } } },
      { $set: { "warnings.$.status": status } },
      { new: true, findAndModify: false }
    );
    console.log(response);
    if (response) {
      return res
        .status(200)
        .setHeader("Content-Type", "application/json")
        .json({ status: "OK", data: { msg: "Status Successfully updated" } });
    }
    let err = new NOTFOUND("No such warning found");
    return next(err);
  } catch (err) {
    return next(err);
  }
};

// ============================== FOR ADMIN ===============================
const getWarnings = async (req, res, next) => {
  try {

    const {page, limit} = req.body;
    let pagination = {
      page: page || 1,
      limit: limit || 10,
    };

    let aggCursor = await Warning.aggregate([
      {
        $unwind: {
          path: "$warnings",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "warnings.status": "Approved",
        },
      },
      {
        $facet: {
          metaData:[
            {
              $count: "total"
            },
            {
              $addFields: {
                page: pagination.page,
              }
            }
          ],
          warnings:[
            {
              $lookup: {
                from: "startups",
                localField: "startupid",
                foreignField: "_id",
                as: "startupData",
              },
            },
            {
              $unwind: {
                path: "$startupData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "warnings.warnedTo",
                foreignField: "_id",
                as: "userData",
              },
            },
            {
              $unwind: {
                path: "$userData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "warnings.warnedBy",
                foreignField: "_id",
                as: "warnedByData",
              },
            },
            {
              $unwind: {
                path: "$warnedByData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup:{
                from: "users",
                localField: "startupData.userid",
                foreignField: "_id",
                as: "startupOwnerData",
              }
            },
            {
              $unwind: {
                path: "$startupOwnerData",
                preserveNullAndEmptyArrays: true,
              }
            },
            {
              $set: {
                userName: "$userData.name",
                userAvatar: "$userData.avatar",
                businessName: "$startupData.businessName",
                warnedByName: "$warnedByData.name",
                warnedOn: "$warnings.updatedAt",
                warningId: "$warnings._id",
                userId: "$userData._id",
                startup:{
                  startupId: "$startupData._id",
                  businessName: "$startupData.businessName",
                  ownerName: "$startupOwnerData.name",
                }
              },
            },
            {
              $group: {
                _id: "$userId",
                totalWarnings: {
                  $sum: 1,
                },
                data: {
                  $last: {
                    userName: "$userData.name",
                    userAvatar: "$userData.avatar",
                    warnedByName: "$warnedByData.name",
                    warnedOn: "$warnings.updatedAt",
                    warningId: "$warnings._id",
                    userId: "$userData._id",
                    reason: "$warnings.reason",
                    startup:"$startup"
                  },
                },
              },
            },
          ]
        }
      }
    ]);

    if (aggCursor) {
      return res.status(200).json({
        status: "OK",
        data: aggCursor,
      });
    }
    let err = new Error("Something went wrong");
    return next(err);
  } catch (err) {
    return next(err);
  }
};

export default {
  getAllWarnings,
  getWarningById,
  requestWarning,
  respondToWarningRequest,
  getWarnings,
};
