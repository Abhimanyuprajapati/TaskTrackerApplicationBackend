import mongoose from 'mongoose';

// Define a schema for the User
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
   profilePic: {
    data: Buffer,
    contentType: String,
  },
});

// Create a User model from the schema
const User = mongoose.model('User', userSchema);

export default User;
