// FILE PATH: src/app.ts

import express from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import logger from "./config/logger";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/userRoutes";
import errorHandler from './middleware/errorHandler';

// Initialize the Express application.
const app = express();

// Register the Pino logger middleware for structured, automated request logging.
// This should be one of the first middleware to be registered.
app.use(pinoHttp({ logger }));

// Configure and register the Cross-Origin Resource Sharing (CORS) middleware.
// This allows the frontend (running on a different origin) to make requests to this backend.
const corsOptions = {
  origin: 'http://localhost:5173', // Restricts requests to the specified origin.
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));

// Register the built-in Express middleware to parse incoming JSON request bodies.
// This makes `req.body` available in your route handlers.
app.use(express.json());

// Register the API routers.
// Requests to '/api/users' will be handled by the userRoutes module.
app.use("/api/users", userRoutes);
// Requests to '/api/auth' will be handled by the authRoutes module.
app.use("/api/auth", authRoutes);

// Configure the server to serve the static frontend build in a production environment.
if (process.env.NODE_ENV === 'production') {
  // Define the absolute path to the frontend's dist directory.
  const clientBuildPath = path.resolve(__dirname, '..', 'client', 'dist');
  
  // Serve all static files (JS, CSS, images) from the 'dist' directory.
  app.use(express.static(clientBuildPath));
  
  // For any other GET request that is not an API route, serve the frontend's index.html.
  // This is the fallback that enables client-side routing to work correctly.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  });
} else {
    // In development, provide a simple health check endpoint at the root.
    app.get("/", (req, res) => res.json({ status: "Development server is running" }));
}

// Register the centralized error-handling middleware.
// Must be the last piece of middleware registered in the application.
app.use(errorHandler);

// Export the configured Express app instance.
export default app;

