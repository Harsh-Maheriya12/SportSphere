import { Request, Response, NextFunction } from 'express';
import { verifyPayment } from '../../controllers/Booking/verifyPayment';
import Booking from '../../models/Booking';
import AppError from '../../utils/AppError';

// Mock dependencies
jest.mock('../../models/Booking');
jest.mock('../../config/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn()
    }
}));

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

describe('verifyPayment Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = 'test_secret';
        req = {
            query: {},
            user: { _id: 'user123' }
        } as unknown as Request;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as Partial<Response>;

        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should successfully verify payment and update booking', async () => {
        req.query = { sessionId: 'sess_123' };

        // Mock Stripe Success
        mockStripeSessionRetrieve.mockResolvedValue({
            payment_status: 'paid',
            payment_intent: 'pi_123'
        });

        // Mock Booking Find
        const mockBooking = {
            _id: 'booking123',
            status: 'Pending',
            save: jest.fn().mockResolvedValue(true)
        };
        (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

        await verifyPayment(req as Request, res as Response, next);

        expect(mockStripeSessionRetrieve).toHaveBeenCalledWith('sess_123');
        expect(Booking.findOne).toHaveBeenCalledWith({ stripeSessionId: 'sess_123', user: 'user123' });
        expect(mockBooking.status).toBe('Paid');
        expect(mockBooking.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: 'Payment verified successfully'
        }));
    });

    it('should return 400 if sessionId is missing', async () => {
        req.query = {}; // Missing sessionId

        await verifyPayment(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Session ID is required');
    });

    it('should return success: false if payment is not paid', async () => {
        req.query = { sessionId: 'sess_unpaid' };

        mockStripeSessionRetrieve.mockResolvedValue({
            payment_status: 'unpaid'
        });

        await verifyPayment(req as Request, res as Response, next);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('Payment not completed')
        }));
        expect(Booking.findOne).toHaveBeenCalled();
    });

    it('should return 404 if booking is not found', async () => {
        req.query = { sessionId: 'sess_unknown' };

        mockStripeSessionRetrieve.mockResolvedValue({
            payment_status: 'paid',
            payment_intent: 'pi_123'
        });

        (Booking.findOne as jest.Mock).mockResolvedValue(null);

        await verifyPayment(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Booking not found');
    });
});
