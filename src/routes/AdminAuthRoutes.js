import express from "express";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware.js";
import {
    addAdmin, addClasses, addFilesClass, addNoteClasses, addTaskClass,
    createSubscripe,
    deleteAdmin, deleteClasses, deleteFilesClass, deleteNoteClasses,
    deleteTaskClass, deleteVideo, forgotAdminPassword, getAdminBYID,
    getAdmins, getAllClasses, getAllFilesClass, getAllStudents, getAllTasksClass,
    getAllTransactions, getclassByID, getdashReport, getFilesClass, gethomeReport, getNotesClasses, getStudentClasses,
    getstudents,
    getTaskClass, getTaskesSubmissions, getTaskSubmissionsAdmin, getVideos, KickStudentClasses, loginAdmin,
    pendingUsers, reloginAdmin, resendPaymentLink, resetAdminPassword, reSubscripe, updateAdmin,
    updateClassByID, updateFilesClass, updateNoteClasses, updateTaskClass, uploadVideo
} from "../controllers/AdminAuthControlles.js";
import upload from "../middleware/multer.js";

const router = express.Router();

// Admin login (public)
router.post("/login", loginAdmin);
router.get("/me", reloginAdmin);
router.post("/forgot-password", forgotAdminPassword);
router.post("/reset-password", resetAdminPassword);

// Admin management routes
router.post("/auth/add", addAdmin);
router.get("/auth", getAdmins);
router.get("/auth/:id", getAdminBYID);
router.put("/auth/:adminId", updateAdmin);
router.delete("/auth/:adminId", deleteAdmin);

router.post("/classe/:classId/video", uploadVideo);
router.delete("/classe/:classId/video/:videoId", deleteVideo);

router.use(authMiddleware);

//transactions
router.get("/transactions", getAllTransactions);

//students
router.get("/students", getAllStudents);

//pending users
router.get("/pendingUsers", pendingUsers);

// resend payment line
router.post("/resend-payment-link", resendPaymentLink);

//classes
router.post("/classe/add", addClasses);
router.get("/classes", getAllClasses);
router.get("/classe/:id", getclassByID);
router.put("/classe/:id", updateClassByID);
router.delete("/classe/:id", deleteClasses);

// class matrial
//notes
router.get("/classe/:id/note", getNotesClasses);
router.post("/classe/:id/note", addNoteClasses);
router.put("/classe/:id/note/:noteId", updateNoteClasses);
router.delete("/classe/:id/note/:noteId", deleteNoteClasses);

//students
router.get("/classe/:id/student", getStudentClasses);
router.post("/classe/:classId/student/:studentId", KickStudentClasses);

//bdfs
router.post("/classe/:classId/file", upload.single("pdf"), addFilesClass);
router.put("/classe/:classId/file/:pdfId", upload.single("pdf"), updateFilesClass);
router.delete("/classe/:classId/file/:pdfId", deleteFilesClass);
router.get("/classe/:classId/file/:pdfId", getFilesClass);
router.get("/classe/:classId/Allfiles", getAllFilesClass);

//task 
router.post("/class/:classId/task", upload.single("task"), addTaskClass);
router.put("/class/:classId/task/:taskId", upload.single("task"), updateTaskClass);
router.delete("/class/:classId/task/:taskId", deleteTaskClass);
router.get("/class/:classId/task/:taskId", getTaskClass);
router.get("/class/:classId/tasks", getAllTasksClass);

//solve
router.get("/class/:classId/task/:taskId/submissions", getTaskSubmissionsAdmin);
router.get("/class/:classId/tasks/submissions", getTaskesSubmissions);

//video
// Upload video to a class
router.get("/classe/:classId/video", getVideos);

//report
router.get("/reportes", getdashReport);
router.get("/homeReport", gethomeReport);

// subscripe
router.post("/subscripe", createSubscripe);
router.post("/reSubscripe", reSubscripe);
router.get("/students-sub", getstudents);

export default router;
