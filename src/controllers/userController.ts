import { Request, Response } from "express";
import User from "../models/User";
import { uploadToCloudinary } from "../utils/cloudinaryUploader";
import { deleteUploadedFiles } from "../utils/FileHelper";

// Get authenticated user's profile data
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        age: user.age,
        gender: user.gender,
        profilePhoto: user.profilePhoto,
        proof: user.proof,
        createdAt: (user as any).createdAt,
      },
    });
  } catch (error) {
    throw error;
  }
};

// Update user profile (username, age, gender, profile photo)
export const updateUserProfile = async (req: Request, res: Response) => {
  const { username, age, gender } = req.body;
  const files = req.files as Express.Multer.File[];

  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Update basic fields if provided
    if (username) user.username = username;
    if (age) user.age = parseInt(age);
    if (gender) user.gender = gender;

    // Update profile photo if new file uploaded
    if (files && files.length > 0) {
      const profilePhoto = files.find(
        (file) => file.fieldname === "profilePhoto"
      );

      if (profilePhoto) {
        // Upload to Cloudinary and get public URL
        const profilePhotoUrl = await uploadToCloudinary(
          profilePhoto.path,
          "profile-photos"
        );
        user.profilePhoto = profilePhotoUrl;
      }
    }

    // Password not included in update (use separate password reset flow)
    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        age: user.age,
        gender: user.gender,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    // Clean up uploaded files on error
    if (files && files.length > 0) {
      deleteUploadedFiles(files);
    }
    throw error;
  }
};
