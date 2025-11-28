import { Request, Response, NextFunction } from 'express';
import { verifyPayment } from '../../controllers/Booking/verifyPayment';
import Booking from '../../models/Booking';
import AppError from '../../utils/AppError';

// Mock dependencies
jest.mock('../../models/Booking');

const mockStripeSessionRetrieve = jest.fn();
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                retrieve: mockStripeSessionRetrieve,
            },
        },
    }));
});

describe('verifyPayment - Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = 'test_secret';

        req = {
            query: {},
            user: { _id: '507f1f77bcf86cd799439012' }
        } as any;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as Partial<Response>;

        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Validation: Session ID Type Check', () => {
        it('should throw 400 error when sessionId is a number instead of string', async () => {
            // This kills the LogicalOperator mutant: !sessionId || typeof sessionId !== 'string'
            // The mutant changes || to &&, which would incorrectly allow numbers through
            req.query = { sessionId: 12345 as any };

            await verifyPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Session ID is required');
            expect(error.statusCode).toBe(400);
        });

        it('should throw 400 error when sessionId is an object instead of string', async () => {
            req.query = { sessionId: { id: 'sess_123' } as any };

            await verifyPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Session ID is required');
            expect(error.statusCode).toBe(400);
        });

        it('should throw 400 error when sessionId is an array instead of string', async () => {
            req.query = { sessionId: ['sess_123'] as any };

            await verifyPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Session ID is required');
            expect(error.statusCode).toBe(400);
        });

        it('should throw 400 error when sessionId is undefined', async () => {
            req.query = { sessionId: undefined };

            await verifyPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Session ID is required');
            expect(error.statusCode).toBe(400);
        });

        it('should throw 400 error when sessionId is null', async () => {
            req.query = { sessionId: null as any };

            await verifyPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Session ID is required');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('Success: Valid Session ID', () => {
        it('should accept valid string sessionId and proceed to Stripe call', async () => {
            req.query = { sessionId: 'sess_valid_string_123' };

            mockStripeSessionRetrieve.mockResolvedValue({
                id: 'sess_valid_string_123',
                payment_status: 'paid',
                payment_intent: 'pi_123'
            });

            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_valid_string_123',
                user: '507f1f77bcf86cd799439012',
                status: 'Pending',
                save: jest.fn().mockResolvedValue(true)
            };

            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            await verifyPayment(req as Request, res as Response, next);

            // Verify it proceeded past the type check
            expect(mockStripeSessionRetrieve).toHaveBeenCalledWith('sess_valid_string_123');
            expect(Booking.findOne).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Payment verified successfully'
                })
            );
        });
    });
});
