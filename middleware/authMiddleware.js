import jwt from 'jsonwebtoken';
import User from '../Schema/userSchema.js';

const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header is present and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password'); // attach user without password
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export default protect;













// import jwt from 'jsonwebtoken';
// import User from '../Schema/userSchema.js';

// const protect = async (req, res, next) => {
//   let token = req.headers.authorization;

//   if (token && token.startsWith("Bearer ")) {
//     try {
//       token = token.split(" ")[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = await User.findById(decoded.id).select('-password');
//       next();
//     } catch (error) {
//       return res.status(401).json({ message: "Token is invalid or expired" });
//     }
//   } else {
//     return res.status(401).json({ message: "No token provided" });
//   }
// };

// export default protect;
