import cloudinary from '../config/cloudinary';
import fs from 'fs';

// Upload file from local storage to cloudinary
export const uploadToCloudinary = async (
  filePath: string,
  folder: string
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `sportsphere/${folder}`,
    });

    // Delete the temp file from local storage after uploading to Cloudinary
    await fs.promises.unlink(filePath);

    return result.secure_url;
  } catch (err) {
    throw new Error('File upload failed');
  }
};

// Upload multiple files to Cloudinary
export const uploadMultiple = async (
  filePaths: string[],
  folder: string
): Promise<string[]> => {
  const uploads = filePaths.map(filePath => uploadToCloudinary(filePath, folder));
  return Promise.all(uploads);
};