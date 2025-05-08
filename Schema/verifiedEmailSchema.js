import mongoose from "mongoose";

const verifiedEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  verifiedAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 3,
  },
});

export default mongoose.model("VerifiedEmail", verifiedEmailSchema);
