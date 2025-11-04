# Middleware Overview

---

## Middleware Chain

The middleware chain in `app.ts` is executed in a specific order, with the `errorHandler` being last.

---

## Middleware Files

### authMiddleware.ts

**Purpose:**  
Secures API endpoints by ensuring the user is authenticated.

**Function:**  
`protect`

**Logic:**

1. Extracts the `Bearer <token>` from the `Authorization` request header.
2. Verifies the JWT's signature and expiration using the `JWT_SECRET`.
3. If valid, it decodes the `userId` from the token.
4. It fetches the corresponding user from the User model (a "live check").
5. It attaches the user object (minus the password) to the `req.user` property.
6. It calls `next()` to pass control to the next handler.

**On Failure:**  
If the token is missing, invalid, or the user no longer exists, it throws a **401 Not Authorized** error, which is sent to the `errorHandler`.

---

### validation.ts

**Purpose:**  
Protects against invalid data and common attacks (like XSS) by validating and sanitizing all user input before it reaches the controller.

**Library:**  
`express-validator`

**Logic:**

- Exports validation chains (e.g., `validateRegister`) as an array of middleware.
- **Validates:** Checks for business rules (e.g., password is at least 6 characters, email is in a valid format).
- **Sanitizes:** Cleans the data (e.g., `trim()` to remove whitespace, `escape()` to prevent XSS).
- **Database Checks:** Performs async checks, such as querying the database to ensure an email is unique.
- **Result Handling:** A final function in the chain checks `validationResult(req)`. If errors are found, it immediately sends a **400 Bad Request** response with a detailed list of errors.

---

### errorHandler.ts

**Purpose:**  
This is the application's "safety net." It is the last middleware in the stack in `app.ts` and is responsible for catching all errors that occur in the application, logging them, and sending a standardized JSON response to the client.

**Logic:**

- It is an **error-handling** middleware, identified by its unique four-argument signature:  
  ```js
  (err, req, res, next)
  ```
- It uses our centralized logger to log the complete error details (message, stack, URL, etc.) for debugging.
- It determines the correct `statusCode` (defaulting to 500 if one isn't already set).
- It sends a clean, structured JSON response to the client, which includes the `err.message`.
- For security, it only includes the `err.stack` in the response if the environment is **not** set to production.

---
