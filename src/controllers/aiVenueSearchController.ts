import { Request, Response } from "express";
import { getPipelineFromNL } from "../service/aiSearchService";
import mongoose from "mongoose";

const Venue = mongoose.model("Venue");

export async function aiVenueSearch(req: Request, res: Response){
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: "question required",
        message: "Please provide a valid search query"
      });
    }

    const pipeline = await getPipelineFromNL(question);
    
    // To Ensure $geoNear is the first stage
    const geoIndex = pipeline.findIndex((stage: any) => stage.$geoNear);
    
    if (geoIndex > -1 && geoIndex !== 0) {
      const geoStage = pipeline.splice(geoIndex, 1)[0];
      pipeline.unshift(geoStage);
    }

    // Extra safety (limit + remove sensitive fields)
    pipeline.push({ $project: { owner: 0 } });
    pipeline.push({ $limit: 100 });

    const result = await Venue.aggregate(pipeline).exec();

    return res.json({ success: true, count: result.length, data: result });
  } catch (err: any) {
    console.error("[AI Venue Search Error]:", err.message);
    
    // Handle specific error types
    if (err.message?.includes("GROQ_API_KEY")) {
      return res.status(503).json({ 
        success: false,
        error: "AI search service not configured",
        message: "Smart search is temporarily unavailable. Please use the filter options."
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: err.message || "Search failed",
      message: "Unable to process search. Please try again or use filters."
    });
  }
}
