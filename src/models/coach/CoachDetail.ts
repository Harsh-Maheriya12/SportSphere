import mongoose, { Schema, Document } from "mongoose";

export interface ICoachDetail extends Document {
  coachId: mongoose.Types.ObjectId;
  sports: string[];
  description: string;
  experience: number;
  pricing: number;
  location: {
    city: string;
    state: string;
    country: string;
    address: string;
  };
  photoGallery: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CoachDetailSchema: Schema = new Schema(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    sports: {
      type: [String],
      required: true,
      validate: {
        validator: function (sports: string[]) {
          return sports.length > 0 && sports.length <= 10;
        },
        message: "Must specify at least 1 sport and maximum 10 sports",
      },
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    pricing: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: false,
        trim: true,
        default: "",
      },
    },
    photoGallery: {
      type: [String],
      default: [],
      validate: {
        validator: function (photos: string[]) {
          return photos.length <= 10;
        },
        message: "Photo gallery cannot exceed 10 images",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICoachDetail>("CoachDetail", CoachDetailSchema);
