import mongoose, { Schema, Document } from "mongoose";

export interface ICoachSlot extends Document {
  coachId: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CoachSlotSchema: Schema = new Schema(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    isBooked: {
      type: Boolean,
      default: false,
    },
    bookedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
CoachSlotSchema.index({ coachId: 1, date: 1, startTime: 1 });

export default mongoose.model<ICoachSlot>("CoachSlot", CoachSlotSchema);
