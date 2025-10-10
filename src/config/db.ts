import mongoose from 'mongoose';
import logger from './logger';

// Defines the connection options for Mongoose.
const connectOptions: mongoose.ConnectOptions = {
    // Sets a timeout for server selection. If a server is not found within this
    // time, the connection attempt will fail. This prevents long hangs on startup.
    serverSelectionTimeoutMS: 5000,
    
    // Dynamically sets autoIndex. In development, indexes are created automatically
    // for convenience. In production, this is disabled for performance and safety.
    autoIndex: process.env.NODE_ENV !== 'production',

    // The maximum number of sockets the MongoDB driver will keep open for this connection.
    maxPoolSize: 10,

    // The time in milliseconds to wait for a socket to become active before timing out.
    socketTimeoutMS: 45000,
};

// Defines the parameters for the connection retry logic.
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

/**
 * Establishes a connection to the MongoDB database with a retry mechanism
 * that uses exponential backoff to avoid overwhelming the database during recovery.
 */
export const connectDB = async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const mongoUri = process.env.MONGO_URI;

            // Fails fast if the critical MONGO_URI environment variable is not provided.
            if (!mongoUri) {
                throw new Error('MONGO_URI is not defined in the environment variables.');
            }

            await mongoose.connect(mongoUri, connectOptions);

            // Use the logger for all output.
            logger.info("Connected to DataBase");
            return;
        } catch (err) {
            // exponential backoff for the retry delay.
            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
            
            logger.warn(`DB Connection Attempt ${attempt} failed. Retrying in ${delay / 1000} seconds...`);

            if (attempt === MAX_RETRIES) {
                logger.error({ msg: "All database connection attempts failed. Exiting.", error: (err as Error).message });
                
                if (process.env.NODE_ENV !== 'test') {
                    process.exit(1);
                }
                throw new Error("Database connection failed after multiple retries.");
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

/**
 * Disconnects from the MongoDB database by closing all underlying connections.
 * This is essential for a clean shutdown of the application and for test suite teardown.
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    await mongoose.disconnect();
  } catch (err) {
    logger.error({ msg: "Database disconnection failed", error: err });
  }
};