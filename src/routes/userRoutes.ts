import { Router } from "express";
import asyncHandler from "express-async-handler";
import {
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";
import { upload } from "../middleware/multer";

const router = Router();

router.get("/profile", protect, asyncHandler(getUserProfile));
router.put("/profile", protect, upload, asyncHandler(updateUserProfile));

export default router;