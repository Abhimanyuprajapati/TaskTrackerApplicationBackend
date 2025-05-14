import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      action: {
        type: String,
        required: true,
      },
      title:{
        type: String,
      },
      description:{
        type: String,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      }
});

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;