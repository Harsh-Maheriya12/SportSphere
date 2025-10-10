import app from './app';
import { connectDB } from './config/db';
import logger from './config/logger';

// Determine the port from environment variables, with a default fallback.
const PORT = process.env.PORT || 8000;

// An async function to start the application's startup sequence.
const startServer = async () => {
  try {
    // First establish a connection to the database.
    // The application will not start listening for requests until this is successful.
    await connectDB();
    
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