import axios from "axios";
import { Request, Response } from "express";

export const chatbotController = async (req: Request, res: Response) => {
  if (!req.body || !req.body.message) {
    return res.json({
      success: false,
      message: "Message is required",
    });
  }

  // Only for players
  if (req.user?.role !== "player") {
    return res.json({
      success: false,
      message: "Only players can access the chatbot",
    });
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

    return res.status(200).json({
      success: true,
      message: responseMessage.data.reply,
    });
  } catch (error) {
    // console.log("Error processing chatbot message:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process chatbot message",
    });
  }
};
