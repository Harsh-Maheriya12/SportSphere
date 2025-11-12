/****
 * Custom operational error class for consistent error handling across the app,
 * standardizing error responses with a `success` flag set to false.
 */
export default class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;
  public success: boolean;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true; // identifies handled errors vs. programmer bugs
    this.details = details;
    this.success = false; // all errors have success set to false

    // Capture stack trace excluding constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}