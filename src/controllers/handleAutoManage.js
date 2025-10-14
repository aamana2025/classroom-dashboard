import cron from "node-cron";
import nodemailer from "nodemailer";
import Users from "../models/Users.js";
import Transaction from "../models/Transaction.js";
import Class from "../models/Class.js";

const getDateBefore = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
};

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
        console.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
        console.error("Error sending email:", err);
    }
};

const cleanExpiredUsers = async () => {
    try {
        const now = new Date();
        const threshold45Days = getDateBefore(45);
        const warning7Days = getDateBefore(38);
        const warning1Day = getDateBefore(44);

        // Find all users that need attention
        const users = await Users.find({
            $or: [
                { status: "pending" },
                { expiresAt: { $lte: now } }
            ]
        });

        for (const user of users) {
            const createdAt = user.createdAt;
            const expiresAt = user.expiresAt;

            // Send 7-day warning
            if (createdAt <= warning7Days && !user.warning7Sent) {
                await sendEmail(user.email, "Account Deletion Warning", "Your account and all data will be deleted in 7 days.");
                user.warning7Sent = true;
            }

            // Send 1-day warning
            if (createdAt <= warning1Day && !user.warning1Sent) {
                await sendEmail(user.email, "Final Account Deletion Warning", "Your account and all data will be deleted tomorrow.");
                user.warning1Sent = true;
            }

            // Save warning flags only once
            if (user.isModified()) await user.save();

            // Delete user if 45+ days expired
            if (createdAt <= threshold45Days || (expiresAt && expiresAt <= threshold45Days)) {
                const userId = user._id;

                // Delete related transactions
                await Transaction.deleteMany({ user: userId });

                // Remove from classes and submissions
                await Class.updateMany(
                    { students: userId },
                    {
                        $pull: {
                            students: userId,
                            "tasks.submissions.student": userId,
                            "pdfs.submissions.student": userId
                        }
                    }
                );

                // Delete user
                await Users.deleteOne({ _id: userId });

                // Send post-deletion email
                await sendEmail(user.email, "Account Deleted", "Your account and all your data have been deleted.");
            }
        }

    } catch (err) {
        console.error("Error in cleanup process:", err);
    }
};

// Schedule daily cleanup
cron.schedule("0 0 * * *", () => cleanExpiredUsers());
