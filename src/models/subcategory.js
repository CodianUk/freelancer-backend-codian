import mongoose from "mongoose";

const SubcategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      unique: true,
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    // Other subcategory properties can be added here
  },
  { timestamps: true }
);

const Subcategory = mongoose.model("Subcategory", SubcategorySchema);

export { Subcategory };