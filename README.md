# SportSphere

SportSphere is a Node.js + TypeScript + MongoDB backend for a sports community app.  
It allows users to connect with others, discover venues, and organize or join matches.

## Tech Stack
- **Node.js** + **Express**
- **TypeScript**
- **MongoDB** with **Mongoose**
- **dotenv** for environment configuration

## 🛠 Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/SportSphere.git
   cd SportSphere
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root folder:
   ```
   MONGO_URI=mongodb://localhost:27017/sportsphere
   PORT=5000
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

5. Build and run for production:
   ```bash
   npm run build
   npm start
   ```

## 📂 Project Structure
```
SportSphere/
├── src/
│   ├── config/        # Database connection
│   ├── models/        # Mongoose models
│   ├── routes/        # Express routes
│   ├── controllers/   # Business logic
│   ├── middleware/    # Middleware functions
│   ├── tests/
│   │   ├──Db_test/
│   └── server.ts      # Entry point
├── .env               # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```