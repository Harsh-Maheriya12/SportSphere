import express from "express";
import { chatbotController } from "../controllers/chatbotController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", protect, chatbotController);
export default router;
