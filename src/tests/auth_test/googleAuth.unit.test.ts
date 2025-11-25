import { Request, Response } from 'express';
import { redirectToGoogle, googleCallback } from '../../controllers/googleAuth';
import User from '../../models/User';
import UserEmailOtpVerification from '../../models/UserEmailOtpVerification';
import axios from 'axios';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../models/UserEmailOtpVerification');
jest.mock('axios');
jest.mock('jsonwebtoken');
jest.mock('../../config/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}));

describe('Google Auth Controller Unit Tests', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockReq = {
            query: {}
        };
        mockRes = {
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
        process.env.GOOGLE_CLIENT_ID = 'test-client-id';
        process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/callback';
        process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
        process.env.JWT_SECRET = 'test-jwt-secret';
        process.env.FRONTEND_URL = 'http://localhost:5173';
    });

    describe('redirectToGoogle', () => {
        it('should redirect to Google OAuth URL with correct parameters', async () => {
            await redirectToGoogle(mockReq as Request, mockRes as Response, mockNext);

            const expectedUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
            const params = new URLSearchParams({
                redirect_uri: 'http://localhost:5000/callback',
                client_id: 'test-client-id',
                access_type: 'offline',
                response_type: 'code',
                prompt: 'consent',
                scope: 'openid email profile'
            });

            expect(mockRes.redirect).toHaveBeenCalledWith(`${expectedUrl}?${params.toString()}`);
        });
    });

    describe('googleCallback', () => {
        it('should redirect to login with error if code is missing', async () => {
            mockReq.query = {}; // No code

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=Login+Failed!+Please+Retry!');
        });

        it('should redirect to login with error if token exchange fails', async () => {
            mockReq.query = { code: 'valid-code' };
            (axios.post as jest.Mock).mockRejectedValue(new Error('Token exchange failed'));

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            expect(axios.post).toHaveBeenCalledWith(
                "https://oauth2.googleapis.com/token",
                {
                    code: 'valid-code',
                    client_id: 'test-client-id',
                    client_secret: 'test-secret',
                    redirect_uri: 'http://localhost:5000/callback',
                    grant_type: 'authorization_code'
                }
            );
            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=Google+Auth+Failed');
        });

        it('should redirect to login with error if Google user has no email', async () => {
            mockReq.query = { code: 'valid-code' };
            (axios.post as jest.Mock).mockResolvedValue({
                data: { access_token: 'token', id_token: 'id_token' }
            });
            (axios.get as jest.Mock).mockResolvedValue({
                data: { name: 'No Email User' } // Missing email
            });

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            expect(axios.get).toHaveBeenCalledWith(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                {
                    headers: {
                        Authorization: "Bearer token"
                    }
                }
            );
            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=Google+account+has+no+email');
        });

        it('should login existing user successfully', async () => {
            mockReq.query = { code: 'valid-code' };
            (axios.post as jest.Mock).mockResolvedValue({
                data: { access_token: 'token', id_token: 'id_token' }
            });
            (axios.get as jest.Mock).mockResolvedValue({
                data: { email: 'existing@example.com', name: 'Existing User' }
            });

            const mockUser = {
                _id: 'user123',
                email: 'existing@example.com',
                role: 'player'
            };
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);
            (jwt.sign as jest.Mock).mockReturnValue('mock-token');

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'existing@example.com' });
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: 'user123', role: 'player' },
                'test-jwt-secret',
                { expiresIn: '3h' }
            );
            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/oauth-success?token=mock-token');
        });

        it('should register new user flow successfully', async () => {
            mockReq.query = { code: 'valid-code' };
            (axios.post as jest.Mock).mockResolvedValue({
                data: { access_token: 'token', id_token: 'id_token' }
            });
            (axios.get as jest.Mock).mockResolvedValue({
                data: {
                    email: 'new@example.com',
                    name: 'New User',
                    picture: 'http://pic.com/me.jpg'
                }
            });

            (User.findOne as jest.Mock).mockResolvedValue(null); // User not found
            (UserEmailOtpVerification.deleteMany as jest.Mock).mockResolvedValue({});

            const mockSave = jest.fn().mockResolvedValue(true);
            (UserEmailOtpVerification as unknown as jest.Mock).mockImplementation((data) => ({
                ...data,
                save: mockSave
            }));

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            expect(UserEmailOtpVerification.deleteMany).toHaveBeenCalledWith({ email: 'new@example.com' });

            // Verify UserEmailOtpVerification constructor arguments (Expiry check)
            expect(UserEmailOtpVerification).toHaveBeenCalledWith(expect.objectContaining({
                email: 'new@example.com',
                otp: 'GOOGLE_VERIFIED',
                expiresAt: expect.any(Number)
            }));

            // Check expiry is in the future (> now)
            const constructorCall = (UserEmailOtpVerification as unknown as jest.Mock).mock.calls[0][0];
            expect(constructorCall.expiresAt).toBeGreaterThan(Date.now());

            expect(mockSave).toHaveBeenCalled();

            const expectedRedirect = 'http://localhost:5173/oauth-success?email=new%40example.com&name=New%20User&picture=http%3A%2F%2Fpic.com%2Fme.jpg&provider=google';
            expect(mockRes.redirect).toHaveBeenCalledWith(expectedRedirect);
        });

        it('should use email prefix as name if name is missing for new user', async () => {
            mockReq.query = { code: 'valid-code' };
            (axios.post as jest.Mock).mockResolvedValue({
                data: { access_token: 'token', id_token: 'id_token' }
            });
            (axios.get as jest.Mock).mockResolvedValue({
                data: {
                    email: 'prefix@example.com'
                    // Missing name and picture
                }
            });

            (User.findOne as jest.Mock).mockResolvedValue(null);
            (UserEmailOtpVerification.deleteMany as jest.Mock).mockResolvedValue({});
            (UserEmailOtpVerification as unknown as jest.Mock).mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(true)
            }));

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            const expectedRedirect = 'http://localhost:5173/oauth-success?email=prefix%40example.com&name=prefix&picture=&provider=google';
            expect(mockRes.redirect).toHaveBeenCalledWith(expectedRedirect);
        });

        it('should redirect to login with error if profile fetch fails', async () => {
            mockReq.query = { code: 'valid-code' };
            (axios.post as jest.Mock).mockResolvedValue({
                data: { access_token: 'token', id_token: 'id_token' }
            });
            (axios.get as jest.Mock).mockRejectedValue(new Error('Profile fetch failed'));

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=Google+Auth+Failed');
        });

        it('should redirect to login with error if database error occurs', async () => {
            mockReq.query = { code: 'valid-code' };
            (axios.post as jest.Mock).mockResolvedValue({
                data: { access_token: 'token', id_token: 'id_token' }
            });
            (axios.get as jest.Mock).mockResolvedValue({
                data: { email: 'test@example.com', name: 'Test User' }
            });
            (User.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=Google+Auth+Failed');
        });

        it('should use default frontend URL if FRONTEND_URL is not set', async () => {
            delete process.env.FRONTEND_URL;
            mockReq.query = {}; // Missing code to trigger early redirect

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=Login+Failed!+Please+Retry!');
        });

        it('should handle trailing slash in FRONTEND_URL correctly', async () => {
            process.env.FRONTEND_URL = 'http://localhost:5173/'; // Trailing slash
            mockReq.query = {}; // Missing code

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            // Should strip trailing slash
            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=Login+Failed!+Please+Retry!');
        });

        it('should handle multiple trailing slashes in FRONTEND_URL correctly', async () => {
            process.env.FRONTEND_URL = 'http://localhost:5173///'; // Multiple trailing slashes
            mockReq.query = {}; // Missing code

            await googleCallback(mockReq as Request, mockRes as Response, mockNext);

            // Should strip all trailing slashes
            expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=Login+Failed!+Please+Retry!');
        });
    });
});
