import { Response } from 'express';
import { authorizeRoles } from '../../middleware/gameMiddleware';

// Mock for IUserRequest interface
interface MockIUserRequest {
  user: {
    role: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Creates a mock Express Response object with status and json methods
function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res as Response;
}

// Creates a mock Express NextFunction for middleware testing
function createMockNextFunction() {
  return jest.fn();
}

describe('authorizeRoles() authorizeRoles method', () => {
  describe('Happy Paths', () => {
    // Test authorization with a single allowed role
    it('should call next() when user role is authorized (single role)', () => {
      const mockReq: MockIUserRequest = {
        user: { role: 'admin' }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('admin');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    // Test authorization with multiple allowed roles
    it('should call next() when user role is among multiple allowed roles', () => {
      const mockReq: MockIUserRequest = {
        user: { role: 'player' }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('admin', 'player', 'coach');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    // Test authorization when user role matches the last role in array
    it('should call next() when user role is at the end of allowed roles array', () => {
      const mockReq: MockIUserRequest = {
        user: { role: 'coach' }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('admin', 'player', 'coach');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    // Test unauthorized role returns 403 forbidden response
    it('should return 403 when user role is not authorized', () => {
      const mockReq: MockIUserRequest = {
        user: { role: 'spectator' }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('admin', 'player', 'coach');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'You do not have permission to perform this action'
      });
    });

    // Test empty allowed roles array returns 403
    it('should return 403 when allowed roles array is empty', () => {
      const mockReq: MockIUserRequest = {
        user: { role: 'admin' }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles();
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'You do not have permission to perform this action'
      });
    });

    // Test empty string role returns 403
    it('should return 403 when user role is an empty string', () => {
      const mockReq: MockIUserRequest = {
        user: { role: '' }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('admin', 'player');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'You do not have permission to perform this action'
      });
    });

    // Test undefined role returns 403
    it('should return 403 when user role is undefined', () => {
      const mockReq: MockIUserRequest = {
        user: { role: undefined }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('admin', 'player');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'You do not have permission to perform this action'
      });
    });

    // Test missing user object returns 403
    it('should return 403 when req.user is missing', () => {
      const mockReq: MockIUserRequest = { user: {} as any } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('admin', 'player');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'You do not have permission to perform this action'
      });
    });

    // Test null role returns 403
    it('should return 403 when req.user.role is null', () => {
      const mockReq: MockIUserRequest = {
        user: { role: null }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('admin', 'player');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'You do not have permission to perform this action'
      });
    });

    // Test empty string in allowed roles matches empty string user role
    it('should call next() when allowed roles contains an empty string and user role is empty string', () => {
      const mockReq: MockIUserRequest = {
        user: { role: '' }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles('');
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    // Test undefined in allowed roles matches undefined user role
    it('should call next() when allowed roles contains undefined and user role is undefined', () => {
      const mockReq: MockIUserRequest = {
        user: { role: undefined }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles(undefined as any);
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    // Test null in allowed roles matches null user role
    it('should call next() when allowed roles contains null and user role is null', () => {
      const mockReq: MockIUserRequest = {
        user: { role: null }
      } as any;
      const mockRes = createMockResponse();
      const mockNext = createMockNextFunction();

      const middleware = authorizeRoles(null as any);
      middleware(mockReq as any, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});