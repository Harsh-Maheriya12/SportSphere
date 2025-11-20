import express, { Express } from "express";import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import logger from "./config/logger";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import errorHandler from './middleware/errorHandler';
import venueRoutes from "./routes/venueRoutes";
import subVenueRoutes from "./routes/subVenueRoutes";
import gameRoutes from "./routes/gameRoutes";
import coachRoutes from "./routes/coachRoutes";
import devtool from "./routes/developertools";
import timeslotRoutes from "./routes/timeslotRoutes";
import adminAuthRoutes from "./routes/adminAuth";
import adminTicketsRoutes from "./routes/adminTickets";
import adminUsersRoutes from "./routes/adminUsers";
import adminCoachesRoutes from "./routes/adminCoaches";
import adminVenueOwnersRoutes from "./routes/adminVenueOwners";
import adminOverviewRoutes from "./routes/adminOverview";
import ticketsRoutes from "./routes/tickets";
// import {aiVenueSearch} from "./controllers/aiVenueSearchController";
import bookingRoutes from "./routes/bookingRoutes";
import { stripeWebhook } from "./controllers/payment/stripeWebhook";

const app: Express = express();



// Request logger
app.use(pinoHttp({ logger }));


// CORS config
// Normalize CLIENT_ORIGIN (strip trailing slashes) to avoid exact-match CORS failures
const rawClientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const clientOrigin = typeof rawClientOrigin === 'string' ? rawClientOrigin.replace(/\/+$/, '') : rawClientOrigin;

const corsOptions = {
  origin: clientOrigin,
  optionsSuccessStatus: 200,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// Parse JSON
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/coaches", coachRoutes);
app.use("/api/subvenues", subVenueRoutes);
app.use("/api/timeslots", timeslotRoutes);
// app.use("/api", aiVenueSearch);
app.use("/api/bookings", bookingRoutes);

if (process.env.NODE_ENV === 'development') {
  app.use("/api/dev", devtool);
}

if (process.env.NODE_ENV === 'production') {
  // Serve frontend in production
  // const clientBuildPath = path.resolve(__dirname, '..', 'client', 'dist');
  // app.use(express.static(clientBuildPath));
  // app.get('*', (req, res) => {
  //   res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  // });
} else {
    // Dev health check
    app.get("/", (req, res) => res.json({ status: "Development server is running" }));
}

// Feature routes
app.use("/api/tickets", ticketsRoutes);

// Admin auth routes
app.use('/api/admin/auth', adminAuthRoutes);

// Admin tickets routes
app.use('/api/admin/tickets', adminTicketsRoutes);

// Admin management routes
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/coaches', adminCoachesRoutes);
app.use('/api/admin/venue-owners', adminVenueOwnersRoutes);
app.use('/api/admin/overview', adminOverviewRoutes);


// Global error handler
app.use(errorHandler);

export default app;
