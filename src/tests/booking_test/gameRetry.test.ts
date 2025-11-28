import { Request, Response, NextFunction } from 'express';
import { retryPayment } from '../../controllers/Booking/retryPayment';
import Booking from '../../models/Booking';
import TimeSlot from '../../models/TimeSlot';
import Game from '../../models/gameModels';
import AppError from '../../utils/AppError';

// Mock dependencies
jest.mock('../../models/Booking');
jest.mock('../../models/TimeSlot');
jest.mock('../../models/gameModels');
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

describe('retryPayment Controller - Game Flow', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = 'test_secret';
        req = {
            body: { bookingId: 'bookingGame' },
            user: { _id: 'host123' }
        } as unknown as Request;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as Partial<Response>;

        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should set Game status to Full when retrying a game booking', async () => {
        // Mock Booking
        const mockBooking = {
            _id: 'bookingGame',
            user: 'host123',
            status: 'Failed',
            subVenueId: 'subVenue123',
            startTime: new Date(),
            endTime: new Date(),
            sport: 'Cricket',
            amount: 1000,
            currency: 'inr',
            gameId: 'game123', // Linked to a game
            save: jest.fn().mockResolvedValue(true)
        };
        (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

        // Mock TimeSlot (Available for re-lock)
        const mockSlot = {
            _id: 'slot123',
            startTime: mockBooking.startTime,
            endTime: mockBooking.endTime,
            status: 'available'
        };
        (TimeSlot.findOne as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: [mockSlot]
        });

        // Mock Atomic Lock
        (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: [{ ...mockSlot, status: 'booked' }]
        });

        // Mock Game
        const mockGame = {
            _id: 'game123',
            status: 'Open', // Currently Open (because booking failed)
            save: jest.fn().mockResolvedValue(true)
        };
        (Game.findById as jest.Mock).mockResolvedValue(mockGame);

        // Mock Stripe
        mockStripeSessionCreate.mockResolvedValue({
            id: 'sess_retry',
            url: 'http://stripe.com/retry'
        });

        await retryPayment(req as Request, res as Response, next);

        // Verify Game Status Update
        expect(Game.findById).toHaveBeenCalledWith('game123');
        expect(mockGame.status).toBe('Full');
        expect(mockGame.save).toHaveBeenCalled();

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            url: 'http://stripe.com/retry'
        }));
    });
});
