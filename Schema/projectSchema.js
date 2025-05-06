import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: String,
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending',
        }
    },
    {
        timestamps: true,
    }
)

const Project = mongoose.model('Project', projectSchema);
export default Project;