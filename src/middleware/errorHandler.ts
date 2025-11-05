import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import AppError from '../utils/AppError';

/**
 * Centralized Express error handler.
 * Handles both expected (AppError) and unexpected errors uniformly.
 */
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log key details for debugging
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Determine status code
  const statusCode = err.statusCode || res.statusCode || 500;
  if (res.statusCode === 200) res.status(statusCode);

  // Handle known (operational) errors
  if (err instanceof AppError && err.isOperational) {
    return res.status(statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Handle unexpected errors
  logger.error('UNEXPECTED ERROR:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong on the server.',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

export default errorHandler;
