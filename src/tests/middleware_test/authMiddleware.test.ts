import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { protect } from '../../middleware/authMiddleware';
import User from '../../models/User';
import { IUser } from '../../models/User'; // Import the type

// Mock express-async-handler to just return the function it's given
// This allows us to test the middleware function directly
jest.mock('express-async-handler', () => (fn: any) => fn);

// Mock the User model
jest.mock('../../models/User');

// Mock the jsonwebtoken library
jest.mock('jsonwebtoken');

// Type-cast the mocked modules
const mockedUser = User as jest.Mocked<typeof User>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware (protect)', () => {

  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction; // This will be our spy

  const mockUserPayload = {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
  };

  // Reset mocks before each test
  beforeEach(() => {
    // This is more robust than clearAllMocks. It resets implementations.
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn(() => mockResponse as Response),
      json: jest.fn(() => mockResponse as Response),
    };
    // Create a fresh Jest mock function for each test
    nextFunction = jest.fn();

    process.env.JWT_SECRET = 'your_test_secret';
  });

  // Test 1: The "Happy Path" - success case
  it('should call next() with no arguments if token is valid', async () => {
    mockRequest.headers = {
      authorization: 'Bearer validtoken123',
    };

    mockedJwt.verify.mockReturnValue({ userId: 'user123' } as any);
    mockedUser.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUserPayload),
    } as any);

    // We don't wrap this in try...catch because we expect it to succeed
    await protect(mockRequest as Request, mockResponse as Response, nextFunction);

    // Assertions
    expect(mockRequest.user).toBe(mockUserPayload);
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(nextFunction).toHaveBeenCalledWith(); // Called with no arguments
  });

  // Test 2: Failure case - no token
  it('should throw and call status(401) if no token is provided', async () => {
    let error: Error | null = null;
    try {
      // We wrap the await in try...catch to handle the error
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);
    } catch (e: any) {
      error = e;
    }

    // Assertions
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    // We check the error that was thrown
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Authorization header missing — token not provided.');
    // next() should NOT have been called because the throw stops execution
    // (asyncHandler calls next(error), which is what we caught)
    expect(nextFunction).not.toHaveBeenCalled(); 
  });

  // Test 3: Failure case - invalid token format
  it('should throw and call status(401) if token format is invalid (no Bearer)', async () => {
    mockRequest.headers = {
      authorization: 'invalidtoken123',
    };
    
    let error: Error | null = null;
    try {
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);
    } catch (e: any) {
      error = e;
    }

    // Assertions
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(error).not.toBeNull();
    expect(error?.message).toBe("Invalid Authorization format — expected 'Bearer <token>'.");
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // Test 4: Failure case - token verification fails
  it('should throw and call status(401) if token verification fails', async () => {
    mockRequest.headers = {
      authorization: 'Bearer badtoken123',
    };

    mockedJwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('Verification failed');
    });

    let error: Error | null = null;
    try {
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);
    } catch (e: any) {
      error = e;
    }

    // Assertions
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Token verification failed — invalid or tampered token.');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // Test 5: Failure case - user not found
  it('should throw and call status(401) if user not found in database', async () => {
    mockRequest.headers = {
      authorization: 'Bearer validtoken123',
    };

    mockedJwt.verify.mockReturnValue({ userId: 'user123' } as any);
    mockedUser.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null), // User.findById returns null
    } as any);

    let error: Error | null = null;
    try {
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);
    } catch (e: any) {
      error = e;
    }

    // Assertions
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Authentication failed — user not found or has been removed.');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // Test 6: Failure case - token expired
  it('should throw and call status(401) if token is expired', async () => {
    mockRequest.headers = {
      authorization: 'Bearer expiredtoken123',
    };

    const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());

    mockedJwt.verify.mockImplementation(() => {
      throw expiredError;
    });

    let error: Error | null = null;
    try {
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);
    } catch (e: any) {
      error = e;
    }

    // Assertions
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(error).not.toBeNull();
    expect(error?.message === 'Token verification failed — token has expired.').toBe(true);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // Test 7: Token missing after "Bearer " — ensure empty token string is handled.
  it('should throw and call status(401) if token is empty after Bearer', async () => {
    mockRequest.headers = {
      authorization: 'Bearer ',
    };

    let error: Error | null = null;
    try {
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);
    } catch (e: any) {
      error = e;
    }

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(error).not.toBeNull();
    expect(error?.message).toBe("Token is empty — please provide a valid token after \'Bearer\'.");
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // Test 8: Corrupted payload type — invalid `userId` type should fail.
  it('should throw and call status(401) if token payload userId is invalid type', async () => {
    mockRequest.headers = {
      authorization: 'Bearer validtoken123',
    };

    mockedJwt.verify.mockReturnValue({ userId: 12345 } as any); // userId should be string, here number

    let error: Error | null = null;
    try {
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);
    } catch (e: any) {
      error = e;
    }

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Authentication failed — user not found or has been removed.');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // Test 9: Missing `JWT_SECRET` — ensure the middleware handles missing environment variable safely.
  it('should throw and call status(401) if JWT_SECRET environment variable is missing', async () => {
    delete process.env.JWT_SECRET;

    mockRequest.headers = {
      authorization: 'Bearer validtoken123',
    };

    mockedJwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('secret or public key must be provided');
    });

    let error: Error | null = null;
    try {
      await protect(mockRequest as Request, mockResponse as Response, nextFunction);
    } catch (e: any) {
      error = e;
    }

    // Reset JWT_SECRET for other tests
    process.env.JWT_SECRET = 'your_test_secret';

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Token verification failed — invalid or tampered token.');
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
