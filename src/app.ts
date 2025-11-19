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
// import {aiVenueSearch} from "./controllers/aiVenueSearchController";

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

// Parse JSON
app.use(express.json());

// API routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/coaches", coachRoutes);
app.use("/api/subvenues", subVenueRoutes);
app.use("/api/timeslots", timeslotRoutes);
// app.use("/api", aiVenueSearch);

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

// Global error handler
app.use(errorHandler);

export default app;
