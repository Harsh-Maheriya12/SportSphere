import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/temp";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + path.extname(file.originalname));
  },
});

// File type filter to check types
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ["image/png", "image/jpeg","image/jpg","application/pdf",];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only PNG, JPEG, and PDF allowed"));
};

// Export multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).any();
