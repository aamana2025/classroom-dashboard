import multer from "multer";

const storage = multer.memoryStorage(); // store in memory for direct upload to cloudinary
const upload = multer({ storage });

export default upload;
