// server.ts
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT ;
const MONGODB_URI = process.env.MONGODB_URI ;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not available.");
  process.exit(1);
}

app.use(cors());

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.json({ status: "ok" }));

// Connect to MongoDB and start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
