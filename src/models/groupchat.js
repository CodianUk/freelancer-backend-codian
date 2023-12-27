import mongoose from "mongoose";

const GroupChatSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    members: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      validate: {
        validator: function (v) {
          return v.length > 2;
        },
      },
    },
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Messages",
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const GroupChat = mongoose.model("GroupChat", GroupChatSchema);

export { GroupChat };
