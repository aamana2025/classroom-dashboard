import express from "express";
import { getAllFilesClass, getAllTasksForStudent, getFilesClasses, getStudentClasseNote, getStudentClasses, getStudentData, getStudentPlan, getStudentVideoById, getStudentVideos, getTaskForStudent, joinClass, submitTaskSolution, updateStudentData } from "../controllers/StudentControlles.js";
import upload from "../middleware/multer.js";
import { userActiveMiddleware } from "../middleware/authMiddleware.js";
const router = express.Router();

// router.use(userActiveMiddleware);

//class
router.post("/join-class", joinClass);
router.get("/:studentId/classes", getStudentClasses);

// profile
router.get("/:studentId/data", getStudentData);
router.put("/:studentId/updateUser", updateStudentData);
router.get("/plan/:planId", getStudentPlan);
//notes
router.get("/classes/:classId/notes", getStudentClasseNote);
//files
router.get("/class/:classId/files/:pdfId", getFilesClasses);
router.get("/class/:classId/Allfiles", getAllFilesClass);
//taskes
router.get("/class/:classId/tasks", getAllTasksForStudent);
router.get("/class/:classId/task/:taskId", getTaskForStudent);
//recived
router.post(
    "/:studentId/class/:classId/task/:taskId/solution",
    upload.single("solution"),
    submitTaskSolution
);

router.get("/class/:classId/videos", getStudentVideos);
router.get("/class/:classId/video/:videoId", getStudentVideoById);

export default router;
