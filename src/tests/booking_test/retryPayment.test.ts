import { Request, Response, NextFunction } from 'express';
import { retryPayment } from '../../controllers/Booking/retryPayment';
import Booking from '../../models/Booking';
import TimeSlot from '../../models/TimeSlot';
import AppError from '../../utils/AppError';

// Mock dependencies
jest.mock('../../models/Booking');
jest.mock('../../models/TimeSlot');
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

const mockStripeSessionCreate = jest.fn();
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: mockStripeSessionCreate,
            },
        },
    }));
});

describe('retryPayment Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = 'test_secret';
        req = {
            body: {},
            user: { _id: 'user123' }
        } as unknown as Request;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as Partial<Response>;

        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should successfully retry payment if slot is available', async () => {
        req.body = { bookingId: 'booking123' };

        const fixedDate = new Date();
        const mockBooking = {
            _id: 'booking123',
            subVenueId: 'subVenue123',
            startTime: fixedDate,
            endTime: fixedDate,
            sport: 'Cricket',
            amount: 1000,
            currency: 'inr',
            status: 'Failed',
            save: jest.fn().mockResolvedValue(true)
        };
        (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

        // Mock TimeSlot Find (for slot ID)
        const mockSlot = {
            _id: 'slot123',
            startTime: fixedDate,
            endTime: fixedDate
        };
        const mockTimeSlot = {
            _id: 'tsDoc123',
            slots: [mockSlot]
        };
        // Ensure findOne returns an object where slots is an array
        (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

        // Mock TimeSlot Update (Locking)
        (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: [{ ...mockSlot, status: 'booked' }]
        });

        // Mock Stripe
        mockStripeSessionCreate.mockResolvedValue({
            id: 'sess_new',
            url: 'http://stripe.com/retry'
        });

        try {
            await retryPayment(req as Request, res as Response, next);
        } catch (e) {
            console.log('RetryPayment Success Caught in Test:', e);
        }
        if ((next as jest.Mock).mock.calls.length > 0) {
            console.log('RetryPayment Success Next:', (next as jest.Mock).mock.calls[0][0]);
        }

        expect(TimeSlot.findOneAndUpdate).toHaveBeenCalled();
        expect(mockStripeSessionCreate).toHaveBeenCalled();
        expect(mockBooking.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            url: 'http://stripe.com/retry'
        }));
    });

    it('should return 400 if bookingId is missing', async () => {
        req.body = {}; // Missing bookingId

        await retryPayment(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Booking ID is required');
    });

    it('should return 404 if booking is not found', async () => {
        req.body = { bookingId: 'booking123' };

        (Booking.findOne as jest.Mock).mockResolvedValue(null);

        await retryPayment(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Booking not found');
    });

    it('should return 400 if slot is already taken', async () => {
        req.body = { bookingId: 'booking123' };

        const mockBooking = {
            _id: 'booking123',
            subVenueId: 'subVenue123',
            startTime: new Date(),
            endTime: new Date(),
            sport: 'Cricket',
            status: 'Failed'
        };
        (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

        const mockSlot = {
            _id: 'slot123',
            startTime: mockBooking.startTime,
            endTime: mockBooking.endTime
        };
        const mockTimeSlot = {
            _id: 'tsDoc123',
            slots: [mockSlot]
        };
        (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

        // Mock Lock Failure (return null)
        (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

        await retryPayment(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Slot is no longer available');
    });

    it('should return 400 if booking is already paid', async () => {
        req.body = { bookingId: 'booking123' };

        const mockBooking = {
            _id: 'booking123',
            status: 'Paid'
        };
        (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

        await retryPayment(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Booking is already paid');
    });

    it('should successfully retry a Pending booking when slot is already booked', async () => {
        req.body = { bookingId: 'booking123' };

        const fixedDate = new Date();
        const mockBooking = {
            _id: 'booking123',
            subVenueId: 'subVenue123',
            startTime: fixedDate,
            endTime: fixedDate,
            sport: 'Cricket',
            amount: 1000,
            currency: 'inr',
            status: 'Pending', // Pending status
            save: jest.fn().mockResolvedValue(true)
        };
        (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

        const mockSlot = {
            _id: 'slot123',
            startTime: fixedDate,
            endTime: fixedDate,
            status: 'booked'
        };
        const mockTimeSlot = {
            _id: 'tsDoc123',
            slots: [mockSlot]
        };
        (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

        // First call: try to lock (fails because already booked)
        // Second call: verify it's booked
        (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
        (TimeSlot.findById as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: {
                id: jest.fn().mockReturnValue(mockSlot)
            }
        });

        mockStripeSessionCreate.mockResolvedValue({
            id: 'sess_pending_retry',
            url: 'http://stripe.com/pending-retry'
        });

        await retryPayment(req as Request, res as Response, next);

        expect(mockStripeSessionCreate).toHaveBeenCalled();
        expect(mockBooking.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            url: 'http://stripe.com/pending-retry'
        }));
    });

    it('should rollback slot lock if Stripe session creation fails', async () => {
        req.body = { bookingId: 'booking123' };

        const fixedDate = new Date();
        const mockBooking = {
            _id: 'booking123',
            subVenueId: 'subVenue123',
            startTime: fixedDate,
            endTime: fixedDate,
            sport: 'Cricket',
            amount: 1000,
            currency: 'inr',
            status: 'Failed',
            save: jest.fn().mockResolvedValue(true)
        };
        (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

        const mockSlot = {
            _id: 'slot123',
            startTime: fixedDate,
            endTime: fixedDate
        };
        const mockTimeSlot = {
            _id: 'tsDoc123',
            slots: [mockSlot]
        };
        (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

        // Mock successful lock
        (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: [{ ...mockSlot, status: 'booked' }]
        });

        // Mock Stripe failure
        mockStripeSessionCreate.mockRejectedValue(new Error('Stripe Error'));

        await retryPayment(req as Request, res as Response, next);

        // Verify rollback was called
        expect(TimeSlot.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'tsDoc123', "slots._id": 'slot123' },
            expect.objectContaining({
                $set: expect.objectContaining({
                    "slots.$.status": "available"
                })
            })
        );

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
