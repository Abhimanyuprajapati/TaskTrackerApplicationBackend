import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from "express-session";
import User from "./Schema/userSchema.js";
import bcrypt from "bcryptjs";
import cors from "cors";
import generateToken from "./utils/generateToken.js";
import Project from "./Schema/projectSchema.js";
import protect from "./middleware/authMiddleware.js";
import Activity from "./Schema/activitySchema.js";
import sendMail from "./utils/emailService.js";
import OtpModel from "./Schema/otpSchema .js";
import verifiedEmailSchema from "./Schema/verifiedEmailSchema.js";

// Load environment variables from .env
dotenv.config();

// MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
    process.exit(1); // Exit on failure
  }
};

connectDB();

const app = express();
const PORT = process.env.PORT;

const allowedOrigins = [
  "http://localhost:5173",
  "https://task-tracker-application-backend.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body parser middleware to parse POST request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "SDFSDGDDGDGS",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.get("/", async (req, res) => {
  res.send("Hello World!");
});

// Route to send OTP in gmail

app.post('/send-otp', async (req, res)=>{
  const {email} = req.body;

  if(!email) return res.status(400).json({message:"Email is required"});

  try{
// check weather user is already register
const existinguser = await User.findOne({email}) ;
if(existinguser) return res.status(400).json({message: "Email Already Registered"});

// generate otp 
const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
const hashedOtp = await bcrypt.hash(otpCode, 10);
const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

// store into db
await OtpModel.findOneAndUpdate(
  { email },
  { code: hashedOtp, expiresAt: otpExpiry },
  { upsert: true, new: true }
);


    // Send OTP via email
    await sendMail(
      email,
      "🔐 Verify Your Email - Task Tracker",
      `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; background-color: #f9f9f9; color: #333;">
        <h2 style="color: #4CAF50;">🔐 Email Verification</h2>
        <p>Hello,</p>
        <p>Thank you for starting your registration on <strong>Task Tracker</strong>.</p>
        <p>Your OTP is:</p>
        <div style="font-size: 24px; font-weight: bold; color: #000; margin: 10px 0;">${otpCode}</div>
        <p>This code is valid for <strong>10 minutes</strong>.</p>
        <p>Please complete your registration using this OTP. If you did not initiate this request, you can safely ignore this email.</p>
        <p><strong>Note:</strong> If you do not complete the registration within 3 days, your email link and OTP will be cleared from our system, and you will need to initiate the verification process again.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 14px; color: #555;">Need help? Contact us at support@tasktracker.com</p>
      </div>
      `
    );
    

    res.status(200).json({ message: "OTP sent" });

  }catch(error){
    console.error(error);
    res.status(500).json({ message: error.message });
  }
})

// verify otp 
app.post('/verify-otp', async (req, res)=>{
  const {email, otp} = req.body;
  if(!email && !otp) return res.status(400).json({message:"Email and OTP are required"});

  try{
const record = await OtpModel.findOne({email});
if (!record) return res.status(404).json({ message: "OTP not found or expired" });

const isMatch = await bcrypt.compare(otp, record.code);
if (!isMatch || new Date() > record.expiresAt) {
  return res.status(400).json({ message: "Invalid or expired OTP" });
}

  // OTP is valid — store verified email
  await verifiedEmailSchema.findOneAndUpdate(
    { email },
    { email },
    { upsert: true }
  );

  await OtpModel.deleteOne({ email });
res.status(200).json({ message: "OTP verified" });

  }catch(error){
    console.error(error);
    res.status(500).json({ message: error.message });
  }

})


app.post("/register", async (req, res) => {
  try {
    const { name, email, password, country } = req.body;
    // console.log("Register data", name, email, password, country);

       // Check if email was verified via OTP
       const verified = await verifiedEmailSchema.findOne({ email });
       if (!verified) {
         return res
           .status(400)
           .json({ message: "Email not verified. Please verify first." });
       }

    const existingUser = await User.findOne({ $or: [{ email }, { name }] });
    if (existingUser) {
      return res.status(400).json({ message: "Name or email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      country,
    });

    const savedUser = await newUser.save();
    const token = generateToken(savedUser._id);
    
    // Send email
    await sendMail(
      newUser.email,
      "🎉 Welcome to Task Tracker!",
      `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Hi ${newUser.name},</h2>
        <p>Welcome to <strong>Task Tracker</strong>! 🎉</p>
        <p>We're thrilled to have you on board. You can now create, manage, and track your tasks more efficiently than ever before.</p>
        <p>Start by creating your first project or exploring the dashboard.</p>
        <hr style="border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 14px; color: #555;">If you have any questions, feel free to reply to this email. We're always here to help!</p>
        <p style="margin-top: 30px;">Cheers,<br>The Task Tracker Team</p>
      </div>
      `
    );

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        country: savedUser.country,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    });

    if (!existingUser) {
      return res.status(400).json({ message: "Login failed. User not found." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordCorrect) {
      return res
        .status(400)
        .json({ message: "Login failed. Incorrect password." });
    }

    const token = generateToken(existingUser._id);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        country: existingUser.country,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// for creating single user project (perticular to that user it can create the project)
app.post("/project", protect, async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user._id;

  try {
    const project = new Project({ title, description, owner: userId });
    await project.save();

    await Activity.create({
      user: userId,
      action: `Created project: ${title}`,
      title: title,
      description: description,
      timestamp: new Date(),
    });

    // Fetch user to get their email
    const user = await User.findById(userId);
    // Send email
    await sendMail(
      user.email,
      "✅ Project Created Successfully!",
      `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #eef9f1; border-radius: 10px;">
          <h2 style="color: #2e7d32;">Hi ${user.name},</h2>
          <p>Your new project <strong>"${title}"</strong> has been created successfully in <strong>Task Tracker</strong>.</p>
          <p>You can now start adding tasks, assigning members, and tracking progress.</p>
          <a href="https://your-app-link.com/projects" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 5px;">View Project</a>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">If this wasn't you, please contact support.</p>
        </div>
      `
    );

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// for update single user project (perticular to that user it will update project)
app.patch("/project/:id", protect, async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const userId = req.user._id;

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // check if the project belong to the user
    if (project.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this project" });
    }

    // Don't allow update if project is completed
    if (project.status === "completed") {
      return res
        .status(403)
        .json({ message: "Cannot edit a completed project" });
    }

    // Update fields
    if (title) project.title = title;
    if (description) project.description = description;

    const updatedProject = await project.save();

    // Log activity
    await Activity.create({
      user: userId,
      action: `Updated project: ${title || project.title}`,
       title: title,
      description: description,
      timestamp: new Date(),
    });

    // Fetch user to get their email
    const user = await User.findById(userId);

    // Send update notification email
    await sendMail(
      user.email,
      "🔄 Project Updated",
      `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fffbe6; border-radius: 10px;">
      <h2 style="color: #e69138;">Hello ${user.name},</h2>
      <p>Your project <strong>"${updatedProject.title}"</strong> has been successfully updated.</p>
      <p>If you made changes by mistake or have concerns, you can always revert or check project history.</p>
      <a href="https://your-app-link.com/projects/${updatedProject._id}" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background-color: #e69138; color: white; text-decoration: none; border-radius: 5px;">View Updated Project</a>
      <p style="margin-top: 30px; font-size: 12px; color: #777;">If you didn’t perform this update, please contact our support team immediately.</p>
    </div>
  `
    );

    res.status(200).json(updatedProject);

    // res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// to get the single project
app.get("/project/:id", protect, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Optional: check if the project belongs to the user
    if (project.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this project" });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// delete the single project
app.delete("/project/:id", protect , async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  try {
    const deletedProject = await Project.findByIdAndDelete(id);
    if (!deletedProject) {
      return res.status(404).json({ message: "project not found" });
    }

    // console.log("deletedProject",deletedProject);
    await Activity.create({
      user: userId,
      action: `Deleted project: ${deletedProject.title}`,
       title: deletedProject.title,
      description: deletedProject.description,
      timestamp: new Date(),
    });

    // Send deletion email
    const user = await User.findById(userId);
    // console.log(user);
    await sendMail(
      user.email,
      "🗑️ Project Deleted",
      `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #ffeaea; border-radius: 10px;">
            <h2 style="color: #cc0000;">Hi ${user.name},</h2>
            <p>The project <strong>"${deletedProject.title}"</strong> has been permanently deleted from your workspace.</p>
            <p>If you didn’t perform this action, please reach out to support immediately.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message from Task Tracker System.</p>
          </div>
        `
    );

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// make the project as completed
app.put("/project/:id/complete", protect, async (req, res) => {
  const { id } = req.params;
  // console.log("req.user===>",req.user);
  const userId = req.user._id;

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to complete this project" });
    }

    if (project.status === "completed") {
      return res.status(200).json({ message: "Project is already completed" });
    }

    project.status = "completed";
    await project.save();

    await Activity.create({
      user: userId,
      action: `Marked project as completed: ${project.title}`,
      title: project.title,
      description: project.description,
      timestamp: new Date(),
    });

    // Fetch user to send email
    const user = await User.findById(userId);

    await sendMail(
      user.email,
      "✅ Project Completed",
      `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #e6ffe6; border-radius: 10px;">
        <h2 style="color: #2e7d32;">Hi ${user.name},</h2>
        <p>Congratulations! Your project <strong>"${project.title}"</strong> has been marked as <strong>completed</strong>.</p>
        <p>Thank you for using Task Tracker. Keep up the great work!</p>
        <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message from Task Tracker System.</p>
      </div>
    `
    );

    res.status(200).json({ message: "Project marked as completed", project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// for single user project (perticular to that user it will give all the projects)
app.get("/projects", protect, async (req, res) => {
  const userId = req.user._id;

  console.log("User ID:", userId); // Log the user ID for debugging
  try {
    const projects = await Project.find({ owner: userId });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// get the count of all the projects of a perticular user
app.get("/projects/countrevenuepending", protect, async (req, res) => {
  const userId = req.user._id;

  console.log("User ID:", userId); // Log the user ID for debugging
  try {
    const projectCount = await Project.countDocuments({ owner: userId });
    const revenue = projectCount * 50;
    res.status(200).json({
      projectCount,
      revenue: `$${revenue}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// global notification
app.get("/notification", protect, async (req, res) => {
  try {
    const notification = [
      {
        title: "Project for UP",
        message: "New project is available for Client A",
        type: "info"
      },
      {
        title: "Project for Mumbai",
        message: "New project is available for Client B",
        type: "warning"
      },
      {
         title: "Project for Pune",
        message: "New project is available for Client C",
        type: "success"
      },
    ];
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// get  activity for recent user action
app.get("/activity/recent", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const activities = await Activity.find({ user: userId })
      .sort({ timestamp: -1 }) // recent first
      .limit(5); // limit to latest 5

    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Example app listening on PORT ${PORT}`);
});

// smtp server for template  email
