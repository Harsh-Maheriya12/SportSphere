import fs from "fs";

// Delete uploaded files from local storage
export const deleteUploadedFiles = (files: Express.Multer.File[]) => {
  files.forEach((file) => {
    fs.unlink(file.path, (err) => {
      if (err) console.error(`Failed to delete file ${file.path}:`, err);
    });
  });
};