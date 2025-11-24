import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;          // person who paid
  gameId?: mongoose.Types.ObjectId;       // optional (only for game-based bookings)

  // Immutable venue snapshot
  venueId: mongoose.Types.ObjectId;
  subVenueId?: mongoose.Types.ObjectId;   // optional (for direct bookings)
  sport?: string;                          // optional (sport booked)
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat] snapshot
  };

  // Immutable timing data
  startTime: Date;
  endTime: Date;

  // Payment info
  amount: number;
  currency: string;

  // Stripe fields (critical)
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  stripeChargeId?: string;

  status: "Pending" | "Paid" | "Failed" | "Refunded";
  calendarLink?: string;

  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    gameId: { type: Schema.Types.ObjectId, ref: "Game" },

    venueId: {
      type: Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },

    subVenueId: {
      type: Schema.Types.ObjectId,
      ref: "SubVenue",
    },

    sport: {
      type: String,
    },

    // Immutable location
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true, // [lng, lat]
      },
    },

    // Immutable slot details
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    // Payment
    amount: { type: Number, required: true },
    currency: { type: String, required: true },

    // Stripe identifiers
    stripePaymentIntentId: String,
    stripeSessionId: String,
    stripeChargeId: String,

    status: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    calendarLink: { type: String },

  },
  { timestamps: true }
);

// Index to ensure fast lookups of a user's bookings
BookingSchema.index({ user: 1 });

export default mongoose.model<IBooking>("Booking", BookingSchema);