import { Request, Response } from "express";
import { getPipelineFromNL } from "../service/aiSearchService";
import mongoose from "mongoose";

const Venue = mongoose.model("Venue");

export async function aiVenueSearch(req: Request, res: Response){
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "question required" });

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
    return res.status(500).json({ error: err.message });
  }
}
