// src/models/TimeSlot.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISlot {
  _id: mongoose.Types.ObjectId;

  startTime: Date;
  endTime: Date;

  // Sport-specific prices → { cricket: 300, football: 500 }
  prices: {
    [sportName: string]: number;
  };

  status: "available" | "booked" | "blocked";

  // Track what sport the slot is booked for
  bookedForSport?: string | null;
}

export interface ITimeSlot extends Document {
  subVenue: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD

  slots: ISlot[];

  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema = new Schema<ISlot>(
  {
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    prices: {
      type: Map,
      of: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "booked", "blocked"],
      default: "blocked",
    },

    bookedForSport: {
      type: String,
      default: null,
    },
  },
  { _id: true }
);

const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    subVenue: {
      type: Schema.Types.ObjectId,
      ref: "SubVenue",
      required: true,
      index: true,
    },

    date: {
      type: String,
      required: true,
      index: true,
    },

    slots: {
      type: [SlotSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Prevent duplicates: 1 subvenue → 1 timeslot document per date
TimeSlotSchema.index({ subVenue: 1, date: 1 }, { unique: true });

export default mongoose.model<ITimeSlot>("TimeSlot", TimeSlotSchema);
