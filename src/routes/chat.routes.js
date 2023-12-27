// @import Packages
import express from "express";

// @import Controllers
import chatController from "../controllers/chatController.js";
import groupChatController from "../controllers/groupChatController.js";

// @import Middleware
import { accessTokenVerify } from "../middleware/authentication.js";

const router = express.Router();

// @Route   POST /chat/sendMessage
// @desc    Send Message
router.post("/sendMessage", accessTokenVerify, chatController.sendMessage);

// @Route   GET /chat/getMessages
// @desc    Get Messages
router.post("/getMessages", accessTokenVerify, chatController.getMessages);

// @Route   GET /chat/getChats
// @desc    Get all Chats
router.get("/getChats", accessTokenVerify, chatController.getChats);


router.get("/getListofChatByUser/:chatId", accessTokenVerify, chatController.getMessagesByChatId);

router.put('/mark-as-read/:chatId', accessTokenVerify , chatController.markMessagesAsRead);


// @Route   POST /chat/createChatGroup
// @desc    Create Chat Group
router.post(
  "/createChatGroup",
  accessTokenVerify,
  groupChatController.createChatGroup
);

router.get('/get-members/:groupId',accessTokenVerify , groupChatController.getMembersWithAvatar);

// @Route   POST /chat/sendGroupMessage
// @desc    Send Group Message
router.post(
  "/sendGroupMessage",
  accessTokenVerify,
  groupChatController.sendGroupMessage
);

// @Route   POST/chat/getGroupMessages
// @desc    Get Group Message
router.post(
  "/getGroupMessage",
  accessTokenVerify,
  groupChatController.GetMessagesfromChat
);

// @Route   POST/chat/getallGroups
// @desc    Get all Groups
router.get(
  "/getallGroups",
  accessTokenVerify,
  groupChatController.getAllGroups
);

export default router;
