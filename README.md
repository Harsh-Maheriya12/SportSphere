# SportSphere: Full-Stack Sports Community Platform

SportSphere is a full-stack, containerized application for a sports community. This monorepo contains the **backend API** (Node.js/Express) and the **frontend client** (React/Vite). The entire development environment is managed by Docker Compose.

---

## Tech Stack

### Backend

- **Node.js** with Express
- TypeScript
- MongoDB with Mongoose
- JSON Web Tokens (JWT) for authentication
- Pino for structured logging
- express-validator for input validation
- Jest & Supertest for testing

### Frontend

- React 18 with TypeScript & Vite
- React Router DOM for client-side routing
- React Context API for global state management
- Tailwind CSS for styling
- Vitest & React Testing Library for testing

### Environment

- Docker & Docker Compose for containerization and orchestration
- concurrently to orchestrate multiple npm scripts.

---

## 🛠 Setup & Running Instructions

This project is fully containerized. You must have Docker Desktop installed and running on your system. You do not need to install MongoDB or Node.js on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/SportSphere_new.git
cd SportSphere_new
```

### 2. Create the Environment File

This is a critical step. Create a file named `.env` in the root of the project. This file is ignored by Git and contains your secrets.

Copy the following into your new `.env` file:

```env
# .env

# This is the port the Express app will listen on INSIDE the container.
# This should match the port mapping in docker-compose.yml.
PORT=5000

# This is the connection string for the Docker network.
# 'mongo' is the service name of the database in docker-compose.yml.
MONGO_URI=mongodb://mongo:27017/sportsphere

# This must be a long, random, and secure string.
# It is used to sign and verify authentication tokens.
JWT_SECRET=your_long_random_secret_string_here

# Set the node environment to development
NODE_ENV=development
```

### 3. Build and Run the Application

With Docker Desktop running, execute the following command from the project's root directory. This command builds the images for the first time and starts all services.

```bash
docker-compose up --build
```

### 4. Access the Application

- **Frontend:** Open your browser to [http://localhost:5173](http://localhost:5173)
- **Backend API:** The API is accessible at [http://localhost:8000](http://localhost:8000) (e.g., [http://localhost:8000/api/auth/login](http://localhost:8000/api/auth/login)). The Vite proxy ensures your frontend can make requests to this address without CORS issues.

---

## Daily Workflow

- To Start: `docker-compose up`
- To Stop: `Ctrl + C` (in the terminal where it's running)
- To Stop & Remove Containers: `docker-compose down`

---

## 📂 Project Structure

```plaintext
SportSphere_new/
├── client/                     # Frontend React Application (runs on port 5173)
│   ├── src/
│   │   ├── components/         # Reusable UI components (e.g., Layout.tsx)
│   │   ├── context/            # Global state management (AuthContext.tsx)
│   │   ├── pages/              # Top-level page components (HomePage.tsx, etc.)
│   │   ├── services/           # API communication layer (api.ts)
│   │   ├── tests/              # Frontend tests (e.g., setup.ts, .test.tsx files)
│   │   ├── types/              # Shared frontend TypeScript types (index.ts)
│   │   ├── App.tsx             # Main React router
│   │   ├── index.css           # Global styles & Tailwind imports
│   │   └── main.tsx            # React application entry point
│   ├── .dockerignore           # Files to exclude from the frontend Docker image
│   ├── Dockerfile.dev          # Recipe for building the frontend dev container
│   ├── index.html              # Main HTML entry point for the React app
│   ├── package.json            # Frontend dependencies and scripts (Vite, React)
│   ├── postcss.config.cjs      # PostCSS configuration for Tailwind
│   ├── tailwind.config.cjs     # Tailwind CSS configuration
│   ├── tsconfig.json           # TypeScript configuration for the frontend app
│   ├── tsconfig.node.json      # TypeScript helper config for Vite
│   └── vite.config.ts          # Vite configuration (dev server, proxy)
│
├── src/                        # Backend Node.js/Express Application (runs on port 8000)
│   ├── config/                 # Configuration (db.ts, logger.ts)
│   ├── controllers/            # Business logic (userController.ts)
│   ├── middleware/             # Express middleware (authMiddleware.ts, errorHandler.ts, etc.)
│   ├── models/                 # Mongoose database models (User.ts)
│   ├── routes/                 # Express routers (auth.ts, userRoutes.ts)
│   ├── tests/                  # Backend tests (unit/, DB_test/, auth_test/)
│   ├── types/                  # Backend TypeScript type extensions (express/index.d.ts)
│   ├── app.ts                  # Express application setup (middleware, routes)
│   └── server.ts               # Server entry point (connects to DB, starts server)
│
├── .dockerignore               # Files to exclude from the backend Docker image
├── .env                        # Environment variables (MUST be in .gitignore)
├── .gitignore                  # Files to be ignored by Git
├── docker-compose.yml          # Orchestrates all services (client, server, db)
├── Dockerfile.dev              # Recipe for building the backend dev container
├── jest.config.js              # Jest configuration for backend tests
├── package.json                # Backend dependencies & orchestrator scripts
├── README.md                   # Project README
└── tsconfig.json               # TypeScript configuration for the backend
```
