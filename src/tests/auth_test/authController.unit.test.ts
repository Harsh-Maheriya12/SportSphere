import { Request, Response } from 'express';
import {
    register,
    login,
    checkUsername,
    checkEmail,
    sendOtp,
    verifyOtpController,
    resendOtp,
    sendPasswordResetOtpController,
    verifyPasswordResetOtpController,
    resetPassword
} from '../../controllers/authController';
import User from '../../models/User';
import UserEmailOtpVerification from '../../models/UserEmailOtpVerification';
import {
    sendOtpVerificationMail,
    verifyOtp,
    sendPasswordResetOtp,
    isEmailVerified
} from '../../utils/EmailAndPwdHelper';
import { uploadToCloudinary } from '../../utils/cloudinaryUploader';
import { deleteUploadedFiles } from '../../utils/FileHelper';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../models/UserEmailOtpVerification');
jest.mock('../../utils/EmailAndPwdHelper');
jest.mock('../../utils/cloudinaryUploader');
jest.mock('../../utils/FileHelper');
jest.mock('jsonwebtoken');


describe('Auth Controller Unit Tests', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockReq = {
            body: {},
            files: []
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    describe('register', () => {
        it('should register a local user successfully with all required fields', async () => {
            mockReq.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'player',
                age: '25',
                gender: 'male',
                authProvider: 'local'
            };
            mockReq.files = [
                { fieldname: 'profilePhoto', path: '/tmp/photo.jpg' } as Express.Multer.File
            ];

            (isEmailVerified as jest.Mock).mockResolvedValue(true);
            (uploadToCloudinary as jest.Mock).mockResolvedValue('https://cloudinary.com/photo.jpg');

            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'player',
                verified: true,
                save: jest.fn().mockResolvedValue(true)
            };
            (User as any).mockImplementation(() => mockUser);
            (UserEmailOtpVerification.deleteMany as jest.Mock).mockResolvedValue({});

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(isEmailVerified).toHaveBeenCalledWith('test@example.com');
            expect(uploadToCloudinary).toHaveBeenCalledWith('/tmp/photo.jpg', 'profile-photos');
            expect(mockUser.save).toHaveBeenCalled();
            expect(UserEmailOtpVerification.deleteMany).toHaveBeenCalledWith({
                email: 'test@example.com'
            });
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'User registered successfully. Please login to continue.',
                user: {
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'player'
                }
            });
        });

        it('should register a Google OAuth user successfully', async () => {
            mockReq.body = {
                username: 'googleuser',
                email: 'google@example.com',
                role: 'player',
                age: '30',
                gender: 'female',
                authProvider: 'google'
            };
            mockReq.files = [];

            (isEmailVerified as jest.Mock).mockResolvedValue(true);

            const mockUser = {
                _id: 'user456',
                username: 'googleuser',
                email: 'google@example.com',
                role: 'player',
                verified: true,
                save: jest.fn().mockResolvedValue(true)
            };
            (User as any).mockImplementation(() => mockUser);
            (UserEmailOtpVerification.deleteMany as jest.Mock).mockResolvedValue({});
            (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: 'user456', role: 'player' },
                'test-secret',
                { expiresIn: '3h' }
            );
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Registration successful!',
                token: 'mock-jwt-token',
                user: {
                    id: 'user456',
                    username: 'googleuser',
                    email: 'google@example.com',
                    role: 'player',
                    verified: true
                }
            });
        });

        it('should register coach with proof document', async () => {
            mockReq.body = {
                username: 'coach',
                email: 'coach@example.com',
                password: 'password123',
                role: 'coach',
                age: '35',
                gender: 'male',
                authProvider: 'local'
            };
            mockReq.files = [
                { fieldname: 'profilePhoto', path: '/tmp/photo.jpg' } as Express.Multer.File,
                { fieldname: 'proof', path: '/tmp/proof.pdf' } as Express.Multer.File
            ];

            (isEmailVerified as jest.Mock).mockResolvedValue(true);
            (uploadToCloudinary as jest.Mock)
                .mockResolvedValueOnce('https://cloudinary.com/photo.jpg')
                .mockResolvedValueOnce('https://cloudinary.com/proof.pdf');

            const mockUser = {
                _id: 'coach123',
                username: 'coach',
                email: 'coach@example.com',
                role: 'coach',
                verified: true,
                save: jest.fn().mockResolvedValue(true)
            };
            (User as any).mockImplementation(() => mockUser);
            (UserEmailOtpVerification.deleteMany as jest.Mock).mockResolvedValue({});

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(uploadToCloudinary).toHaveBeenCalledWith('/tmp/photo.jpg', 'profile-photos');
            expect(uploadToCloudinary).toHaveBeenCalledWith('/tmp/proof.pdf', 'proof-documents');
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should return error when email is not verified', async () => {
            mockReq.body = {
                username: 'testuser',
                email: 'unverified@example.com',
                password: 'password123',
                role: 'player',
                age: '25',
                gender: 'male'
            };

            (isEmailVerified as jest.Mock).mockResolvedValue(false);

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Please verify your email with OTP before registering'
            });
        });

        it('should return error when profile photo is missing for local auth', async () => {
            mockReq.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'player',
                age: '25',
                gender: 'male',
                authProvider: 'local'
            };
            mockReq.files = [];

            (isEmailVerified as jest.Mock).mockResolvedValue(true);

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Profile photo is required'
            });
        });

        it('should return error when proof is missing for coach', async () => {
            mockReq.body = {
                username: 'coach',
                email: 'coach@example.com',
                password: 'password123',
                role: 'coach',
                age: '35',
                gender: 'male',
                authProvider: 'local'
            };
            mockReq.files = [
                { fieldname: 'profilePhoto', path: '/tmp/photo.jpg' } as Express.Multer.File
            ];

            (isEmailVerified as jest.Mock).mockResolvedValue(true);

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Proof document is required for coach and venue-owner roles'
            });
        });

        it('should delete uploaded files on error', async () => {
            mockReq.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'player',
                age: '25',
                gender: 'male',
                authProvider: 'local'
            };
            const mockFiles = [
                { fieldname: 'profilePhoto', path: '/tmp/photo.jpg' } as Express.Multer.File
            ];
            mockReq.files = mockFiles;

            (isEmailVerified as jest.Mock).mockResolvedValue(true);
            (uploadToCloudinary as jest.Mock).mockRejectedValue(new Error('Upload failed'));

            await register(mockReq as Request, mockRes as Response, mockNext);

            expect(deleteUploadedFiles).toHaveBeenCalledWith(mockFiles);
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
            expect(mockNext.mock.calls[0][0].message).toBe('Upload failed');
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            mockReq.body = {
                email: 'test@example.com',
                password: 'password123'
            };

            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'player',
                verified: true,
                authProvider: 'local',
                comparePassword: jest.fn().mockResolvedValue(true)
            };

            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });
            (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: 'user123', role: 'player' },
                'test-secret',
                { expiresIn: '3h' }
            );
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Login successful',
                token: 'mock-jwt-token',
                user: {
                    id: 'user123',
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'player',
                    verified: true
                }
            });
        });

        it('should return error when user is not found', async () => {
            mockReq.body = {
                email: 'nonexistent@example.com',
                password: 'password123'
            };

            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid credentials'
            });
        });

        it('should return error when password is incorrect', async () => {
            mockReq.body = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const mockUser = {
                _id: 'user123',
                email: 'test@example.com',
                authProvider: 'local',
                comparePassword: jest.fn().mockResolvedValue(false)
            };

            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid credentials'
            });
        });

        it('should return error when user is Google OAuth user', async () => {
            mockReq.body = {
                email: 'google@example.com',
                password: 'password123'
            };

            const mockUser = {
                _id: 'user123',
                email: 'google@example.com',
                authProvider: 'google'
            };

            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid credentials'
            });
        });

        it('should handle database errors gracefully', async () => {
            mockReq.body = {
                email: 'test@example.com',
                password: 'password123'
            };

            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            await login(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'An error occurred during login. Please try again.'
            });
        });
    });


    describe('checkUsername', () => {
        it('should return available: true when username does not exist', async () => {
            mockReq.body = { username: 'newuser' };
            (User.findOne as jest.Mock).mockResolvedValue(null);

            await checkUsername(mockReq as Request, mockRes as Response, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({ username: 'newuser' });
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                available: true
            });
        });

        it('should return available: false when username exists', async () => {
            mockReq.body = { username: 'existinguser' };
            (User.findOne as jest.Mock).mockResolvedValue({ username: 'existinguser' });

            await checkUsername(mockReq as Request, mockRes as Response, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({ username: 'existinguser' });
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                available: false
            });
        });

        it('should return error when username is not provided', async () => {
            mockReq.body = {};

            await checkUsername(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Username is required'
            });
        });
    });

    describe('checkEmail', () => {
        it('should return available: true when email does not exist', async () => {
            mockReq.body = { email: 'new@example.com' };
            (User.findOne as jest.Mock).mockResolvedValue(null);

            await checkEmail(mockReq as Request, mockRes as Response, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({
                email: 'new@example.com'
            });
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                available: true
            });
        });

        it('should return available: false when email exists', async () => {
            mockReq.body = { email: 'existing@example.com' };
            (User.findOne as jest.Mock).mockResolvedValue({ email: 'existing@example.com' });

            await checkEmail(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                available: false
            });
        });

        it('should return error when email is not provided', async () => {
            mockReq.body = {};

            await checkEmail(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email is required'
            });
        });

        it('should trim and lowercase email before checking', async () => {
            mockReq.body = { email: '  TEST@EXAMPLE.COM  ' };
            (User.findOne as jest.Mock).mockResolvedValue(null);

            await checkEmail(mockReq as Request, mockRes as Response, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({
                email: 'test@example.com'
            });
        });
    });

    describe('sendOtp', () => {
        it('should send OTP successfully', async () => {
            mockReq.body = { email: 'test@example.com' };
            (sendOtpVerificationMail as jest.Mock).mockResolvedValue({
                success: true,
                message: 'OTP sent successfully',
                data: { otpId: '123' }
            });

            await sendOtp(mockReq as Request, mockRes as Response, mockNext);

            expect(sendOtpVerificationMail).toHaveBeenCalledWith('test@example.com');
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'OTP sent successfully',
                data: { otpId: '123' }
            });
        });

        it('should return error when email is not provided', async () => {
            mockReq.body = {};

            await sendOtp(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email is required'
            });
        });

        it('should return error when OTP sending fails', async () => {
            mockReq.body = { email: 'test@example.com' };
            (sendOtpVerificationMail as jest.Mock).mockResolvedValue({
                success: false,
                message: 'Failed to send OTP'
            });

            await sendOtp(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to send OTP'
            });
        });
    });

    describe('verifyOtpController', () => {
        it('should verify OTP successfully', async () => {
            mockReq.body = { email: 'test@example.com', otp: '123456' };
            (verifyOtp as jest.Mock).mockResolvedValue({
                success: true,
                message: 'OTP verified',
                verified: true
            });

            await verifyOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(verifyOtp).toHaveBeenCalledWith('test@example.com', '123456');
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'OTP verified',
                verified: true
            });
        });

        it('should return error when email is missing', async () => {
            mockReq.body = { otp: '123456' };

            await verifyOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email and OTP are required'
            });
        });

        it('should return error when OTP is missing', async () => {
            mockReq.body = { email: 'test@example.com' };

            await verifyOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email and OTP are required'
            });
        });

        it('should return error when OTP verification fails', async () => {
            mockReq.body = { email: 'test@example.com', otp: 'wrong' };
            (verifyOtp as jest.Mock).mockResolvedValue({
                success: false,
                message: 'Invalid OTP'
            });

            await verifyOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid OTP'
            });
        });
    });

    describe('resendOtp', () => {
        it('should resend OTP successfully', async () => {
            mockReq.body = { email: 'test@example.com' };
            (sendOtpVerificationMail as jest.Mock).mockResolvedValue({
                success: true,
                message: 'OTP resent successfully'
            });

            await resendOtp(mockReq as Request, mockRes as Response, mockNext);

            expect(sendOtpVerificationMail).toHaveBeenCalledWith('test@example.com');
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'OTP resent successfully'
            });
        });

        it('should return error when email is not provided', async () => {
            mockReq.body = {};

            await resendOtp(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email is required'
            });
        });
    });

    describe('sendPasswordResetOtpController', () => {
        it('should send password reset OTP successfully', async () => {
            mockReq.body = { email: 'test@example.com' };
            (sendPasswordResetOtp as jest.Mock).mockResolvedValue({
                success: true,
                message: 'Password reset OTP sent'
            });

            await sendPasswordResetOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(sendPasswordResetOtp).toHaveBeenCalledWith('test@example.com');
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Password reset OTP sent'
            });
        });

        it('should return error when email is not provided', async () => {
            mockReq.body = {};

            await sendPasswordResetOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email is required'
            });
        });

        it('should return error when sending fails', async () => {
            mockReq.body = { email: 'test@example.com' };
            (sendPasswordResetOtp as jest.Mock).mockResolvedValue({
                success: false,
                message: 'User not found'
            });

            await sendPasswordResetOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found'
            });
        });
    });

    describe('verifyPasswordResetOtpController', () => {
        it('should verify password reset OTP successfully', async () => {
            mockReq.body = { email: 'test@example.com', otp: '123456' };
            (verifyOtp as jest.Mock).mockResolvedValue({
                success: true,
                message: 'OTP verified'
            });

            await verifyPasswordResetOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(verifyOtp).toHaveBeenCalledWith('test@example.com', '123456');
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'OTP verified'
            });
        });

        it('should return error when email is missing', async () => {
            mockReq.body = { otp: '123456' };

            await verifyPasswordResetOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email and OTP are required'
            });
        });

        it('should return error when OTP is missing', async () => {
            mockReq.body = { email: 'test@example.com' };

            await verifyPasswordResetOtpController(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email and OTP are required'
            });
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            mockReq.body = {
                email: 'test@example.com',
                otp: '123456',
                newPassword: 'newpassword123'
            };

            const mockUser = {
                email: 'test@example.com',
                password: 'oldpassword',
                save: jest.fn().mockResolvedValue(true)
            };

            (verifyOtp as jest.Mock).mockResolvedValue({
                success: true,
                verified: true
            });
            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            await resetPassword(mockReq as Request, mockRes as Response, mockNext);

            expect(verifyOtp).toHaveBeenCalledWith('test@example.com', '123456');
            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(mockUser.password).toBe('newpassword123');
            expect(mockUser.save).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Password reset successful'
            });
        });

        it('should return error when email is missing', async () => {
            mockReq.body = { otp: '123456', newPassword: 'newpass' };

            await resetPassword(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email, OTP, and new password are required'
            });
        });

        it('should return error when OTP is missing', async () => {
            mockReq.body = { email: 'test@example.com', newPassword: 'newpass' };

            await resetPassword(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email, OTP, and new password are required'
            });
        });

        it('should return error when new password is missing', async () => {
            mockReq.body = { email: 'test@example.com', otp: '123456' };

            await resetPassword(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email, OTP, and new password are required'
            });
        });

        it('should return error when OTP verification fails', async () => {
            mockReq.body = {
                email: 'test@example.com',
                otp: 'wrong',
                newPassword: 'newpass'
            };

            (verifyOtp as jest.Mock).mockResolvedValue({
                success: false,
                verified: false,
                message: 'Invalid OTP'
            });

            await resetPassword(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid or expired OTP'
            });
        });

        it('should return error when user is not found', async () => {
            mockReq.body = {
                email: 'nonexistent@example.com',
                otp: '123456',
                newPassword: 'newpass'
            };

            (verifyOtp as jest.Mock).mockResolvedValue({
                success: true,
                verified: true
            });
            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            await resetPassword(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found'
            });
        });
    });
});
