import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      required: true,
      enum: ["text", "image", "file"],
    },
    status: {
      type: String,
      default : 'Unread',
      enum: ['Unread' , 'Read'],
    },
  },
  { timestamps: true }
);

const Messages = mongoose.model("Messages", messageSchema);

export { Messages };
