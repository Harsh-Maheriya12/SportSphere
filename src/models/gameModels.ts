import mongoose, { Schema, Document } from 'mongoose';
import { SportsEnum } from "../constants/SportsEnum";

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
  sport: SportsEnum;
  description: string;
  // Venue details
  venue :{
    venueId: mongoose.Types.ObjectId; // Reference to Venue document
    city: string;
    state?: string;
    coordinates: { type: "Point"; coordinates: number[] }; // [lng, lat]
  }
  // sub-venue details eg. court/field
  subVenue: {
    subVenueId: mongoose.Types.ObjectId; // Reference to SubVenue document
    name: string;
  };
  // time slot details 
  slot: {
    timeSlotDocId: mongoose.Types.ObjectId; // Reference to TimeSlot document
    slotId: mongoose.Types.ObjectId;  // Specific slot within the TimeSlot document
    date: string;

    startTime: Date;
    endTime: Date;
    price: number; // Price for a partiular game in the slot
    
  };
  playersNeeded: { min: number; max: number };
  approvedPlayers: mongoose.Types.ObjectId[];
  joinRequests: IJoinRequest[]; // Array of join requests made by users.
  approxCostPerPlayer: number;
  status: 'Open' | 'Full' | 'Completed' | 'Cancelled' | 'NeedsHostAction'; // Current status of the game.
  bookingStatus? : 'Booked' | 'NotBooked' ;
  createdAt: Date;
  updatedAt: Date;
}

// The Mongoose Schema defines the data structure, validation, and behavior at the database level.
const joinRequestSchema = new Schema<IJoinRequest>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
},
{ _id: false } // Prevents creation of an _id field for subdocuments.
);

/**
 * The main Game schema defines the structure of the Game document in MongoDB.
 * It includes nested subdocuments, relationships, and validation rules.
 */
const gameSchema = new Schema<IGame>(
  {
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sport: { type: String, enum: Object.values(SportsEnum), required: true,},
    description: { type: String, required: true, trim: true },
    venue: {
      venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true }, // Reference to Venue document
      city: { type: String, required: true },
      state: { type: String },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"], // GeoJSON type
          required: true,
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
        }, 
      }    
    },
    subVenue: {
      subVenueId: {
        type: Schema.Types.ObjectId,
        ref: "SubVenue", // Reference to SubVenue document
        required: true,
      },
      name: { type: String, required: true },
    },
    slot: {
      timeSlotDocId: { type: Schema.Types.ObjectId, required: true }, // Reference to TimeSlot document
      slotId: { type: Schema.Types.ObjectId, required: true }, // Specific slot within the TimeSlot document
      date: { type: String, required: true },

      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },

      price: { type: Number, required: true },
    },
    playersNeeded: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    approvedPlayers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of approved players.
    joinRequests: { type: [joinRequestSchema], default: [] }, // subdocument for join requests defined above.
    
    approxCostPerPlayer: { type: Number, required:true},
    status: {
      type: String,
      enum: ['Open', 'Full', 'Completed', 'Cancelled', 'NeedsHostAction'],
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

// Index for fast upcoming games queries
gameSchema.index({ "slot.startTime": 1 });

// Export the Game model based on the gameSchema.
export default mongoose.model<IGame>('Game', gameSchema);
