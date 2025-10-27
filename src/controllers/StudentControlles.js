import cloudinary from "../config/cloudinary.js";
import Class from "../models/Class.js";
import Plan from "../models/Plan.js";
import Users from "../models/Users.js";
import bcrypt from "bcryptjs";

export const joinClass = async (req, res) => {
  try {
    const { classId, studentId } = req.body;

    const student = await Users.findById(studentId);
    const classObj = await Class.findById(classId);

    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Add class to student
    if (!student.classes.includes(classId)) {
      student.classes.push(classId);
      await student.save();
    }

    // Add student to class
    if (!classObj.students.includes(studentId)) {
      classObj.students.push(studentId);
      await classObj.save();
    }

    res.json({ message: "Successfully joined the class", class: classObj });
  } catch (error) {
    console.error("Error joining class:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getStudentClasses = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }
    // Find the student and populate their classes (only _id and name)
    const student = await Users.findById(studentId)
      .populate("classes", "_id name status")
      .select("classes");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Return the list of classes with ids and names
    res.json({
      classes: student.classes.map(c => ({
        id: c._id,
        name: c.name,
        status: c.status
      })),
    });
  } catch (err) {
    console.error("Error fetching student classes:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const getStudentData = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find user by ID and populate plan details
    const user = await Users.findById(studentId)
      .populate("plan", "title description durationValue durationType price _id") // only select needed fields
      .lean(); // return plain JS object for easier formatting

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.expiresAt && new Date() > user.expiresAt) {
      user.status = "pending"; // expire account
      await user.save();
      // return res.status(403).json({ message: "Subscription expired" });
    }

    // Build response
    const response = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      expiresAt: user.expiresAt,
      paymentURL: user.paymentURL,
      plan: user.plan
        ? {
          id: user.plan._id,
          title: user.plan.title,
          description: user.plan.description,
          price: (user.plan.price / 100).toFixed(2),
          durationValue: user.plan.durationValue,
          durationType: user.plan.durationType
        }
        : null,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error in getStudentData:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// ✅ Update Student Data
export const updateStudentData = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { name, phone, email, password } = req.body;

    // Find user by ID
    const user = await Users.findById(studentId);
    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update only provided fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (email) user.email = email;

    if (password) {
      // Hash the new password before saving
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.status(200).json({
      message: "Student updated successfully",
      student: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getStudentPlan = async (req, res) => {
  try {
    const { planId } = req.params;

    // Find the plan by ID
    const plan = await Plan.findById(planId).lean();
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Return only needed fields
    const response = {
      id: plan._id,
      title: plan.title,
      description: plan.description,
      price: (plan.price / 100).toFixed(2),
      durationValue: plan.durationValue,
      durationType: plan.durationType,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching plan:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
///////////////////////////////////////////////////////////////////////////////
export const getStudentClasseNote = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    // Find the class by ID and select only the notes and name
    const classData = await Class.findById(classId).select("notes name");

    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Sort notes from newest to oldest (by createdAt)
    const sortedNotes = [...classData.notes].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Return sorted notes with class name
    res.json({
      classId: classData._id,
      className: classData.name,
      notes: sortedNotes.map(note => ({
        msg: note.msg,
        createdAt: note.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching class notes:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get single PDF (Student) - 24h signed link
export const getFilesClasses = async (req, res) => {
  try {
    const { classId, pdfId } = req.params;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    const file = classData.pdfs.id(pdfId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Generate signed URL valid for 24h
    const expireTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const secureUrl = cloudinary.utils.private_download_url(
      file.public_id,
      "pdf",
      {
        resource_type: "raw",
        expires_at: expireTime,
      }
    );

    return res.json({
      _id: file._id,
      name: file.name,
      description: file.description,
      pdfUrl: secureUrl,
      expiresAt: expireTime,
    });
  } catch (err) {
    console.error("Error getting file:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get all PDFs in a class (Student) - 24h signed links
export const getAllFilesClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    const expireTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

    // Sort PDFs from newest to oldest (by createdAt or addedAt)
    const sortedFiles = [...classData.pdfs].sort(
      (a, b) => new Date(b.createdAt || b.addedAt) - new Date(a.createdAt || a.addedAt)
    );

    const files = sortedFiles.map((file) => {
      const secureUrl = cloudinary.utils.private_download_url(
        file.public_id,
        "pdf",
        {
          resource_type: "raw",
          expires_at: expireTime,
        }
      );

      return {
        _id: file._id,
        name: file.name,
        description: file.description,
        pdfUrl: secureUrl,
        expiresAt: expireTime,
      };
    });

    return res.json({ files });
  } catch (err) {
    console.error("Error getting all files:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ✅ Student: Get single Task (12h signed link)
export const getTaskForStudent = async (req, res) => {
  try {
    const { classId, taskId } = req.params;

    const classroom = await Class.findById(classId);
    if (!classroom) return res.status(404).json({ message: "Class not found" });

    const task = classroom.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const expireTime = Math.floor(Date.now() / 1000) + 60 * 60 * 12;

    const submittedStudents = task.submissions.map((sub) =>
      sub.student?.toString()
    );

    const signedUrl = cloudinary.utils.private_download_url(
      task.public_id,
      "pdf",
      {
        resource_type: "raw",
        expires_at: expireTime,
      }
    );

    res.json({
      _id: task._id,
      name: task.name,
      description: task.description,
      addedAt: task.addedAt,
      url: signedUrl,
      expiresAt: expireTime,
      submittedStudents
    });
  } catch (err) {
    vvvvvv
    console.error("Get task error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllTasksForStudent = async (req, res) => {
  try {
    const { classId } = req.params;

    const classroom = await Class.findById(classId);
    if (!classroom) return res.status(404).json({ message: "Class not found" });

    const expireTime = Math.floor(Date.now() / 1000) + 60 * 60 * 12;

    // Sort tasks from newest to oldest by addedAt
    const sortedTasks = [...classroom.tasks].sort(
      (a, b) => new Date(b.addedAt) - new Date(a.addedAt)
    );

    const tasks = sortedTasks.map((task) => {
      const signedUrl = cloudinary.utils.private_download_url(
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
        url: signedUrl,
        expiresAt: expireTime,
        submittedStudents: task.submissions.map((sub) => sub.student?._id),
      };
    });

    res.json({ tasks });
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({ message: 'feild get tasks' });
  }
};

///////////////////////////////////////////////////////////////////////////////
// solve
export const submitTaskSolution = async (req, res) => {
  try {
    const { studentId, classId, taskId } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "No solution file uploaded" });
    }

    // Upload solution to Cloudinary (private, raw PDF)
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: `classroom/solutions`,
        format: "pdf",
        type: "private",
      },
      async (error, file) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ message: error.message });
        }

        // Find class
        const classroom = await Class.findById(classId);
        if (!classroom) return res.status(404).json({ message: "Class not found" });

        // Find task
        const task = classroom.tasks.id(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Push student submission
        task.submissions.push({
          student: studentId,
          public_id: file.public_id,
          url: file.secure_url,
        });

        await classroom.save();

        res.status(201).json({
          message: "Solution submitted successfully",
          solution: {
            student: studentId,
            public_id: file.public_id,
            url: file.secure_url,
          },
        });
      }
    );

    uploadStream.end(req.file.buffer);

  } catch (err) {
    console.error("Submit solution error:", err);
    res.status(500).json({ message: 'feild to submite' });
  }
};
// ✅ Get all videos for a class (student)
export const getStudentVideos = async (req, res) => {
  try {
    const { classId } = req.params;

    const classroom = await Class.findById(classId).select("videos students");
    if (!classroom) return res.status(404).json({ message: "Class not found" });

    // Sort videos from newest to oldest by uploadedAt
    const sortedVideos = [...classroom.videos].sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );

    res.json(sortedVideos.map(v => ({
      name: v.name,
      description: v.description,
      videoId: v.videoId, // Unlisted YouTube ID
      uploadedAt: v.uploadedAt
    })));
  } catch (err) {
    console.error("Error getClassVideos:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get single video by ID (student)
export const getStudentVideoById = async (req, res) => {
  try {
    const { classId, videoId } = req.params;
    const classDoc = await Class.findById(classId);
    if (!classDoc) return res.status(404).json({ msg: "Class not found" });

    const video = classDoc.videos.id(videoId);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    res.json({
      _id: video._id,
      name: video.name,
      description: video.description,
      signedUrl: generateSignedVideoUrl(video.public_id),
      addedAt: video.addedAt
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};