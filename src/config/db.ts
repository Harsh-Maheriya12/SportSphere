import mongoose from 'mongoose';

/**
 * Connects to the MongoDB database using the connection string from environment variables.
 * if the connection fails on startup, it logs the error,
 * the other logic works by waiting a set time, trying for a set amount of times before exiting
 * 
 */
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);    // setup to connect with the database
        if(process.env.NODE_ENV !== 'test') console.log("Connected to DataBase");
    } catch (err) {
        console.error("Connection failed, Error code: ", err);
        if(process.env.NODE_ENV !== 'test') process.exit(1); // the process does not shutdown if a test fails
    }

    /*
    // --- RETRY LOGIC --- (to be used during deployment)

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000; // 5 seconds

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await mongoose.connect(process.env.MONGO_URI as string);
            console.log("Connected to DataBase");
            return; // Exit the function on successful connection
        } catch (err) {
            console.error(`Attempt ${attempt} failed. Retrying in ${RETRY_DELAY_MS / 1000} seconds`);
            if (attempt === MAX_RETRIES) {
                console.error("All connection attempts failed. Exiting.", err);
                if(process.env.NODE_ENV !== 'test') process.exit(1);
            }
            // Wait for the specified delay before the next attempt
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
    */
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    await mongoose.disconnect();
  } catch (err) {
    console.error("Disconnection failed:", err);
  }
};
