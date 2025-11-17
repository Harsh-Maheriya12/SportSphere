// src/models/SubVenue.ts
import mongoose, { Schema, Document } from "mongoose";
import { SportsEnum } from "../constants/SportsEnum";

export interface ISubVenueSport {
  name: SportsEnum;
  minPlayers: number;
  maxPlayers: number;
}

export interface ISubVenue extends Document {
  venue: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  images?: string[];

  sports: ISubVenueSport[]; // sports playable here

  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const SubVenueSportSchema = new Schema<ISubVenueSport>(
  {
    name: { type: String, enum: Object.values(SportsEnum), required: true },
    minPlayers: { type: Number, required: true },
    maxPlayers: { type: Number, required: true },
  },
  { _id: false }
);

const SubVenueSchema = new Schema<ISubVenue>(
  {
    venue: { type: Schema.Types.ObjectId, ref: "Venue", required: true, index: true },

    name: { type: String, required: true },
    description: String,
    images: { type: [String], default: [] },

    sports: {
      type: [SubVenueSportSchema],
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

SubVenueSchema.index({ venue: 1 });

export default mongoose.model<ISubVenue>("SubVenue", SubVenueSchema);
