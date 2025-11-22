import app from './app';
import { connectDB } from './config/db';
import logger from './config/logger';
import dotenv from "dotenv";
import { initBookingCleanup } from './services/bookingCleanup';


dotenv.config();// Load .env file

// Determine the port from environment variables, with a default fallback.
const PORT = process.env.PORT || 5000;

// An async function to start the application's startup sequence.
const startServer = async () => {
  try {
    // First establish a connection to the database.
    // The application will not start listening for requests until this is successful.
    await connectDB();

    // Initialize background jobs
    initBookingCleanup();

    // Once the database is connected, start the Express server.
    app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error({ msg: 'Failed to start server', error });
    process.exit(1);
  }
};

// Execute the startup sequence.
startServer();