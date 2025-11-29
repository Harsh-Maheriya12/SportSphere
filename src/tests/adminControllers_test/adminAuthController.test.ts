import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { loginAdmin } from '../../controllers/adminAuthController';

describe('Admin Controllers - adminAuthController.ts', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    req = {
      body: {},
    } as Partial<Request>;
    res = makeRes();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // -------------------- HAPPY PATHS --------------------
  describe('Happy Paths', () => {
    it('should successfully login and return token + user when env credentials are correct', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'correct-password';
      process.env.ADMIN_USERNAME = 'SuperAdmin';
      process.env.JWT_SECRET = 'jwt-secret';

      // make token deterministic so we can assert on it
      const signSpy = jest.spyOn(jwt, 'sign').mockReturnValue('fake-token' as any);

      req!.body = { email: 'admin@test.com', password: 'correct-password' };

      await loginAdmin(req as Request, res as Response);

      expect(signSpy).toHaveBeenCalledWith(
        {
          id: 'admin-env',
          email: 'admin@test.com',
          username: 'SuperAdmin',
        },
        'jwt-secret',
        { expiresIn: '7d' }
      );

      expect(res.json).toHaveBeenCalled();
      const body = (res.json as jest.Mock).mock.calls[0][0];

      expect(body).toEqual({
        message: 'Login successful',
        token: 'fake-token',
        user: {
          id: 'admin-env',
          username: 'SuperAdmin',
          email: 'admin@test.com',
        },
      });
    });

    it('should default username to "Admin" when ADMIN_USERNAME is not set', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'correct-password';
      delete process.env.ADMIN_USERNAME; // force default
      process.env.JWT_SECRET = 'jwt-secret';

      jest.spyOn(jwt, 'sign').mockReturnValue('fake-token' as any);

      req!.body = { email: 'admin@test.com', password: 'correct-password' };

      await loginAdmin(req as Request, res as Response);

      const body = (res.json as jest.Mock).mock.calls[0][0];

      expect(body.user).toEqual({
        id: 'admin-env',
        username: 'Admin', // default
        email: 'admin@test.com',
      });
    });
  });

  // ------------- EDGE CASES & ERROR HANDLING -------------
  describe('Edge Cases & Error Handling', () => {
    it('should return 500 when ADMIN_EMAIL or ADMIN_PASSWORD are not configured', async () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;
      process.env.JWT_SECRET = 'some-secret';

      req!.body = { email: 'admin@test.com', password: 'password' };

      await loginAdmin(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server configuration error: Admin credentials not configured',
      });
    });

    it('should return 401 when credentials are invalid (wrong password)', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'correct-password';
      process.env.JWT_SECRET = 'some-secret';

      req!.body = { email: 'admin@test.com', password: 'wrong-password' };

      await loginAdmin(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 401 when email or password is missing in request body', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'correct-password';
      process.env.JWT_SECRET = 'some-secret';

      // missing password
      req!.body = { email: 'admin@test.com' };

      await loginAdmin(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 500 when JWT_SECRET is not set even if credentials are correct', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'correct-password';
      delete process.env.JWT_SECRET;

      req!.body = { email: 'admin@test.com', password: 'correct-password' };

      await loginAdmin(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server configuration error',
      });
    });

    it('should handle unexpected errors and return 500 with "Server error"', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      process.env.ADMIN_PASSWORD = 'correct-password';
      process.env.JWT_SECRET = 'jwt-secret';

      // valid creds so it reaches jwt.sign, then we force an error
      jest.spyOn(jwt, 'sign').mockImplementation(() => {
        throw new Error('sign failed');
      });

      req!.body = { email: 'admin@test.com', password: 'correct-password' };

      await loginAdmin(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });
});
