// models/TermsAndConditions.js
import mongoose from "mongoose";

const termsAndConditionsSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const TermsAndConditions = mongoose.model("TermsAndConditions", termsAndConditionsSchema);

export {TermsAndConditions};
