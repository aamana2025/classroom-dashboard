import jwt from "jsonwebtoken";
import Users from "../models/Users.js";

// Verify JWT
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Check admin role
export const adminMiddleware = (req, res, next) => {
  if (!req.user || !["admin", "super-admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};

export const userActiveMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from MongoDB using ID from token
    const user = await Users.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    
    // Check user status from DB
    if (user.status === "pending") {
      return res.status(403).json({ message: "Account pending approval",status:'pending' });
    }
    
    // Attach fresh user object to request
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid token" });
  }
};
