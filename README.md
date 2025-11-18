# SportSphere: Full-Stack Sports Community Platform

SportSphere is a full-stack, containerized application designed to connect players, venue owners, and coaches.  
This monorepo contains the **backend API** (Node.js/Express + TypeScript) and the **frontend client** (React/Vite).  
The entire development environment is managed using **Docker Compose**.

---

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Authentication: JWT + Google OAuth 2.0
- Logging: Pino
- Validation: express-validator
- Testing: Jest + Supertest

### Frontend
- React 18 + TypeScript
- Vite
- React Router DOM v6
- Tailwind CSS
- Context API
- Vitest + React Testing Library

### Environment & DevOps
- Docker & Docker Compose
- Concurrently (for local non‑docker workflow)

---

## Setup & Running Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/SportSphere_new.git
cd SportSphere_new
```

---

## Environment Variables

Create a `.env` file at the project root.

### **Email SMTP (for OTP + notifications)**
```
SMTP_HOST=<host>
SMTP_PORT=<port>
SMTP_USER=<username>
SMTP_PASS=<password>
EMAIL_FROM=<noreply@example.com>
```

### **Google OAuth**
```
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

### **JWT**
```
JWT_SECRET=<your-secret>
JWT_EXPIRES_IN=7d
```

These are required for email verification, login, and Google OAuth.

---

## Running the Application (Docker)

With Docker Desktop running:

```bash
docker-compose up --build
```

### Access:
- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:8000  

---

## Running Without Docker (Local Development)

If you prefer running the project locally without Docker, follow this setup.

### 1. Install Dependencies
From the project root:

```bash
npm install
cd client
npm install
cd ..
```

### 2. Start Backend (Express + TypeScript)

```bash
npm run dev
```

This runs the backend using `ts-node-dev` with hot reload enabled.  
Backend runs on **http://localhost:8000**.

### 3. Start Frontend (React + Vite)

Open a second terminal:

```bash
cd client
npm run dev
```

This launches Vite on **http://localhost:5173**.

---

## Vite Proxy Configuration (client/vite.config.ts)

The Vite config is set up to proxy API calls from the frontend to the backend to avoid CORS issues:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

This means any request like:

```ts
fetch("/api/auth/login")
```

automatically forwards to:

```
http://localhost:8000/api/auth/login
```

allowing a smooth local development workflow.

---

## Workflow
- Start: `docker-compose up`
- Stop: `Ctrl + C`
- Cleanup containers: `docker-compose down`

---

## Project Structure

```
SportSphere_new/
├── client/                     # React Frontend (5173)
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── tests/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── Dockerfile.dev
│   ├── vite.config.ts
│   └── package.json
│
├── src/                        # Backend API (8000)
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── tests/
│   ├── types/
│   ├── app.ts
│   └── server.ts
│
├── docker-compose.yml
├── Dockerfile.dev
├── .env
├── jest.config.js
├── package.json
└── tsconfig.json
```

---

## Notes
- You **do not need** to install MongoDB or Node locally — Docker handles everything.
- The Vite dev server proxies API calls to the backend to avoid CORS issues.
