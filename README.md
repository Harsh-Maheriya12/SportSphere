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
- Testing:
    - Unit Testing: Jest
    - Mutation: Stryker

### Frontend
- React 18 + TypeScript
- Vite
- React Router DOM v6
- Tailwind CSS
- Context API
- Testing:
   - GUI Testing: Selenium IDE

### Environment & DevOps
- Docker & Docker Compose
- Concurrently (for local non‑docker workflow)

---

## Setup & Running Instructions

### 1. Clone the Repository
```
git clone https://github.com/Harsh-Maheriya12/SportSphere
cd SportSphere_new
```

---

## 2. Set up Environment Variables

Create a `.env` file at the project root.

```
`PORT=5000
MONGO_URI=your_mongodb_url
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=frontend_irl # Where you frontend is running

GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=backend_url/api/auth/google/callback # Where your backend call be made for google auth

AUTH_EMAIL=your_email_here
SENDGRID_API_KEY=your_sendgrid_api_key_here

CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3b-8k  # or your preferred model

STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLIC_KEY=your_stripe_public_key_here

N8N_WEBHOOK_URL=https://your_n8n_webhook_url_here`
```

Create another `.env` file in `SportSphere/client`

```
VITE_API_BASE_URL = you_backend_api_endpoint_url # Base URL for all your api endpoints of where frontend is making api request
```

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
SportSphere/
│
├── client/                          # Frontend (Runs on 5173)
│   ├── src/
│   │   ├── admin/                   # Admin Panel (screens, components)
│   │   ├── assets/                  # Images, icons, SVGs
│   │   ├── components/              # Shared UI components
│   │   ├── constants/               # App constants
│   │   ├── context/                 # React Context providers
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utility libraries / helpers
│   │   ├── pages/                   # Page-level components (UI screens)
│   │   ├── services/                # API calls → Backend
│   │   ├── types/                   # TypeScript types/interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── vite-env.d.ts
│   │
|   ├── index.html                      
│   ├── Dockerfile.dev
│   ├── tailwind.config.ts
│   ├── postcss.config.ts 
│   ├── vite.config.ts               # Vite dev server + proxy
│   ├── package.json
│   ├── tsconfig.json
|   ├── vercel.json                       
|   └──.env                          # Environment variables
│
│                             
|── src/                             # Backend (Runs on 5000/8000)
│   ├── config/                      # env, DB connection, logger config
│   ├── constants/                   # Reusable constants
│   ├── controllers/                 # Route controllers (Auth, Venue, Game)
│   ├── middleware/                  # Auth, Error Handler, Validators
│   ├── models/                      # MongoDB/Mongoose schemas
│   ├── routes/                      # All Express routes
│   ├── utils/                       # Utilities (Email Sender, Cloudinary Uploader, helpers)
│   ├── types/                       # Typescript types
│   ├── tests/                       # Unit + Integration tests
│   ├── app.ts                       # Express app config
│   └── server.ts                    # Entry point
│
├── n8n/                             # Automation
│   ├── SportSphere_Workflow.json
│   └── sportsphere-workflow-n8n.png
|
├── jest.config.js
├── stryker.config.js
├── package.json
├── tsconfig.json 
├── docker-compose.yml
├── Dockerfile.dev
├── .env                              # Environment variables
├── README.md
└── package.json                          

```

---

## Notes
- You **do not need** to install MongoDB or Node locally — Docker handles everything.
- The Vite dev server proxies API calls to the backend to avoid CORS issues.
