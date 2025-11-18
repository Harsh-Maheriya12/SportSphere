import mongoose, { Schema, Document } from "mongoose";

export interface ICoachBooking extends Document {
  coachId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  slotId: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  date: Date;
  startTime: string;
  endTime: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CoachBookingSchema: Schema = new Schema(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: "CoachSlot",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
CoachBookingSchema.index({ coachId: 1, status: 1 });
CoachBookingSchema.index({ playerId: 1, status: 1 });

export default mongoose.model<ICoachBooking>(
  "CoachBooking",
  CoachBookingSchema
);
