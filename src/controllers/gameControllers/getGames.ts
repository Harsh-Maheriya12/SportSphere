import asyncHandler from "express-async-handler";
import {IUserRequest} from "../../middleware/authMiddleware";
import Game from "../../models/gameModels";
import AppError from "../../utils/AppError";

export const getGameById = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId } = req.params;

  const game = await Game.findById(gameId)
    .populate("host", "username email")
    .populate("approvedPlayers", "username email");

  if (!game) throw new AppError("Game not found", 404);

  res.json({
    success: true,
    game,
  });
});

// Get all bookings related to the logged-in user
export const getMyBookings = asyncHandler(async (req: IUserRequest, res) => {
  const userId = req.user._id;

  const [
    hosted,
    joined,
    pending,
    rejected,
    cancelled,
    booked,
    completed
  ] = await Promise.all([
    // Games hosted by the user
    Game.find({ host: userId })
      .sort({ "slot.startTime": 1 }),

    // Games the user is approved participant in
    Game.find({ approvedPlayers: userId })
      .sort({ "slot.startTime": 1 }),

    // Pending join requests
    Game.find({
      "joinRequests.user": userId,
      "joinRequests.status": "pending"
    }),

    // Rejected join requests
    Game.find({
      "joinRequests.user": userId,
      "joinRequests.status": "rejected"
    }),

    // Cancelled games involving the user
    Game.find({
      status: "Cancelled",
      $or: [
        { host: userId },
        { approvedPlayers: userId },
        { "joinRequests.user": userId }
      ]
    }),

    // Booked games
    Game.find({
      bookingStatus: "Booked",
      $or: [
        { host: userId },
        { approvedPlayers: userId }
      ]
    }),

    // Completed games
    Game.find({
      status: "Completed",
      $or: [
        { host: userId },
        { approvedPlayers: userId }
      ]
    }).sort({ "slot.startTime": -1 }) // show recent completed games first
  ]);

  res.json({
    success: true,
    bookings: {
      hosted,
      joined,
      pending,
      rejected,
      cancelled,
      booked,
      completed
    }
  });
});

// GET GAMES WITH ADVANCED FILTERS
export const getGames = asyncHandler(async (req: IUserRequest, res, next): Promise<void> => {
  const {
    sport,
    venueId,
    startDate,
    endDate,
    minPrice,
    maxPrice,
    lng,
    lat,
    radius = '5000',
  } = req.query as any;

  const now = new Date();

  // Base query: only Open games and not-full ones
  const query: any = {
    status: 'Open',
    // Use $expr to compare array size with playersNeeded.max so DB filters out full games
    $expr: { 
      $lt: [{ $size: '$approvedPlayers' }, '$playersNeeded.max'] 
    },
  };

  // Date range / upcoming check
  if (startDate || endDate) {
    query['slot.startTime'] = {};
    if (startDate) query['slot.startTime'].$gte = new Date(startDate);
    if (endDate) query['slot.startTime'].$lte = new Date(endDate);
    
    if (!startDate) query['slot.startTime'].$gte = now;
  } else {
    query['slot.startTime'] = { $gte: now };
  }

  // Sport filter (case-insensitive substring)
  if (sport && typeof sport === 'string') {
    query.sport = new RegExp(sport, 'i');
  }

  // Venue filter
  if (venueId && typeof venueId === 'string') {
    query['venue.venueId'] = venueId;
  }

  // Price range
  if (minPrice || maxPrice) {
    query.approxCostPerPlayer = {};
    if (minPrice && !isNaN(Number(minPrice))) query.approxCostPerPlayer.$gte = Number(minPrice);
    if (maxPrice && !isNaN(Number(maxPrice))) query.approxCostPerPlayer.$lte = Number(maxPrice);
  }

  // Geo filter (nearby venues)
  if (lng && lat) {
    query['venue.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: Number(radius),
      },
    };
  }

  const games = await Game.find(query)
    .populate('host', 'username role')
    .populate('approvedPlayers', 'username')
    .sort({ 'slot.startTime': 1 });
  res.status(200).json({ success: true, count: games.length, games });
  return;
});