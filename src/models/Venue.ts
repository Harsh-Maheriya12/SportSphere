// src/models/Venue.ts
import mongoose, { Schema, Document } from "mongoose";
export interface IVenue extends Document {
  name: string;
  description?: string;
  phone?: string;

  address: string;
  city: string;
  state?: string;

  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };

  images?: string[];
  amenities?: string[];

  owner: mongoose.Types.ObjectId;

  sports: string[]; //derived from sub-venues

  ratings: {
    userId: mongoose.Types.ObjectId;
    rating: number;
  }[];

  averageRating: number;
  totalRatings: number;

  createdAt: Date;
  updatedAt: Date;
}

const VenueSchema = new Schema<IVenue>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    phone: {type: String, trim: true },

    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },

    // GEOJSON
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: false, default: [0, 0] },
    },

    images: { type: [String], default: [] },
    amenities: { type: [String], default: [] },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    sports: { type: [String], default: [] },

    ratings: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 1, max: 5 },
      },
    ],
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Required for nearby venue search
VenueSchema.index({ location: "2dsphere" });

export default mongoose.model<IVenue>("Venue", VenueSchema);
