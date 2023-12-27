// @import Packages
import mongoose from "mongoose";

// @import Error Classes
import BADREQUEST from "../errors/badRequest.js";
import NOTFOUND from "../errors/notFound.js";

// @import Models
import { User } from "../models/user.js";
import { GroupChat } from "../models/groupchat.js";
import { Messages } from "../models/messages.js";

//------------------------------------------------------------

const createChatGroup = async (req, res, next) => {
  try {
    const { groupName, avatar, members } = req.body;
    const groupChat = new GroupChat({
      groupName,
      avatar,
      members: [...members, req.user._id],
    });
    const validationError = groupChat.validateSync();
    if (validationError) {
      return next(new BADREQUEST(validationError.message));
    }
    await groupChat.save();
    return res.status(201).json({
      status: "OK",
      data: {
        groupChat,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMembersWithAvatar = async (req, res, next) => {
  try {
    const groupId = req.params.groupId; // Assuming you have the group ID in the request parameters
    if (!groupId) return next(new BADREQUEST("Please provide a group ID"));

    const groupChat = await GroupChat.findById(groupId)
      .populate({
        path: "members",
        select: "_id avatar name", // Include the 'name' field
      })
      .exec();

    if (!groupChat) return next(new NOTFOUND("Group chat not found"));

    const membersWithAvatarAndName = groupChat.members.map((member) => ({
      _id: member._id,
      avatar: member.avatar,
      name: member.name,
    }));

    return res.status(200).json({
      status: "OK",
      data: {
        members: membersWithAvatarAndName,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const sendGroupMessage = async (req, res, next) => {
  try {
    const senderid = req.user._id;
    const { groupid, msgcontent, messageType } = req.body;
    let groupChat = await GroupChat.findOne({
      _id: groupid,
      members: senderid,
    });
    if (!groupChat) {
      return next(new NOTFOUND("Group not found"));
    }
    let message = new Messages({
      message: msgcontent,
      messageType: messageType,
    });
    const validationError = message.validateSync();
    if (validationError) {
      return next(new BADREQUEST(validationError.message));
    }
    await message.save();
    groupChat.messages.push({
      sender: senderid,
      message: message._id,
    });
    await groupChat.save();
    return res.status(201).json({
      status: "OK",
      message: "Message sent successfully",
    });
  } catch (error) {
    return next(error);
  }
};


const GetMessagesfromChat = async (req, res, next) => {
  let groupChat;
  let tempGroupChat = [];
  try {
    const senderid = req.user._id;
    const { groupid } = req.body;
    if (!groupid) {
      return next(new BADREQUEST("Provide a Groupid"));
    }
    groupChat = await GroupChat.findById(groupid)
      .populate("messages.sender", "_id name avatar")
      .populate("messages.message");

    if (!groupChat) {
      groupChat = [];
    } else {
      groupChat.messages.forEach((chat) => {
        let tempMsg = chat.toObject();
        tempMsg[`${tempMsg.message.messageType}`] = tempMsg.message.message;
        delete tempMsg.MongoDBRef;
        delete tempMsg.message;
        if (tempMsg.sender._id.toString() === senderid.toString())
          tempMsg.user = {
            _id: "me",
          };
        else
          tempMsg.user = {
            _id: "other",
          };
        tempGroupChat.push(tempMsg);
      });
    }
  } catch (error) {
    return next(error);
  }
  res.status(200).json({
    status: "OK",
    chat: tempGroupChat,
  });
};

const getAllGroups = async (req, res, next) => {
  let groups;
  try {
    groups = await GroupChat.find(
      { members: req.user._id },
      { messages: 0 }
    ).populate("members", "_id name avatar");

    if (!groups) {
      groups = [];
    }
  } catch (error) {
    return next(error);
  }
  res.status(200).json({
    status: "OK",
    groups,
  });
};

export default {
  createChatGroup,
  sendGroupMessage,
  GetMessagesfromChat,
  getAllGroups,
  getMembersWithAvatar
};
