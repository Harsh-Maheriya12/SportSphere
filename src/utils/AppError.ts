/**
 * Custom operational error class for consistent error handling across the app.
 */
export default class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true; // identifies handled errors vs. programmer bugs
    this.details = details;

    // Capture stack trace excluding constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}