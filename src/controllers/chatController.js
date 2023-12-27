// @import Packages
import mongoose from "mongoose";

// @import Error Classes
import BADREQUEST from "../errors/badRequest.js";
import NOTFOUND from "../errors/notFound.js";

// @import Models
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { GroupChat } from "../models/groupchat.js";
import { Messages } from "../models/messages.js";
//------------------------------------------------------------

let ObjectId = mongoose.Types.ObjectId;

const sendMessage = async (req, res, next) => {
  let chat;
  let message;
  let tempMessages;
  try {
    const senderid = req.user._id;
    const { receiverid, msgcontent, messageType } = req.body;
    chat = await Chat.findOne({ chatid: `${senderid}!!__!!${receiverid}` });
    if (!chat) {
      chat = await Chat.findOne({
        chatid: `${receiverid}!!__!!${senderid}`,
      });
    }
    if (messageType !== "oneTimeOrder" && messageType !== "equityOrder") {
      message = new Messages({
        message: msgcontent,
        messageType: messageType,
      });
      const validationError = message.validateSync();
      if (validationError) {
        return next(new BADREQUEST(validationError.message));
      }
      await message.save();
    }
    tempMessages = {
      sender: senderid,
      message:
        messageType === "oneTimeOrder" || messageType === "equityOrder"
          ? msgcontent
          : message?._id,
      MongoDBRef:
        messageType !== "oneTimeOrder" && messageType !== "equityOrder"
          ? "Messages"
          : messageType,
    };
    if (!chat) {
      chat = new Chat({
        chatid: `${senderid}!!__!!${receiverid}`,
        messages: [tempMessages],
      });
    } else {
      chat.messages.push(tempMessages);
    }
    const validationError = chat.validateSync();
    if (validationError) {
      return next(new BADREQUEST(validationError.message));
    }
    await chat.save();
  } catch (error) {
    return next(new BADREQUEST(error.message));
  }
  res.status(200).json({ status: "OK", message: "Message sent successfully" });
};

const getMessages = async (req, res, next) => {
  let chat;
  let Messages = [];
  try {
    const senderid = req.user._id;
    const { receiverid } = req.body;
    chat = await Chat.findOne({
      chatid: `${senderid}!!__!!${receiverid}`,
    }).populate("messages.message");
    if (!chat) {
      chat = await Chat.findOne({
        chatid: `${receiverid}!!__!!${senderid}`,
      }).populate("messages.message");
      if (!chat) {
        chat = { messages: [] };
      }
    }
    if (Object.keys(chat).length !== 0 && chat.messages.length !== 0) {
      chat.messages.forEach(async (message) => {
        let tempMsg = message.toObject();
        if (
          tempMsg.MongoDBRef === "oneTimeOrder" ||
          tempMsg.MongoDBRef === "equityOrder"
        ) {
          tempMsg[`${tempMsg.MongoDBRef}`] = tempMsg.message;
        }
        if (tempMsg.MongoDBRef === "Messages") {
          tempMsg[`${tempMsg.message.messageType}`] = tempMsg.message.message;
        }
        delete tempMsg.MongoDBRef;
        tempMsg.createdAt = tempMsg.message.createdAt;
        delete tempMsg.message;
        if (tempMsg.sender.toString() === senderid.toString())
          tempMsg.user = {
            _id: "me",
          };
        else
          tempMsg.user = {
            _id: "other",
          };
        Messages.push(tempMsg);
      });
    }
  } catch (error) {
    return next(new BADREQUEST(error.message));
  }

  res.status(200).json({ status: "OK", messages: Messages });
};


const getChats = async (req, res, next) => {
  let simpleChats = [];
  let groupChats = [];
  let allChats = [];
  try {
    const senderid = req.user._id;
    simpleChats = await Chat.aggregate([
      {
        $match: {
          $or: [
            {
              chatid: {
                $regex: `^${senderid}`,
              },
            },
            {
              chatid: {
                $regex: `${senderid}$`,
              },
            },
          ],
        },
      },
      {
        $set: {
          messages: {
            $slice: ["$messages", -1],
          },
        },
      },
      {
        $unwind: {
          path: "$messages",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "messages.message",
          foreignField: "_id",
          as: "lastMessage",
        },
      },
      {
        $unwind: {
          path: "$lastMessage",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          chatid: {
            $cond: {
              if: {
                $eq: [
                  {
                    $arrayElemAt: [
                      {
                        $split: ["$chatid", "!!__!!"],
                      },
                      0,
                    ],
                  },
                  `${senderid}`,
                ],
              },
              then: {
                $arrayElemAt: [
                  {
                    $split: ["$chatid", "!!__!!"],
                  },
                  1,
                ],
              },
              else: {
                $arrayElemAt: [
                  {
                    $split: ["$chatid", "!!__!!"],
                  },
                  0,
                ],
              },
            },
          },
        },
      },
      {
        $set: {
          chatid: {
            $toObjectId: "$chatid",
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "chatid",
          foreignField: "_id",
          as: "CHATUSER",
        },
      },
      {
        $unwind: {
          path: "$CHATUSER",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          chatid: 1,
          chatname: "$CHATUSER.name",
          chatavatar: "$CHATUSER.avatar",
          chatType: "simple",
          date: "$updatedAt",
          lastMessage: {
            _id: "$messages._id",
            sender: "$messages.sender",
            message: {
              _id: "$lastMessage._id",
              message: "$lastMessage.message",
              messageType: "$lastMessage.messageType",
              messageStatus: "$lastMessage.status",
            },
          },
        },
      },
    ]);
    groupChats = await GroupChat.aggregate([
      {
        $match: {
          members: {
            $in: [mongoose.Types.ObjectId(senderid)],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $set: {
          messages: {
            $slice: ["$messages", -1],
          },
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "messages.message",
          foreignField: "_id",
          as: "lastMessage",
        },
      },
      {
        $unwind: {
          path: "$messages",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "messages.sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $unwind: {
          path: "$lastMessage",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$sender",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          chatid: "$_id",
          chatavatar: "$avatar",
          chatname: "$groupName",
          chatType: "group",
          date: "$updatedAt",
          members: {
            $map: {
              input: "$members",
              as: "member",
              in: {
                _id: "$$member._id",
                name: "$$member.name",
                avatar: "$$member.avatar",
              },
            },
          },
          lastMessage: {
            _id: "$messages._id",
            sender: {
              _id: "$sender._id",
              name: "$sender.name",
              avatar: "$sender.avatar",
            },
            message: {
              _id: "$lastMessage._id",
              message: "$lastMessage.message",
              messageType: "$lastMessage.messageType",
            },
          },
        },
      },
    ]);
    allChats = [...simpleChats, ...groupChats].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    return res.status(200).json({ status: "OK", chats: allChats });
  } catch (error) {
    return next(new BADREQUEST(error.message));
  }
};

const getMessagesByChatId = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    // Assuming you have a Chat model
    const chat = await Chat.findOne({ _id: chatId });

    if (!chat) {
      return res.status(404).json({ status: "Not Found", message: "Chat not found" });
    }

    // Extract message IDs from the chat
    const messageIds = chat.messages.map(message => message.message);

    // Assuming you have a Message model
    const messages = await Messages.find({ _id: { $in: messageIds } });

    // Calculate the total count of unread messages
    const unreadCount = messages.filter(message => message.status === 'Unread').length;

    return res.status(200).json({ status: "OK", unreadCount, messages });
  } catch (error) {
    return next(new BADREQUEST(error.message));
  }
};


const markMessagesAsRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    // Assuming you have a Chat model
    const chat = await Chat.findOne({ _id: chatId });

    if (!chat) {
      return res.status(404).json({ status: "Not Found", message: "Chat not found" });
    }

    // Extract message IDs from the chat
    const messageIds = chat.messages.map(message => message.message);

    // Update the status of all unread messages to 'Read'
    await Messages.updateMany({ _id: { $in: messageIds }, status: 'Unread' }, { $set: { status: 'Read' } });

    // Now, you can retrieve the updated messages if needed
    const updatedMessages = await Messages.find({ _id: { $in: messageIds } });

    return res.status(200).json({ status: "OK", updatedMessages });
  } catch (error) {
    return next(new BADREQUEST(error.message));
  }
};





export default { sendMessage, getMessages, getChats , getMessagesByChatId , markMessagesAsRead};
