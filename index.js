import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import session from 'express-session';
import User from './Schema/userSchema.js';
import bcrypt from 'bcryptjs';
import generateToken from './utils/generateToken.js';
import Project from './Schema/projectSchema.js';
import protect from './middleware/authMiddleware.js';

// Load environment variables from .env
dotenv.config();

// MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error);
    process.exit(1); // Exit on failure
  }
};

connectDB();

const app = express();
const Port = 4000;

// Body parser middleware to parse POST request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'SDFSDGDDGDGS',  
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));


app.get('/', async (req, res) => {
  res.send('Hello World!');
})


app.post('/register', async (req, res) => {
  try {
    const { name, email, password, country } = req.body;
    console.log("Register data", name, email, password, country);

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


app.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    });

    if (!existingUser) {
      return res.status(400).json({ message: "Login failed. User not found." });
    }

    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Login failed. Incorrect password." });
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

// for single user project (perticular to that user it can create the project)
app.post('/project', protect , async(req, res)=>{
  const { title, description} = req.body;
  const userId = req.user._id;

  try {
    const project = new Project({title, description, owner: userId});
    await project.save();
    res.status(201).json(project);
  }catch (error) {
    res.status(500).json({ message: error.message });
  }
})

// for single user project (perticular to that user it will update project)
app.patch('/project/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const updatedFields = {};
  if (title) updatedFields.title = title;
  if (description) updatedFields.description = description;

  const updatedProject = await Project.findByIdAndUpdate(
    id,
    updatedFields,
    { new: true }
  );

  if (!updatedProject) {
    return res.status(404).json({ message: "Project not found" });
  }

  res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/project/:id', async (req, res)=>{
  const {id} = req.body;

  try {
    const deletedProject = await Project.findByIdAndDelete(id);
    if(!deletedProject){
      return res.status(404).json({message: "project not found"});
    }
    res.status(200).json({message: "Project deleted successfully"});
  }catch (error){
    res.status(500).json({message: error.message});
  }
})

// for single user project (perticular to that user it will give all the projects)
app.get('/projects', protect , async (req, res)=>{
  const userId = req.user._id;

  console.log("User ID:", userId); // Log the user ID for debugging
  try {
    const projects = await Project.find({ owner: userId });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})




// Start the server
app.listen(Port, () => {
  console.log(`Example app listening on Port ${Port}`);
});















// smtp server for template  email