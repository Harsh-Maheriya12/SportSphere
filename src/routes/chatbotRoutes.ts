import express from "express";
import asyncHandler from "express-async-handler";
import { chatbotController } from "../controllers/chatbotController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", protect, asyncHandler(chatbotController));
export default router;
