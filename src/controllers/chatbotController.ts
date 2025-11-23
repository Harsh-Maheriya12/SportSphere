import axios from "axios";
import { Request, Response } from "express";

export const chatbotController = async (req: Request, res: Response): Promise<void> => {
  if (!req.body || !req.body.message) {
    res.json({
      success: false,
      message: "Message is required",
    });
    return;
  }

  // Only for players
  if (req.user?.role !== "player") {
    res.json({
      success: false,
      message: "Only players can access the chatbot",
    });
    return;
  }

  const userMessage = req.body.message;
  const userId = req.user._id; 

  try { 
    
    // n8n webhook URL
    const responseMessage = await axios.post(
      "https://vivek21.app.n8n.cloud/webhook/2dbdbfb0-6024-4119-976a-8dc923971a23",
      {
        message: userMessage,
        userId: userId,
      }
    );

    res.status(200).json({
      success: true,
      message: responseMessage.data.reply,
    });
  } catch (error) {
    // console.log("Error processing chatbot message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process chatbot message",
    });
  }
};
