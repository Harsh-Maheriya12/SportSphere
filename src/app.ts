import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db"; // Connects to the DB
import authRoutes from "./routes/auth";

dotenv.config();

// Establish the database connection

const app = express();

// Apply middleware
app.use(cors());
app.use(express.json());

// Apply routes
app.use("/api/auth", authRoutes);

export default app; // Export the configured app