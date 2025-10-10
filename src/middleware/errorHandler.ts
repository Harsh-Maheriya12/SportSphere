import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * A centralized Express error-handling middleware.
 * This function is executed whenever an error is passed to the `next()` function
 * in any preceding middleware or route handler.
 * @param err The error object. Can be a standard Error or a custom error.
 * @param req The Express request object.
 * @param res The Express response object.
 * @param next The Express next middleware function.
 */
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error with structured context for effective debugging.
    // This uses the centralized pino logger.
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
    });

    // Determine the appropriate HTTP status code.
    // If a status code has already been set on the response object (e.g., res.status(404)), use it.
    // Otherwise, default to 500 (Internal Server Error) for unexpected errors.
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Set the final status code on the response.
    res.status(statusCode);

    // Send a structured JSON response back to the client.
    res.json({
        message: err.message,
        // For security, the detailed error stack trace is only included in the API response
        // when the application is NOT running in a production environment.
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

export default errorHandler;

