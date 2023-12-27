import mongoose from "mongoose";

const todosSchema = new mongoose.Schema(
  {
    startupid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isOwnerId : { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    file: { type: String },
    cost: { type: String },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["OnGoing", "Completed"],
      default: "OnGoing",
    },
    contributors: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Assuming these are user IDs
        },
        name: {
          type: String,
          ref: "User", // Assuming these are user IDs
        },
        avatar: {
          type: String,
          ref: "User", // Assuming these are user IDs
        },
        iscomplete: {
          type: Boolean,
          default: false, // Default value for the verified field
        },
      },
    ],
    team: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Assuming these are user IDs
        },
        name: {
          type: String,
          ref: "User", // Assuming these are user IDs
        },
        avatar: {
          type: String,
          ref: "User", // Assuming these are user IDs
        },
        verified: {
          type: Boolean,
          default: false, // Default value for the verified field
        },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Todos = mongoose.model("Todos", todosSchema);

export { Todos };
