import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

// This function orchestrates the startup
const startServer = async () => {
  // 1. Connect to the database
  await connectDB(); 
  
  // 2. Start the Express server
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
};

// Execute the startup
startServer();