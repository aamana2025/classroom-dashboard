import bcrypt from "bcrypt";
import User from "../models/Users.js";
import PendingUser from "../models/PendingUser.js";
import Plan from "../models/Plan.js";
import { generateAccessToken } from "../utils/tokens.js";
import { sendOTPEmail } from "./emailController.js";
import { v4 as uuidv4 } from "uuid";
/**
 * Create pending user before payment
 */
export const createPendingUser = async (req, res) => {
  const { name, email, phone, password, planId } = req.body;

  try {
    const existing = await PendingUser.findOne({ email }) || await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(400).json({ message: "Invalid plan selected" });

    const hashed = await bcrypt.hash(password, 10);
    const pendingUser = new PendingUser({ name, email, phone, password: hashed, planId });
    await pendingUser.save();

    res.status(201).json({ message: "Pending user created", pendingId: pendingUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getPendingUser = async (req, res) => {
  try {
    const { pendingId } = req.params;
    const pendingUser = await PendingUser.findById(pendingId).populate("planId");

    if (!pendingUser) {
      return res.status(404).json({ message: "Pending payment not found" });
    }

    res.status(200).json(pendingUser);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending payment", error: error.message });
  }
}
/**
 * Check signup status using pendingId
 */

export const getSignupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const pending = await PendingUser.findById(id).populate("planId");

    if (pending) return res.json({ status: "pending", plan: pending.planId });

    const user = await User.findById(id);
    if (user.status == 'active') return res.json({ status: user.status, user: { id: user._id, email: user.email } });

    res.json({ status: "not_found" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Login only active users
 */

export const loginUser = async (req, res) => {
  const { email, password, deviceToken } = req.body; // client sends a unique deviceToken (uuid or generated per device)
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // // Check if subscription expired
    // if (user.expiresAt && new Date() > user.expiresAt) {
    //   user.status = "pending"; // expire account
    //   await user.save();
    //   return res.status(403).json({ message: "Subscription expired" });
    // }

    // Check if user already logged in on another device
    if (user.deviceToken && user.deviceToken !== deviceToken) {
      return res.status(403).json({ message: "Account already active on another device" });
    }

    // Assign a new deviceToken if not set
    if (!user.deviceToken) {
      user.deviceToken = deviceToken || uuidv4(); // generate if client didn’t send
      await user.save();
    }

    const accessToken = generateAccessToken(user);

    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
        status: user.status,
        plan: user.plan,
        expiresAt: user.expiresAt,
        deviceToken: user.deviceToken,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login error", error: error.message });
  }
};


// logout

export const logoutUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.deviceToken = null;
    await user.save();

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout error", error: error.message });
  }
};


export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetOTP = otp;
    user.resetOTPExpires = expiry;
    await user.save();
    const encodedEmail = encodeURIComponent(user.email);
    const resetLink = `${process.env.FRONTEND_URL}/Pages/Auth/App/reset-password/${encodedEmail}/${otp}`;

    await sendOTPEmail(user,otp,resetLink);

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !user.resetOTP || !user.resetOTPExpires)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    if (user.resetOTP !== otp)
      return res.status(400).json({ message: "Incorrect OTP" });

    if (user.resetOTPExpires < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear OTP
    user.resetOTP = null;
    user.resetOTPExpires = null;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Reset failed", error: error.message });
  }
};

