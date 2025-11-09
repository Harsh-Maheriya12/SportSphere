import { NextFunction } from 'express';
import AppError from '../../utils/AppError';

/**
 * Ensures that next() was called with an AppError.
 * Verifies both message and statusCode consistency.
 */
export const expectNextAppError = (
  nextFn: jest.MockedFunction<NextFunction>,
  expected: { message?: string; statusCode?: number }
) => {
  expect(nextFn).toHaveBeenCalled();

  const callArgs = nextFn.mock.calls.map(call => call[0]);
  const errorArg = callArgs.find(arg => arg && typeof arg === 'object' && 'statusCode' in arg);

  // Ensure next() was called with a valid AppError object
  expect(errorArg).toBeDefined();
  if (!errorArg) throw new Error('next() was not called with an AppError');
  expect(typeof errorArg).toBe('object');

  // "route" should never reach here, we test that separately
  expect(errorArg).not.toBe('route');

  // Safely cast
  const appError = errorArg as AppError;

  expect(appError).toBeInstanceOf(AppError);

  if (expected.message) {
    expect(appError.message).toContain(expected.message);
  }

  if (expected.statusCode) {
    expect(appError.statusCode).toBe(expected.statusCode);
  }
};

/**
 * Ensures that next() was called with 'route' (Express route deferment).
 */
export const expectNextRoute = (nextFn: jest.MockedFunction<NextFunction>) => {
  expect(nextFn).toHaveBeenCalled();
  const arg = nextFn.mock.calls[0][0];
  expect(arg).toBe('route');
};

/**
 * Ensures that next() was called without an error — normal success case.
 */
export const expectNextSuccess = (nextFn: jest.MockedFunction<NextFunction>) => {
  expect(nextFn).toHaveBeenCalled();
  const arg = nextFn.mock.calls[0][0];
  expect(arg).toBeUndefined();
};