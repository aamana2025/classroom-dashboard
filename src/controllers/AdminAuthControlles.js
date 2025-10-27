import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { resendPaymentEmail, sendOTPEmail } from "./emailController.js";
import Transaction from "../models/Transaction.js";
import Users from "../models/Users.js";
import Plan from "../models/Plan.js";
import Class from "../models/Class.js";
import PendingUser from "../models/PendingUser.js";
import cloudinary from "../config/cloudinary.js";
import { google } from "googleapis";

// Admin login
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(401).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: admin._id, role: admin.role, status: admin.status, email: admin.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );


        res.status(200).json({
            message: "Admin login successful",
            accessToken: token,
            admin: {
                _id: admin._id,
                name: admin.name,
                phone: admin.phone,
                email: admin.email,
                role: admin.role,
                status: admin.status,
            },
        });
    } catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
    }
};
export const reloginAdmin = async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findById(decoded.id).select("-password -resetOTP -resetOTPExpires");
        if (!admin) return res.status(401).json({ message: "Admin not found" });

        res.status(200).json({ admin });
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
// Add new admin
export const addAdmin = async (req, res) => {
    const { name, email, phone, password, role } = req.body;
    try {
        const existing = await Admin.findOne({ email });
        if (existing) return res.status(400).json({ message: "Admin already exists" });

        // Hash password here
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new Admin({
            name,
            email,
            phone,
            password: hashedPassword, // hashed in controller
            role: role || "admin",
        });

        await admin.save();
        res.status(201).json({ message: "Admin added successfully", admin });
    } catch (error) {
        res.status(500).json({ message: "Error adding admin", error: error.message });
    }
};
// Get all admins
export const getAdmins = async (req, res) => {
    try {
        const admins = await Admin.find().select("-password");
        res.json({ admins });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch admins", error: err.message });
    }
};
export const getAdminBYID = async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ Get one admin by ID and exclude password
        const admin = await Admin.findById(id).select("-password");

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found ❌" });
        }

        res.status(200).json({ success: true, admin });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch admin ❌",
            error: err.message,
        });
    }
};
// Update admin info
export const updateAdmin = async (req, res) => {
    const { adminId } = req.params;
    const { name, phone, email, password, role, status } = req.body;
    try {
        const admin = await Admin.findById(adminId);
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        if (name) admin.name = name;
        if (email) admin.email = email;
        if (role) admin.role = role;
        if (status) admin.status = status;
        if (phone) admin.phone = phone;
        if (password) admin.password = await bcrypt.hash(password, 10);

        await admin.save();
        // Convert to object and remove password
        const newadmin = admin.toObject();
        delete newadmin.password;

        res.json({ message: "Admin updated successfully", newadmin });
    } catch (err) {
        console.log(err);

        res.status(500).json({ message: "Failed to update admin", error: err.message });
    }
};
// Delete admin
export const deleteAdmin = async (req, res) => {
    const { adminId } = req.params;

    try {
        const admin = await Admin.findByIdAndDelete(adminId);
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        res.json({ message: "Admin deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete admin", error: err.message });
    }
};
export const forgotAdminPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        admin.resetOTP = otp;
        admin.resetOTPExpires = expiry;
        await admin.save();

        const encodedEmail = encodeURIComponent(admin.email);
        const resetLink = `${process.env.FRONTEND_URL}/Pages/Auth/reset-password/${encodedEmail}/${otp}`;

        await sendOTPEmail(admin, otp, resetLink);

        res.json({ message: "OTP sent to your email" });
    } catch (err) {
        res.status(500).json({ message: "Failed to send OTP", error: err.message });
    }
};
// --- Reset Password ---
export const resetAdminPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const admin = await Admin.findOne({ email });

        if (!admin || !admin.resetOTP || !admin.resetOTPExpires)
            return res.status(400).json({ message: "Invalid or expired OTP" });

        if (admin.resetOTP !== otp)
            return res.status(400).json({ message: "Incorrect OTP" });

        if (admin.resetOTPExpires < new Date())
            return res.status(400).json({ message: "OTP expired" });

        // Hash new password
        admin.password = await bcrypt.hash(newPassword, 10);

        // Clear OTP
        admin.resetOTP = null;
        admin.resetOTPExpires = null;

        await admin.save();

        res.json({ message: "Password reset successful" });
    } catch (err) {
        res.status(500).json({ message: "Password reset failed", error: err.message });
    }
};
// Get all transactions (admin)
// ✅ Get all transactions
export const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate("user", "name email phone status plan") // active user
            .populate("pendingUser", "name email phone planId status") // before activation
            .populate("plan", "title price durationValue durationType") // plan details
            .sort({ createdAt: -1 }); // newest first

        // format response
        const formatted = transactions.map(tx => ({
            id: tx._id,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            stripeSessionId: tx.stripeSessionId,
            stripePaymentId: tx.stripePaymentId,
            checkoutUrl: tx.checkoutUrl,
            createdAt: tx.createdAt,

            // user info (if activated)
            user: tx.user
                ? {
                    id: tx.user._id,
                    name: tx.user.name,
                    email: tx.user.email,
                    phone: tx.user.phone,
                    status: tx.user.status,
                }
                : null,

            // pending user (before activation)
            pendingUser: tx.pendingUser
                ? {
                    id: tx.pendingUser._id,
                    name: tx.pendingUser.name,
                    email: tx.pendingUser.email,
                    phone: tx.pendingUser.phone,
                    status: tx.pendingUser.status,
                }
                : null,

            // plan info
            plan: tx.plan
                ? {
                    id: tx.plan._id,
                    title: tx.plan.title,
                    price: tx.plan.price,
                    duration: `${tx.plan.durationValue} ${tx.plan.durationType}`,
                }
                : null,
        }));

        res.status(200).json({ success: true, count: formatted.length, data: formatted });
    } catch (err) {
        console.error("❌ Error fetching transactions:", err);
        res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
};
// ✅ Get All Students (Admin)
export const getAllStudents = async (req, res) => {
    try {
        const students = await Users.find()
            .populate("plan", "title price durationValue durationType") // only needed fields from plan
            .populate("classes", "name"); // ✅ only class name instead of full object

        const result = await Promise.all(
            students.map(async (student) => {
                const transactions = await Transaction.find({ user: student._id })
                    .populate("plan", "title price durationValue durationType");

                // ✅ convert plan price for student
                const studentPlan = student.plan
                    ? {
                        ...student.plan.toObject(),
                        price: (student.plan.price / 100).toFixed(2),
                    }
                    : null;

                // ✅ convert plan price for transactions
                const formattedTransactions = transactions.map((t) => ({
                    ...t.toObject(),
                    plan: t.plan
                        ? {
                            ...t.plan.toObject(),
                            price: (t.plan.price / 100).toFixed(2),
                        }
                        : null,
                }));

                return {
                    id: student._id,
                    name: student.name,
                    email: student.email,
                    phone: student.phone,
                    status: student.status,
                    paymentURL: student.paymentURL,
                    plan: studentPlan,
                    classes: student.classes.map((cls) => ({
                        id: cls._id,
                        name: cls.name,
                    })),
                    transactions: formattedTransactions,
                    createdAt: student.createdAt,
                };
            })
        );

        res.json(result);
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// ✅ Get pending (unpayed) Students (Admin)
export const pendingUsers = async (req, res) => {
    try {
        // 1️⃣ Get all pending users
        const users = await PendingUser.find()
            .populate("planId", "title price durationValue durationType") // populate plan details
            .sort({ createdAt: -1 }); // newest first

        // 2️⃣ Map users to include transactions and formatted data
        const usersWithData = await Promise.all(
            users.map(async (user) => {
                // Get transaction related to this pending user
                const transaction = await Transaction.findOne({ pendingUser: user._id })
                    .populate("plan", "title price durationValue durationType");

                // Check if expired: MongoDB TTL expires '1d', but we can calculate manually
                const now = new Date();
                const expireDate = new Date(user.createdAt);
                expireDate.setDate(expireDate.getDate() + 1); // 1 day TTL
                const isExpired = now > expireDate;

                return {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    status: user.status,
                    createdAt: user.createdAt,
                    expireAt: expireDate,
                    isExpired,
                    plan: user.planId
                        ? {
                            id: user.planId._id,
                            title: user.planId.title,
                            price: (user.planId.price / 100).toFixed(2),
                            durationValue: user.planId.durationValue,
                            durationType: user.planId.durationType,
                        }
                        : null,
                    transaction: transaction
                        ? {
                            id: transaction._id,
                            stripeSessionId: transaction.stripeSessionId,
                            stripePaymentId: transaction.stripePaymentId,
                            amount: (transaction.amount / 100).toFixed(2),
                            currency: transaction.currency,
                            status: transaction.status,
                            plan: transaction.plan
                                ? {
                                    id: transaction.plan._id,
                                    title: transaction.plan.title,
                                    price: (transaction.plan.price / 100).toFixed(2),
                                    durationValue: transaction.plan.durationValue,
                                    durationType: transaction.plan.durationType,
                                }
                                : null,
                            checkoutUrl: transaction.checkoutUrl,
                            createdAt: transaction.createdAt,
                        }
                        : null,
                    checkoutUrl: user.checkoutUrl,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "Pending users fetched successfully ✅",
            data: usersWithData,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch pending users ❌",
            error: err.message,
        });
    }
}
export const getAllClasses = async (req, res) => {
    try {
        const classes = await Class.find().populate("students", "_id"); // only fetch student ids

        const result = classes.map((cls) => ({
            id: cls._id,
            name: cls.name,
            description: cls.description,
            studentsCount: cls.students.length,
            videosCount: cls.videos.length,
            pdfsCount: cls.pdfs.length,
            tasksCount: cls.tasks.length,
            status: cls.status,
            createdAt: cls.createdAt,
        }));

        res.json(result);
    } catch (error) {
        console.error("Error fetching classes:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// ✅ GET Class by ID
export const getclassByID = async (req, res) => {
    try {
        const { id } = req.params;

        // Find class (no populate needed since we only want count)
        const classData = await Class.findById(id).lean();

        if (!classData) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Build response with only required fields
        const response = {
            _id: classData._id,
            name: classData.name,
            description: classData.description,
            status: classData.status,
            createdAt: classData.createdAt,
            studentsCount: classData.students ? classData.students.length : 0,
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching class:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// ✅ UPDATE Class by ID (only name, description, status)
export const updateClassByID = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;

        // Validate status if provided
        if (status && !["active", "pending"].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        // Build update object dynamically (only provided fields)
        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (status) updateData.status = status;

        const updatedClass = await Class.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true, lean: true }
        );

        if (!updatedClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        res.status(200).json({
            message: "Class updated successfully",
            class: {
                _id: updatedClass._id,
                name: updatedClass.name,
                description: updatedClass.description,
                status: updatedClass.status,
                createdAt: updatedClass.createdAt,
            },
        });
    } catch (error) {
        console.error("Error updating class:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ✅ إضافة كلاس جديد
export const addClasses = async (req, res) => {
    try {
        const { name, description } = req.body;

        // تحقق من البيانات
        if (!name) {
            return res.status(400).json({ message: "اسم الكلاس مطلوب" });
        }

        // إنشاء كلاس جديد
        const newClass = new Class({
            name,
            description,
            status: "active", // نخليها دايمًا active
            videos: [],
            pdfs: [],
            tasks: [],
            students: [],
        });

        await newClass.save();

        res.status(201).json({
            message: "تم إنشاء الكلاس بنجاح",
            class: newClass,
        });
    } catch (error) {
        console.error("Error adding class:", error);
        res.status(500).json({ message: "خطأ في الخادم" });
    }
};

// resendPaymentLink by admin dash
export const resendPaymentLink = async (req, res) => {
    try {
        const { email, url, time } = req.body;

        // ✅ التحقق من المدخلات
        if (!email || !url || !time) {
            return res.status(400).json({ success: false, message: "البيانات غير مكتملة (email, url, time مطلوبة)" });
        }

        // ✅ إرسال الإيميل
        await resendPaymentEmail(email, url, time);

        return res.status(200).json({
            success: true,
            message: "✅ تم إرسال رابط الدفع بنجاح إلى البريد الإلكتروني",
        });
    } catch (error) {
        console.error("❌ Error in resendPaymentLink:", error);
        return res.status(500).json({
            success: false,
            message: "فشل في إرسال البريد الإلكتروني",
            error: error.message,
        });
    }
};


export const deleteClasses = async (req, res) => {
    try {
        const { id } = req.params;

        // 1️⃣ Find class
        const classDoc = await Class.findById(id);
        if (!classDoc) {
            return res.status(404).json({ success: false, message: "Class not found" });
        }

        // 2️⃣ Delete videos (YouTube if possible)
        for (const video of classDoc.videos) {
            try {
                const yt_token = req.headers.authorization?.split(" ")[1];
                if (yt_token) {
                    const oauth2Client = new google.auth.OAuth2(
                        process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET,
                        process.env.GOOGLE_REDIRECT_URI
                    );
                    oauth2Client.setCredentials({ access_token: yt_token });

                    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
                    await youtube.videos.delete({ id: video.videoId });

                    console.log(`✅ Deleted YouTube video: ${video.videoId}`);
                }
            } catch (ytErr) {
                console.error("❌ YouTube delete error:", ytErr.response?.data || ytErr.message);
            }
        }

        // 3️⃣ Delete PDFs from Cloudinary
        for (const pdf of classDoc.pdfs) {
            if (pdf.public_id) {
                await cloudinary.uploader.destroy(pdf.public_id, {
                    resource_type: "raw",
                    type: "private",
                });
            }
        }

        // 4️⃣ Delete tasks + their submissions from Cloudinary
        for (const task of classDoc.tasks) {
            if (task.public_id) {
                await cloudinary.uploader.destroy(task.public_id, {
                    resource_type: "raw",
                    type: "private",
                });
            }

            if (task.submissions && task.submissions.length > 0) {
                for (const sub of task.submissions) {
                    if (sub.public_id) {
                        await cloudinary.uploader.destroy(sub.public_id, {
                            resource_type: "raw",
                            type: "private",
                        });
                    }
                }
            }
        }

        // 5️⃣ Remove class reference from all students
        await Users.updateMany(
            { classes: id },
            { $pull: { classes: id } }
        );

        // 6️⃣ Finally delete class itself
        await Class.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Class and all related data deleted successfully",
        });
    } catch (err) {
        console.error("❌ Error deleting class:", err);
        res.status(500).json({ success: false, message: "Failed to delete class" });
    }
};



// class matrial
//notes
export const addNoteClasses = async (req, res) => {
    const { id } = req.params;      // class id
    const { msg } = req.body;       // message text

    if (!msg) {
        return res.status(400).json({ success: false, message: "Message is required" });
    }

    try {
        const updatedClass = await Class.findByIdAndUpdate(
            id,
            { $push: { notes: { msg } } },  // push new note
            { new: true }                   // return updated class
        );

        if (!updatedClass) {
            return res.status(404).json({ success: false, message: "Class not found" });
        }

        res.status(201).json({ success: true, notes: updatedClass.notes });
    } catch (err) {
        console.error("❌ Error adding note:", err);
        res.status(500).json({ success: false, message: "Failed to add note" });
    }
};
// GET /classes/:id/notes
export const getNotesClasses = async (req, res) => {
    try {
        const cls = await Class.findById(req.params.id).select("notes");

        if (!cls) {
            return res.status(404).json({ success: false, message: "Class not found" });
        }

        res.status(200).json({ success: true, notes: cls.notes });
    } catch (err) {
        console.error("❌ Error fetching notes:", err);
        res.status(500).json({ success: false, message: "Failed to fetch notes" });
    }
};
// PUT /classe/:id/notes/:noteId
export const updateNoteClasses = async (req, res) => {
    const { id, noteId } = req.params;
    const { msg } = req.body;

    if (!msg) {
        return res.status(400).json({ success: false, message: "Message is required" });
    }

    try {
        const cls = await Class.findOneAndUpdate(
            { _id: id, "notes._id": noteId },
            { $set: { "notes.$.msg": msg } },   // update message
            { new: true }
        );

        if (!cls) {
            return res.status(404).json({ success: false, message: "Class or note not found" });
        }

        res.status(200).json({ success: true, notes: cls.notes });
    } catch (err) {
        console.error("❌ Error updating note:", err);
        res.status(500).json({ success: false, message: "Failed to update note" });
    }
};
// DELETE /classe/:id/notes/:noteId

export const deleteNoteClasses = async (req, res) => {
    const { id, noteId } = req.params;

    try {
        const cls = await Class.findByIdAndUpdate(
            id,
            { $pull: { notes: { _id: noteId } } },  // remove note
            { new: true }
        );

        if (!cls) {
            return res.status(404).json({ success: false, message: "Class or note not found" });
        }

        res.status(200).json({ success: true, notes: cls.notes });
    } catch (err) {
        console.error("❌ Error deleting note:", err);
        res.status(500).json({ success: false, message: "Failed to delete note" });
    }
};
// student
// ✅ Get all classes for a student with student details
export const getStudentClasses = async (req, res) => {
    try {
        const { id } = req.params; // class id

        // ✅ Find class and populate student details
        const classData = await Class.findById(id).populate({
            path: "students",
            select: "name email phone status createdAt", // only these fields
        });

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Class not found ❌",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Students fetched successfully ✅",
            students: classData.students, // populated array
        });
    } catch (error) {
        console.error("Error fetching students of class:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch students ❌",
            error: error.message,
        });
    }
};

export const KickStudentClasses = async (req, res) => {
    try {
        const { classId, studentId } = req.params;

        // 1️⃣ Find class
        const classDoc = await Class.findById(classId);
        if (!classDoc)
            return res.status(404).json({ success: false, message: "Class not found" });

        // 2️⃣ Find student
        const userDoc = await Users.findById(studentId);
        if (!userDoc)
            return res.status(404).json({ success: false, message: "Student not found" });

        // 3️⃣ Remove student from class
        const studentIndex = classDoc.students.indexOf(studentId);
        if (studentIndex === -1)
            return res.status(404).json({ success: false, message: "Student not in class" });

        classDoc.students.splice(studentIndex, 1);
        await classDoc.save();

        // 4️⃣ Remove class from user
        const classIndex = userDoc.classes.indexOf(classId);
        if (classIndex !== -1) {
            userDoc.classes.splice(classIndex, 1);
            await userDoc.save();
        }

        // ✅ Done
        res.json({
            success: true,
            message: "تم طرد الطالب بنجاح",
            studentId,
            classId,
        });
    } catch (err) {
        console.error("Kick student error:", err);
        res.status(500).json({ success: false, message: "فشل في طرد الطالب" });
    }
};

// files (FDB)
// ✅ Upload PDF (private)
export const addFilesClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { name, description } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "No PDF uploaded" });
        }

        // Upload to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                folder: "classroom/pdfs",
                format: "pdf",
                type: "private", // ensures private access
            },
            async (error, file) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return res.status(500).json({ message: error.message });
                }

                // ✅ Match schema (public_id + url + metadata)
                const newPdf = {
                    public_id: file.public_id,
                    url: file.secure_url, // <--- FIX: add this
                    name,
                    description,
                    addedAt: new Date(),
                };

                // Push to class
                const updatedClass = await Class.findByIdAndUpdate(
                    classId,
                    { $push: { pdfs: newPdf } },
                    { new: true }
                );

                if (!updatedClass) {
                    return res.status(404).json({ message: "Class not found" });
                }

                res.status(201).json({
                    message: "PDF uploaded successfully",
                    pdf: newPdf,
                    class: updatedClass,
                });
            }
        );

        // Send buffer to Cloudinary
        uploadStream.end(req.file.buffer);

    } catch (err) {
        console.error("Add file error:", err);
        res.status(500).json({ message: err.message });
    }
};
// ✅ Update PDF
export const updateFilesClass = async (req, res) => {
    try {
        const { classId, pdfId } = req.params;
        const { name, description } = req.body;

        // Find the class
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Find the PDF
        const pdf = classDoc.pdfs.id(pdfId);
        if (!pdf) {
            return res.status(404).json({ message: "PDF not found" });
        }

        // If a new file is uploaded -> replace in Cloudinary
        if (req.file) {
            // Delete old file from Cloudinary
            await cloudinary.uploader.destroy(pdf.public_id, {
                resource_type: "raw",
                type: "private",
            });

            // Upload new PDF
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: "raw",
                    folder: "classroom/pdfs",
                    format: "pdf",
                    type: "private",
                },
                async (error, file) => {
                    if (error) {
                        console.error("Cloudinary upload error:", error);
                        return res.status(500).json({ message: error.message });
                    }

                    // Update fields
                    pdf.public_id = file.public_id;
                    pdf.url = file.secure_url;
                    if (name) pdf.name = name;
                    if (description) pdf.description = description;
                    pdf.addedAt = new Date();

                    await classDoc.save();

                    res.status(200).json({
                        message: "PDF updated successfully (file replaced)",
                        pdf,
                        class: classDoc,
                    });
                }
            );

            // Send buffer to Cloudinary
            uploadStream.end(req.file.buffer);
        } else {
            // Only update metadata
            if (name) pdf.name = name;
            if (description) pdf.description = description;

            await classDoc.save();

            res.status(200).json({
                message: "PDF metadata updated successfully",
                pdf,
                class: classDoc,
            });
        }
    } catch (err) {
        console.error("Update file error:", err);
        res.status(500).json({ message: err.message });
    }
};
// ✅ Delete PDF (private)
export const deleteFilesClass = async (req, res) => {
    try {
        const { classId, pdfId } = req.params;

        // Find class
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Find the PDF inside class
        const pdf = classDoc.pdfs.id(pdfId);
        if (!pdf) {
            return res.status(404).json({ message: "PDF not found" });
        }

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(pdf.public_id, {
            resource_type: "raw", // important for PDFs
            type: "private"
        });

        // Remove from array
        pdf.deleteOne();

        // Save updated class
        await classDoc.save();

        res.status(200).json({
            message: "PDF deleted successfully",
            class: classDoc
        });

    } catch (err) {
        console.error("Delete file error:", err);
        res.status(500).json({ message: err.message });
    }
};
// ✅ Get single PDF (admin → long signed URL)
export const getFilesClass = async (req, res) => {
    try {
        const { classId, pdfId } = req.params;

        const classroom = await Class.findById(classId);
        if (!classroom) return res.status(404).json({ message: "Class not found" });

        const pdf = classroom.pdfs.id(pdfId);
        if (!pdf) return res.status(404).json({ message: "PDF not found" });

        // Generate signed URL valid for 24h
        const signedUrl = cloudinary.v2.utils.private_download_url(
            pdf.public_id,
            "pdf",
            {
                resource_type: "raw",
                expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
            }
        );

        res.json({ url: signedUrl });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// ✅ Get all PDFs (admin → with signed URLs)
export const getAllFilesClass = async (req, res) => {
    try {
        const { classId } = req.params;

        const classroom = await Class.findById(classId);
        if (!classroom) {
            return res.status(404).json({ message: "Class not found" });
        }

        const pdfs = classroom.pdfs.map((pdf) => {
            const signedUrl = cloudinary.utils.private_download_url(
                pdf.public_id,
                "pdf",
                {
                    resource_type: "raw",
                    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
                }
            );

            return {
                _id: pdf._id,
                name: pdf.name,
                description: pdf.description,
                addedAt: pdf.addedAt,
                url: signedUrl,
            };
        });

        res.json({ pdfs });
    } catch (err) {
        console.error("Get PDFs error:", err);
        res.status(500).json({ message: err.message });
    }
};

// tasks
// ✅ Add Task (upload PDF)
export const addTaskClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { name, description } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "No task PDF uploaded" });
        }

        // Upload to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                folder: "classroom/tasks",
                format: "pdf",
                type: "private", // secure
            },
            async (error, file) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return res.status(500).json({ message: error.message });
                }

                const newTask = {
                    public_id: file.public_id,
                    url: file.secure_url,
                    name,
                    description,
                    addedAt: new Date(),
                };

                const updatedClass = await Class.findByIdAndUpdate(
                    classId,
                    { $push: { tasks: newTask } },
                    { new: true }
                );

                if (!updatedClass) {
                    return res.status(404).json({ message: "Class not found" });
                }

                res.status(201).json({
                    message: "Task uploaded successfully",
                    task: newTask,
                    class: updatedClass,
                });
            }
        );

        uploadStream.end(req.file.buffer);

    } catch (err) {
        console.log(err);

        console.error("Add task error:", err);
        res.status(500).json({ message: err.message });
    }
};
// ✅ Update Task
export const updateTaskClass = async (req, res) => {
    try {
        const { classId, taskId } = req.params;
        const { name, description } = req.body;

        const classDoc = await Class.findById(classId);
        if (!classDoc) return res.status(404).json({ message: "Class not found" });

        const task = classDoc.tasks.id(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (req.file) {
            // Delete old
            await cloudinary.uploader.destroy(task.public_id, {
                resource_type: "raw",
                type: "private",
            });

            // Upload new PDF
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: "raw",
                    folder: "classroom/tasks",
                    format: "pdf",
                    type: "private",
                },
                async (error, file) => {
                    if (error) {
                        console.error("Cloudinary upload error:", error);
                        return res.status(500).json({ message: error.message });
                    }

                    task.public_id = file.public_id;
                    task.url = file.secure_url;
                    if (name) task.name = name;
                    if (description) task.description = description;
                    task.addedAt = new Date();

                    await classDoc.save();

                    res.status(200).json({
                        message: "Task updated successfully (file replaced)",
                        task,
                        class: classDoc,
                    });
                }
            );

            uploadStream.end(req.file.buffer);
        } else {
            if (name) task.name = name;
            if (description) task.description = description;

            await classDoc.save();

            res.status(200).json({
                message: "Task metadata updated successfully",
                task,
                class: classDoc,
            });
        }
    } catch (err) {
        console.error("Update task error:", err);
        res.status(500).json({ message: err.message });
    }
};
// ✅ Delete Task
export const deleteTaskClass = async (req, res) => {
    try {
        const { classId, taskId } = req.params;

        const classDoc = await Class.findById(classId);
        if (!classDoc) return res.status(404).json({ message: "Class not found" });

        const task = classDoc.tasks.id(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // 1️⃣ Delete all submission files first
        if (task.submissions && task.submissions.length > 0) {
            const deletePromises = task.submissions.map((sub) => {
                if (sub.public_id) {
                    return cloudinary.uploader.destroy(sub.public_id, {
                        resource_type: "raw",
                        type: "private",
                    });
                }
            });
            await Promise.all(deletePromises);
        }

        // 2️⃣ Delete the task file itself from Cloudinary
        if (task.public_id) {
            await cloudinary.uploader.destroy(task.public_id, {
                resource_type: "raw",
                type: "private",
            });
        }

        // 3️⃣ Remove the task from DB
        task.deleteOne();
        await classDoc.save();

        res.status(200).json({
            message: "Task and all its solutions deleted successfully",
            class: classDoc,
        });
    } catch (err) {
        console.error("Delete task error:", err);
        res.status(500).json({ message: err.message });
    }
};


// ✅ Get single Task (24h signed link)
export const getTaskClass = async (req, res) => {
    try {
        const { classId, taskId } = req.params;

        const classroom = await Class.findById(classId);
        if (!classroom) return res.status(404).json({ message: "Class not found" });

        const task = classroom.tasks.id(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const signedUrl = cloudinary.utils.private_download_url(
            task.public_id,
            "pdf",
            {
                resource_type: "raw",
                expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
            }
        );

        res.json({ url: signedUrl });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// ✅ Get all Tasks (24h signed links)
export const getAllTasksClass = async (req, res) => {
    try {
        const { classId } = req.params;

        const classroom = await Class.findById(classId);
        if (!classroom) return res.status(404).json({ message: "Class not found" });

        const tasks = classroom.tasks.map((task) => {
            const signedUrl = cloudinary.utils.private_download_url(
                task.public_id,
                "pdf",
                {
                    resource_type: "raw",
                    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
                }
            );

            return {
                _id: task._id,
                name: task.name,
                description: task.description,
                addedAt: task.addedAt,
                url: signedUrl,
            };
        });

        res.json({ tasks });
    } catch (err) {
        console.error("Get tasks error:", err);
        res.status(500).json({ message: err.message });
    }
};

// get solve

// 📌 Get Task + Submissions (Admin)
export const getTaskSubmissionsAdmin = async (req, res) => {
    try {
        const { classId, taskId } = req.params;

        // Find class and populate student data
        const classroom = await Class.findById(classId)
            .populate("tasks.submissions.student", "name email phone"); // populate student info

        if (!classroom) return res.status(404).json({ message: "Class not found" });

        const task = classroom.tasks.id(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // ✅ Build response
        const result = {
            task: {
                _id: task._id,
                name: task.name,
                description: task.description,
                url: task.url, // original task file
            },
            submissions: task.submissions.map((sub) => ({
                student: {
                    name: sub.student?.name,
                    email: sub.student?.email,
                    phone: sub.student?.phone,
                },
                solution: {
                    url: sub.url,
                    submittedAt: sub.submittedAt,
                },
            })),
        };

        res.json(result);
    } catch (err) {
        console.error("Get submissions error:", err);
        res.status(500).json({ message: err.message });
    }
};

export const getTaskesSubmissions = async (req, res) => {
    try {
        const { classId } = req.params;
        const classroom = await Class.findById(classId)
            .populate("tasks.submissions.student", "name email phone");

        if (!classroom) return res.status(404).json({ message: "Class not found" });

        const expireTime = Math.floor(Date.now() / 1000) + 60 * 60 * 12; // 12h

        const tasks = classroom.tasks.map((task) => {
            // signed url for the task pdf
            const taskSignedUrl = cloudinary.utils.private_download_url(
                task.public_id,
                "pdf",
                {
                    resource_type: "raw",
                    expires_at: expireTime,
                }
            );

            return {
                _id: task._id,
                name: task.name,
                description: task.description,
                addedAt: task.addedAt,
                url: taskSignedUrl,
                submissions: task.submissions.map((sub) => {
                    // signed url for each submission
                    const subSignedUrl = cloudinary.utils.private_download_url(
                        sub.public_id,
                        "pdf",
                        {
                            resource_type: "raw",
                            expires_at: expireTime,
                        }
                    );

                    return {
                        student: {
                            name: sub.student?.name,
                            email: sub.student?.email,
                            phone: sub.student?.phone,
                        },
                        solution: {
                            url: subSignedUrl,
                            submittedAt: sub.submittedAt,
                        },
                    };
                }),
            };
        });

        res.json({ tasks });
    } catch (err) {
        console.error("Get submissions error:", err);
        res.status(500).json({ message: "failed get submissions", error: err.message });
    }
};

// POST /api/classes/:classId/videos

export const uploadVideo = async (req, res) => {
    try {
        const { classId } = req.params;
        const { videoId, name, description } = req.body;

        // Find the class
        const classroom = await Class.findById(classId);
        if (!classroom) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Create new video object
        const newVideo = {
            videoId,
            name,
            description,
            uploadedAt: new Date(),
        };

        // Push into videos array
        classroom.videos.push(newVideo);

        // Save class
        await classroom.save();

        res.status(201).json({
            message: "Video added successfully",
            video: newVideo,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/classes/:classId/videos
export const getVideos = async (req, res) => {
    try {
        const { classId } = req.params;

        const classroom = await Class.findById(classId).select("videos");
        if (!classroom) {
            return res.status(404).json({ message: "Class not found" });
        }

        res.status(200).json({ videos: classroom.videos });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// DELETE /api/admin/classe/:classId/video/:videoId

export const deleteVideo = async (req, res) => {
    try {
        const { classId, videoId } = req.params;

        // ✅ 1. جيب الكلاس
        const classroom = await Class.findById(classId);
        if (!classroom) {
            return res.status(404).json({ message: "Class not found" });
        }

        // ✅ 2. جيب الفيديو بالـ _id
        const video = classroom.videos.id(videoId);
        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }

        // ✅ 3. احذف من YouTube (لو فيه access_token صح)
        try {
            const yt_token = req.headers.authorization?.split(" ")[1];
            if (!yt_token) {
                console.warn("⚠️ No YouTube access token provided, skipping YouTube delete.");
            } else {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    process.env.GOOGLE_REDIRECT_URI
                );
                oauth2Client.setCredentials({ access_token: yt_token });

                const youtube = google.youtube({ version: "v3", auth: oauth2Client });
                await youtube.videos.delete({ id: video.videoId });

                console.log(`✅ Video deleted from YouTube: ${video.videoId}`);
            }
        } catch (ytErr) {
            console.error("❌ YouTube Delete Error:", ytErr.response?.data || ytErr.message);
        }

        // ✅ 4. امسح الفيديو من MongoDB
        classroom.videos = classroom.videos.filter(
            (v) => v._id.toString() !== videoId
        );
        await classroom.save();

        res.status(200).json({ message: "Video deleted successfully" });
    } catch (err) {
        console.error("❌ Error deleting video:", err);
        res.status(500).json({ message: err.message });
    }
};


export const getdashReport = async (req, res) => {
    try {
        // 1️⃣ Students
        const totalStudents = await Users.countDocuments();
        const activeStudents = await Users.countDocuments({ status: "active" });
        const inactiveStudents = totalStudents - activeStudents;

        // 2️⃣ Earnings
        const totalEarningsAgg = await Transaction.aggregate([
            { $match: { status: "succeeded" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalEarnings = totalEarningsAgg[0]?.total || 0;

        // 3️⃣ Classes
        const totalClasses = await Class.countDocuments({ status: "active" });

        // 4️⃣ Plans
        const totalPlans = await Plan.countDocuments();

        // 5️⃣ Files (PDFs + Tasks)
        const allClasses = await Class.find();
        let totalFiles = 0;
        let totalVideos = 0;
        let totalTasks = 0;
        allClasses.forEach((cls) => {
            totalFiles += cls.pdfs.length;
            totalVideos += cls.videos.length;
            totalTasks += cls.tasks.length;
        });

        // 6️⃣ Additional reports
        const pendingUsers = await PendingUser.countDocuments();
        const expiredSubscriptions = await Users.countDocuments({ expiresAt: { $lt: new Date() } });
        const activeSubscriptions = await Users.countDocuments({ expiresAt: { $gte: new Date() }, status: "active" });
        const totalTransactions = await Transaction.countDocuments();
        const failedTransactions = await Transaction.countDocuments({ status: "failed" });

        const reports = [
            {
                title: "إجمالي الطلاب",
                description: "عدد الطلاب المسجلين.",
                icon: "FaUsers",
                value: totalStudents,
            },
            {
                title: "الطلاب النشطون",
                description: "عدد الطلاب المتفاعلين.",
                icon: "FaUserCheck",
                value: activeStudents,
            },
            {
                title: "الطلاب غير النشطين",
                description: "عدد الطلاب غير المتفاعلين.",
                icon: "FaUserSlash",
                value: inactiveStudents,
            },
            {
                title: "إجمالي الأرباح",
                description: "الأرباح المحققة حتى الآن.",
                icon: "FaDollarSign",
                value: `$${(totalEarnings / 100).toFixed(2)}`, // assuming amount is in cents
            },
            {
                title: "الكلاسات النشطة",
                description: "عدد الكلاسات الحالية.",
                icon: "FaChalkboardTeacher",
                value: totalClasses,
            },
            {
                title: "الخطط التعليمية",
                description: "عدد الخطط المتاحة.",
                icon: "FaClipboardList",
                value: totalPlans,
            },
            {
                title: "عدد الملفات",
                description: "إجمالي الملفات المرفوعة.",
                icon: "FaFileAlt",
                value: totalFiles,
            },
            {
                title: "عدد الفيديوهات",
                description: "إجمالي الفيديوهات التعليمية.",
                icon: "FaVideo",
                value: totalVideos,
            },
            {
                title: "عدد الأمتحانات",
                description: "إجمالي المهام المضافة.",
                icon: "FaTasks",
                value: totalTasks,
            },
            // ➕ Additional reports
            {
                title: "الطلاب المنتظرين الدفع",
                description: "عدد الطلاب الذين لم يتم تفعيل حسابهم بعد.",
                icon: "FaUserClock",
                value: pendingUsers,
            },
            {
                title: "الاشتراكات المنتهية",
                description: "عدد الطلاب الذين انتهت صلاحية اشتراكهم.",
                icon: "FaHourglassEnd",
                value: expiredSubscriptions,
            },
            {
                title: "الاشتراكات النشطة",
                description: "عدد الطلاب المشتركين حالياً.",
                icon: "FaCheckCircle",
                value: activeSubscriptions,
            },
            {
                title: "عدد المعاملات",
                description: "إجمالي المعاملات المالية.",
                icon: "FaReceipt",
                value: totalTransactions,
            },
            {
                title: "المعاملات الفاشلة",
                description: "عدد المعاملات التي لم تكتمل بنجاح.",
                icon: "FaTimesCircle",
                value: failedTransactions,
            },
        ];

        res.status(200).json({ reports });
    } catch (err) {
        console.error("Get Dashboard Report Error:", err);
        res.status(500).json({ error: "فشل في جلب البيانات", details: err.message });
    }
};

export const gethomeReport = async (req, res) => {
    try {
        const totalStudents = await Users.countDocuments();
        // 2️⃣ Earnings
        const totalEarningsAgg = await Transaction.aggregate([
            { $match: { status: "succeeded" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalEarnings = totalEarningsAgg[0]?.total || 0;

        const totalClasses = await Class.countDocuments();
        const reports = [
            {
                title: "إجمالي الطلاب",
                description: "عدد الطلاب المسجلين.",
                icon: "FaUsers",
                value: totalStudents,
            },
            {
                title: "الكلاسات",
                description: "عدد الكلاسات",
                icon: "FaChalkboardTeacher",
                value: totalClasses,
            },
            {
                title: "إجمالي الأرباح",
                description: "الأرباح المحققة حتى الآن.",
                icon: "FaDollarSign",
                value: `$${(totalEarnings / 100).toFixed(2)}`, // assuming amount is in cents
            },
        ]

        res.status(200).json({ reports });


    } catch (err) {
        console.error("Get Dashboard Report Error:", err);
        res.status(500).json({ error: "فشل في جلب البيانات", details: err.message });
    }
}

export const createSubscripe = async (req, res) => {
    try {
        const { name, email, password, phone, planId } = req.body;

        if (!name || !email || !password || !planId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if user already exists
        const existingUser = await Users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Check if plan exists
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }
        // Calculate expiration date
        let expiresAt = new Date();
        switch (plan.durationType) {
            case "day":
                expiresAt.setDate(expiresAt.getDate() + plan.durationValue);
                break;
            case "week":
                expiresAt.setDate(expiresAt.getDate() + plan.durationValue * 7);
                break;
            case "month":
                expiresAt.setMonth(expiresAt.getMonth() + plan.durationValue);
                break;
            case "year":
                expiresAt.setFullYear(expiresAt.getFullYear() + plan.durationValue);
                break;
        }

        const hashed = await bcrypt.hash(password, 10);
        // Create user (status pending until approved manually)
        const user = await Users.create({
            name,
            email,
            password: hashed,
            phone,
            plan: plan._id,
            status: "active",
            expiresAt
        });

        // Create transaction record
        const transaction = await Transaction.create({
            user: user._id,
            amount: plan.price,
            currency: "KWD",
            status: "succeeded",
            plan: plan._id,
        });

        return res.status(201).json({
            message: "Subscription request created successfully",
            user,
            transaction,
        });
    } catch (error) {
        console.error("Error in createSubscripe:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

// 🟡 Re-subscribe (existing user renewing)
export const reSubscripe = async (req, res) => {
    try {
        const { userId, planId } = req.body;

        if (!userId || !planId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const user = await Users.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: "Plan not found" });

        let expiresAt = new Date();
        switch (plan.durationType) {
            case "day":
                expiresAt.setDate(expiresAt.getDate() + plan.durationValue);
                break;
            case "week":
                expiresAt.setDate(expiresAt.getDate() + plan.durationValue * 7);
                break;
            case "month":
                expiresAt.setMonth(expiresAt.getMonth() + plan.durationValue);
                break;
            case "year":
                expiresAt.setFullYear(expiresAt.getFullYear() + plan.durationValue);
                break;
        }

        // Create transaction history record
        const transaction = await Transaction.create({
            user: user._id,
            amount: plan.price,
            currency: "KWD",
            status: "succeeded",
            plan: plan._id,
        });

        // Update user's plan and reset status
        user.plan = plan._id;
        user.status = "active";
        user.expiresAt = expiresAt;
        await user.save();

        return res.status(200).json({
            message: "Re-subscription request created successfully",
            user,
            transaction,
        });
    } catch (error) {
        console.error("Error in reSubscripe:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

export const getstudents = async (req, res) => {
    try {
        // 🔹 Find only users with status = "pending"
        const users = await Users.find({ status: "pending" });

        if (!users) {
            return res.status(404).json({
                success: false,
                message: "No pending users found ❌",
            });
        }

        res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        console.error("Error in get pending users:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error,
        });
    }
};