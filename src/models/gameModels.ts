import mongoose, { Schema, Document } from 'mongoose';

// The TypeScript interface defines the "shape" of a User document for use in the application code.
// It provides type safety and autocompletion. It extends `mongoose.Document` to include
// standard Mongoose properties like `_id` and instance methods.
export interface IJoinRequest {
  user: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected'; // Tracks the current state of the request.
  requestedAt: Date;
}

// The IGame interface defines the shape of a Game document for TypeScript.
export interface IGame extends Document {
  host: mongoose.Types.ObjectId;
  sport: string;
  description: string;
  playersNeeded: { min: number; max: number };
  approvedPlayers: mongoose.Types.ObjectId[];
  joinRequests: IJoinRequest[]; // Array of join requests made by users.
  timeSlot: { startTime: Date; endTime: Date };
  venueLocation: {
    type: 'Point'; // GeoJSON type for location-based queries.
    coordinates: number[]; // [lng, lat]
  };
  approxCostPerPlayer: number;
  status: 'Open' | 'Full' | 'Completed' | 'Cancelled' | 'NeedsHostAction'; // Current status of the game.
  bookingStatus? : 'Booked' | 'NotBooked' ;
  createdAt: Date;
}

// The Mongoose Schema defines the data structure, validation, and behavior at the database level.
const joinRequestSchema = new Schema<IJoinRequest>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
});

/**
 * The main Game schema defines the structure of the Game document in MongoDB.
 * It includes nested subdocuments, relationships, and validation rules.
 */
const gameSchema = new Schema<IGame>(
  {
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sport: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    playersNeeded: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    approvedPlayers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of approved players.
    joinRequests: [joinRequestSchema], // subdocument for join requests defined above.
    timeSlot: {
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
    },
    venueLocation: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], default: [0, 0], required: true }, // [lng, lat]
    },
    approxCostPerPlayer: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Open', 'Full', 'Completed', 'Cancelled'],
      default: 'Open',  // A new game starts as "Open" by default.
    },
    bookingStatus: {
      type: String,
      enum: ['Booked', 'NotBooked'],
      default: 'NotBooked'
    }
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields.
);

// Create a 2dsphere index on venueLocation for geospatial queries.
gameSchema.index({ venueLocation: '2dsphere' });

// Export the Game model based on the gameSchema.
export default mongoose.model<IGame>('Game', gameSchema);
