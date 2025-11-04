// src/models/Venue.ts
import mongoose, { Document, Schema, Model } from "mongoose";
import { IUser } from "./User";

export interface IVenue extends Document {
  name: string;
  description?: string;
  address: string;
  city?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  capacity?: number;
  sports: string[]; // e.g., ["cricket","football","badminton"]
  images?: string[]; // urls
  owner: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const VenueSchema: Schema<IVenue> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    capacity: { type: Number, default: 0 },
    sports: { type: [String], default: [] },
    images: { type: [String], default: [] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Create 2dsphere index for geo queries (optional but useful)
VenueSchema.index({ location: "2dsphere" });

const Venue: Model<IVenue> = mongoose.models.Venue || mongoose.model<IVenue>("Venue", VenueSchema);
export default Venue;
