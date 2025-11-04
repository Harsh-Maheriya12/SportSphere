This contains the complete source code for the SportSphere backend API.

Architectural Pattern

The backend follows a Model-View-Controller (MVC) pattern, adapted for an API-only service (Model-Controller-Route):

Models (/models): Defines the "shape" of the data. This is where the Mongoose schemas are defined, including data types, validation rules, and any logic directly related to the data (e.g., password hashing).

Controllers (/controllers): Defines the business logic. Each controller function is responsible for handling a specific task, such as fetching a user's profile or creating a new venue.

Routes (/routes): Defines the API endpoints. These files map HTTP methods and URL paths (e.g., GET /api/users/profile) to the corresponding controller functions. They are also responsible for applying route-specific middleware.

Directory Structure

/config: Contains application-wide configuration files, such as the database connection logic (db.ts) and the structured logger setup (logger.ts).

/controllers: Holds the business logic for each resource. For example, userController.ts handles the logic for fetching user profiles.

/middleware: Contains all custom Express middleware functions. These are the "gatekeepers" that process requests before they reach the controller. This includes authentication (authMiddleware.ts), input validation (validation.ts), and error handling (errorHandler.ts).

/models: Contains all Mongoose data schemas, starting with User.ts.

/routes: Contains the Express router files. These files define the API's public-facing URLs and connect them to the correct controllers and middleware.

/tests: Contains the complete backend test suite. See the `src/tests/README.md` for a detailed breakdown.

/types: Contains TypeScript declaration files to augment third-party libraries, such as adding the req.user property to the Express Request type.

app.ts: The central assembly file for the Express application. It imports and configures all middleware, routes, and error handlers in the correct order. It does not start the server.

server.ts: The main entry point for the application. Its only job is to import the configured app, connect to the database, and start the HTTP server. This separation makes the application testable.

Data & Error Flow

A request enters server.ts (via Docker) and is passed to app.ts.

In app.ts, the request passes through global middleware (logging, CORS, JSON parsing).

The request is sent to a router in /routes (e.g., userRoutes.ts).

The router applies route-specific middleware (e.g., protect from authMiddleware.ts).

If authenticated, the request is passed to a controller in /controllers (e.g., getUserProfile).

The controller interacts with a model in /models (e.g., User.findById(...)).

A response is sent back.

If any part of this chain throws an error, it is caught by the centralized errorHandler.ts, which logs the error and sends a standardized JSON response.
# SportSphere Backend API

Welcome to the source code for the **SportSphere Backend API**. This is a Node.js application built with Express and TypeScript, designed for scalability, maintainability, and testability.

---

## Architectural Pattern

The backend follows a **Model-Controller-Route** (an API-adapted MVC) architectural pattern:

- **Models (`/models`)**
  - Define the structure and schema of the data using Mongoose.
  - Responsible for data types, validation rules, and business logic directly related to the data (e.g., password hashing).

- **Controllers (`/controllers`)**
  - Contain the core business logic for each resource.
  - Each function handles a specific task, such as fetching a user profile or creating a new venue.

- **Routes (`/routes`)**
  - Define API endpoints by mapping HTTP methods and URL paths (e.g., `GET /api/users/profile`) to controller functions.
  - Apply route-specific middleware for tasks such as authentication or validation.

---

## Directory Structure

Below is an overview of the main directories and files:

```plaintext
src/
├── config/         # Application-wide configuration (e.g., db.ts, logger.ts)
├── controllers/    # Business logic for each resource (e.g., userController.ts)
├── middleware/     # Custom Express middleware (auth, validation, error handling)
├── models/         # Mongoose schemas (e.g., User.ts)
├── routes/         # Express router files (define API endpoints)
├── tests/          # Backend test suite (see src/tests/README.md)
├── types/          # TypeScript declaration files (e.g., Express req.user augmentation)
├── app.ts          # Assembles middleware, routes, and error handlers
└── server.ts       # Application entry point (starts server and connects to database)
```

### Directory & File Descriptions

- **/config**: Contains configuration files, such as database connection logic (`db.ts`) and logger setup (`logger.ts`).
- **/controllers**: Houses business logic for API resources (e.g., `userController.ts` for user-related actions).
- **/middleware**: Contains all custom Express middleware functions. These modules process requests before they reach controllers, handling authentication (`authMiddleware.ts`), input validation (`validation.ts`), and error handling (`errorHandler.ts`).
- **/models**: The source of truth for database structure, containing all Mongoose data schemas (e.g., `User.ts`).
- **/routes**: Defines the API's public-facing URLs and connects them to the appropriate controllers and middleware.
- **/tests**: Contains the backend test suite. For details, see `src/tests/README.md`.
- **/types**: Contains TypeScript declaration files to extend third-party libraries (e.g., adding `req.user` to Express's `Request` type).
- **app.ts**: Central file that assembles and configures middleware, routes, and error handlers. Does not start the server.
- **server.ts**: Main entry point. Imports the configured app, connects to the database, and starts the HTTP server. This separation improves testability.

## Data & Error Flow

The typical flow for a request through the backend is as follows:

1. **Request Entry**
   - The request enters via `server.ts` (e.g., through Docker).
2. **Global Middleware**
   - In `app.ts`, the request passes through global middleware (logging, CORS, JSON parsing).
3. **Routing**
   - The request is routed to the appropriate file in `/routes` (e.g., `userRoutes.ts`).
4. **Route-specific Middleware**
   - Middleware specific to the route is applied (e.g., authentication via `authMiddleware.ts`).
5. **Controller Execution**
   - If authenticated, the request proceeds to the relevant controller in `/controllers` (e.g., `getUserProfile`).
6. **Model Interaction**
   - The controller interacts with a model in `/models` (e.g., `User.findById(...)`).
7. **Response**
   - A response is sent back to the client.
8. **Error Handling**
   - If an error occurs at any point, it is caught by the centralized `errorHandler.ts`. The error is logged, and a standardized JSON error response is returned.