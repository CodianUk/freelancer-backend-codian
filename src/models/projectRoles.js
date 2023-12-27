import mongoose from "mongoose";

const projectRolesSchema = new mongoose.Schema(
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
    roles: {
      type: [
        {
          title: { type: String, required: true },
          description: { type: String, required: true },
          type: {
            type: String,
            required: true,
            enum: ["Equity", "Freelancer" , "Inperson", "Virtual" , "Eithr"],
          },
          skills : [
            {type : String}
          ],
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  { timestamps: true }
);

const ProjectRoles = mongoose.model("ProjectRoles", projectRolesSchema);

export { ProjectRoles };
