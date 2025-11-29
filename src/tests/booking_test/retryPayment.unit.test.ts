import { Request, Response, NextFunction } from 'express';
import { retryPayment } from '../../controllers/Booking/retryPayment';
import Booking from '../../models/Booking';
import TimeSlot from '../../models/TimeSlot';
import Game from '../../models/gameModels';
import AppError from '../../utils/AppError';
import mongoose from 'mongoose';

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

describe('retryPayment - Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = 'test_secret';
        process.env.FRONTEND_URL = 'http://localhost:3000';

        req = {
            body: { bookingId: 'booking123' },
            user: { _id: 'user123' }
        } as unknown as Request;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as Partial<Response>;

        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Validation: Missing Booking ID', () => {
        it('should throw 400 error when bookingId is not provided', async () => {
            req.body = {};

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Booking ID is required');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('Validation: Booking Not Found', () => {
        it('should throw 404 error when booking does not exist', async () => {
            (Booking.findOne as jest.Mock).mockResolvedValue(null);

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Booking not found');
            expect(error.statusCode).toBe(404);
        });
    });

    describe('Validation: Booking Already Paid', () => {
        it('should throw 400 error when booking is already paid', async () => {
            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Paid'
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Booking is already paid');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('Validation: Missing SubVenue ID', () => {
        it('should throw 400 error when booking has no subVenueId', async () => {
            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Failed',
                subVenueId: null
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Invalid booking: missing subVenueId');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('Validation: TimeSlot Not Found', () => {
        it('should throw 404 error when TimeSlot does not exist', async () => {
            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Failed',
                subVenueId: 'subVenue123',
                startTime: new Date(Date.now() + 86400000),
                endTime: new Date(Date.now() + 90000000)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(null);

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('TimeSlot not found');
            expect(error.statusCode).toBe(404);
        });
    });

    describe('Validation: Slot Not Found', () => {
        it('should throw 404 error when slot does not exist', async () => {
            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Failed',
                subVenueId: 'subVenue123',
                startTime: new Date(Date.now() + 86400000),
                endTime: new Date(Date.now() + 90000000)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [] // No matching slot
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Slot not found');
            expect(error.statusCode).toBe(404);
        });
    });

    describe('Logic: Failed Booking - Slot Re-lock Failed', () => {
        it('should throw error when slot cannot be locked for Failed booking', async () => {
            const startTime = new Date(Date.now() + 86400000);
            const endTime = new Date(Date.now() + 90000000);

            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Failed',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                sport: 'Cricket'
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'booked' // Already booked
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot]
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            // Atomic lock fails
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Slot is no longer available');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('Logic: Pending Booking - Slot Available', () => {
        it('should lock slot when retrying Pending booking with available slot', async () => {
            const startTime = new Date(Date.now() + 86400000);
            const endTime = new Date(Date.now() + 90000000);

            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Pending',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                sport: 'Cricket',
                amount: 1000,
                currency: 'inr',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'available'
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot]
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            // Atomic lock succeeds
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
                _id: 'tsDoc123',
                slots: [{ ...mockSlot, status: 'booked' }]
            });

            mockStripeSessionCreate.mockResolvedValue({
                id: 'sess_retry',
                url: 'http://stripe.com/retry'
            });

            await retryPayment(req as Request, res as Response, next);

            expect(TimeSlot.findOneAndUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    _id: 'tsDoc123',
                    'slots._id': 'slot123',
                    'slots.status': 'available'
                }),
                expect.objectContaining({
                    $set: expect.objectContaining({
                        'slots.$.status': 'booked',
                        'slots.$.bookedForSport': 'Cricket'
                    })
                }),
                { new: true }
            );

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                url: 'http://stripe.com/retry'
            }));
        });
    });

    describe('Logic: Pending Booking - Slot Already Booked', () => {
        it('should proceed when retrying Pending booking with already booked slot', async () => {
            const startTime = new Date(Date.now() + 86400000);
            const endTime = new Date(Date.now() + 90000000);

            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Pending',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                sport: 'Cricket',
                amount: 1000,
                currency: 'inr',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'booked' // Already booked
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot]
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            // First lock attempt fails (slot not available)
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

            // Refresh check shows slot is booked
            (TimeSlot.findById as jest.Mock).mockResolvedValue({
                _id: 'tsDoc123',
                slots: {
                    id: jest.fn().mockReturnValue(mockSlot)
                }
            });

            mockStripeSessionCreate.mockResolvedValue({
                id: 'sess_retry',
                url: 'http://stripe.com/retry'
            });

            await retryPayment(req as Request, res as Response, next);

            expect(TimeSlot.findById).toHaveBeenCalledWith('tsDoc123');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                url: 'http://stripe.com/retry'
            }));
        });
    });

    describe('Logic: Pending Booking - Slot Not Available', () => {
        it('should throw error when Pending booking slot is neither available nor booked', async () => {
            const startTime = new Date(Date.now() + 86400000);
            const endTime = new Date(Date.now() + 90000000);

            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Pending',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                sport: 'Cricket'
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'available'
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot]
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            // Lock attempt fails
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

            // Refresh shows slot is now in invalid state
            const invalidSlot = {
                _id: 'slot123',
                status: 'unavailable' // Not booked, not available
            };
            (TimeSlot.findById as jest.Mock).mockResolvedValue({
                _id: 'tsDoc123',
                slots: {
                    id: jest.fn().mockReturnValue(invalidSlot)
                }
            });

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Slot is not available for retry');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('Logic: Game Booking Retry', () => {
        it('should update game status to Full when retrying game booking', async () => {
            const startTime = new Date(Date.now() + 86400000);
            const endTime = new Date(Date.now() + 90000000);

            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Failed',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                sport: 'Cricket',
                amount: 1000,
                currency: 'inr',
                gameId: 'game123',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'available'
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot]
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
                _id: 'tsDoc123',
                slots: [{ ...mockSlot, status: 'booked' }]
            });

            const mockGame = {
                _id: 'game123',
                status: 'Open',
                save: jest.fn().mockResolvedValue(true)
            };
            (Game.findById as jest.Mock).mockResolvedValue(mockGame);

            mockStripeSessionCreate.mockResolvedValue({
                id: 'sess_retry',
                url: 'http://stripe.com/retry'
            });

            await retryPayment(req as Request, res as Response, next);

            expect(Game.findById).toHaveBeenCalledWith('game123');
            expect(mockGame.status).toBe('Full');
            expect(mockGame.save).toHaveBeenCalled();
        });

        it('should handle retry when game is not found', async () => {
            const startTime = new Date(Date.now() + 86400000);
            const endTime = new Date(Date.now() + 90000000);

            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Failed',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                sport: 'Cricket',
                amount: 1000,
                currency: 'inr',
                gameId: 'game123',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'available'
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot]
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
                _id: 'tsDoc123',
                slots: [{ ...mockSlot, status: 'booked' }]
            });

            // Game not found
            (Game.findById as jest.Mock).mockResolvedValue(null);

            mockStripeSessionCreate.mockResolvedValue({
                id: 'sess_retry',
                url: 'http://stripe.com/retry'
            });

            await retryPayment(req as Request, res as Response, next);

            expect(Game.findById).toHaveBeenCalledWith('game123');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                url: 'http://stripe.com/retry'
            }));
        });
    });

    describe('Error Handling: Rollback on Stripe Failure', () => {
        it('should rollback slot lock when Stripe session creation fails', async () => {
            const startTime = new Date(Date.now() + 86400000);
            const endTime = new Date(Date.now() + 90000000);

            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Failed',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                sport: 'Cricket',
                amount: 1000,
                currency: 'inr',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'available'
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot]
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
                _id: 'tsDoc123',
                slots: [{ ...mockSlot, status: 'booked' }]
            });

            // Stripe fails
            mockStripeSessionCreate.mockRejectedValue(new Error('Stripe API error'));

            await retryPayment(req as Request, res as Response, next);

            // Verify rollback was called
            expect(TimeSlot.findOneAndUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ _id: 'tsDoc123', 'slots._id': 'slot123' }),
                expect.objectContaining({
                    $set: expect.objectContaining({
                        'slots.$.status': 'available',
                        'slots.$.bookedForSport': null
                    })
                })
            );

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should not rollback when slot was not locked by this retry', async () => {
            const startTime = new Date(Date.now() + 86400000);
            const endTime = new Date(Date.now() + 90000000);

            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Pending',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                sport: 'Cricket',
                amount: 1000,
                currency: 'inr',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'booked' // Already booked
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot]
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            // Lock attempt fails (slot already booked)
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(null);

            // Refresh shows slot is booked
            (TimeSlot.findById as jest.Mock).mockResolvedValue({
                _id: 'tsDoc123',
                slots: {
                    id: jest.fn().mockReturnValue(mockSlot)
                }
            });

            // Stripe fails
            mockStripeSessionCreate.mockRejectedValue(new Error('Stripe API error'));

            await retryPayment(req as Request, res as Response, next);

            // Verify rollback was NOT called (only one call for the lock attempt)
            expect(TimeSlot.findOneAndUpdate).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('Validation: Invalid Booking Status', () => {
        it('should throw error for invalid booking status', async () => {
            const mockBooking = {
                _id: 'booking123',
                user: 'user123',
                status: 'Cancelled' // Invalid status for retry
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            await retryPayment(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Invalid booking status for retry');
            expect(error.statusCode).toBe(400);
        });
    });
});
