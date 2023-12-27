import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    chatid: {
      type: String,
      required: true,
    },
    messages: {
      type: [
        {
          sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          message: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "messages.MongoDBRef",
            required: true,
          },
          MongoDBRef: {
            type: String,
            enum: ["Messages", "oneTimeOrder", "equityOrder"],
            required: true,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model("Chat", chatSchema);

export { Chat };
