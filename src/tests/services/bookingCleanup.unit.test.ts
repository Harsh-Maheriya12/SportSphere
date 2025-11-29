import { cleanupExpiredBookings } from '../../services/bookingCleanup';
import Booking from '../../models/Booking';
import TimeSlot from '../../models/TimeSlot';
import Game from '../../models/gameModels';
import logger from '../../config/logger';

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

const mockStripeSessionRetrieve = jest.fn();
const mockStripeSessionExpire = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                retrieve: mockStripeSessionRetrieve,
                expire: mockStripeSessionExpire,
            },
        },
    }));
});

describe('bookingCleanup - Unit Tests', () => {
    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = 'test_secret';
        jest.clearAllMocks();
    });

    describe('Validation: STRIPE_SECRET_KEY Missing', () => {
        it('should throw error when STRIPE_SECRET_KEY is not set', async () => {
            delete process.env.STRIPE_SECRET_KEY;

            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_123',
                status: 'Pending',
                createdAt: new Date(Date.now() - 15 * 60 * 1000)
            };

            (Booking.find as jest.Mock).mockResolvedValue([mockBooking]);

            await cleanupExpiredBookings();

            expect(logger.error).toHaveBeenCalledWith('STRIPE_SECRET_KEY is not set');
        });
    });

    describe('Logic: No Expired Bookings', () => {
        it('should return early when no expired bookings are found', async () => {
            (Booking.find as jest.Mock).mockResolvedValue([]);

            await cleanupExpiredBookings();

            expect(logger.info).toHaveBeenCalledWith('Running booking cleanup job...');
            expect(logger.info).toHaveBeenCalledWith(' No expired bookings found.');
            expect(mockStripeSessionRetrieve).not.toHaveBeenCalled();
        });
    });

    describe('Logic: Expire Open Session', () => {
        it('should expire an open Stripe session', async () => {
            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_123',
                status: 'Pending',
                createdAt: new Date(Date.now() - 15 * 60 * 1000)
            };

            (Booking.find as jest.Mock).mockResolvedValue([mockBooking]);
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'open',
                metadata: {}
            });
            mockStripeSessionExpire.mockResolvedValue({
                status: 'expired'
            });

            await cleanupExpiredBookings();

            expect(mockStripeSessionRetrieve).toHaveBeenCalledWith('sess_123');
            expect(mockStripeSessionExpire).toHaveBeenCalledWith('sess_123');
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Expired session sess_123')
            );
        });
    });

    describe('Logic: Session Already Expired - With Metadata', () => {
        it('should perform manual cleanup using metadata when session is already expired', async () => {
            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_expired',
                status: 'Pending',
                createdAt: new Date(Date.now() - 15 * 60 * 1000),
                save: jest.fn().mockResolvedValue(true)
            };

            (Booking.find as jest.Mock).mockResolvedValue([mockBooking]);
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'expired',
                metadata: {
                    timeSlotDocId: 'tsDoc123',
                    slotId: 'slot123'
                }
            });

            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(true);

            await cleanupExpiredBookings();

            expect(mockBooking.status).toBe('Failed');
            expect(mockBooking.save).toHaveBeenCalled();
            expect(TimeSlot.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    _id: 'tsDoc123',
                    'slots._id': 'slot123'
                },
                {
                    $set: {
                        'slots.$.status': 'available',
                        'slots.$.bookedForSport': null
                    }
                }
            );
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('already expired but booking')
            );
        });
    });

    describe('Logic: Session Expired - Fallback Slot Release', () => {
        it('should use fallback method to release slot when metadata is missing', async () => {
            const startTime = new Date('2024-01-01T10:00:00Z');
            const endTime = new Date('2024-01-01T11:00:00Z');

            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_expired',
                status: 'Pending',
                createdAt: new Date(Date.now() - 15 * 60 * 1000),
                subVenueId: 'subVenue123',
                startTime: startTime,
                endTime: endTime,
                save: jest.fn().mockResolvedValue(true)
            };

            const mockSlot = {
                startTime: startTime,
                endTime: endTime,
                status: 'booked',
                bookedForSport: 'Cricket'
            };

            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot],
                save: jest.fn().mockResolvedValue(true)
            };

            (Booking.find as jest.Mock).mockResolvedValue([mockBooking]);
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'expired',
                metadata: {} // No metadata
            });

            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            await cleanupExpiredBookings();

            expect(mockBooking.status).toBe('Failed');
            expect(mockSlot.status).toBe('available');
            expect(mockSlot.bookedForSport).toBeNull();
            expect(mockTimeSlot.save).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Slot released via booking lookup')
            );
        });
    });

    describe('Logic: Game Cleanup When Session Expired', () => {
        it('should reset game status to Open when game booking expires', async () => {
            const mockGame = {
                _id: 'game123',
                status: 'Full',
                save: jest.fn().mockResolvedValue(true)
            };

            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_expired',
                status: 'Pending',
                createdAt: new Date(Date.now() - 15 * 60 * 1000),
                save: jest.fn().mockResolvedValue(true)
            };

            (Booking.find as jest.Mock).mockResolvedValue([mockBooking]);
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'expired',
                metadata: {
                    gameId: 'game123',
                    timeSlotDocId: 'tsDoc123',
                    slotId: 'slot123'
                }
            });

            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(true);
            (Game.findById as jest.Mock).mockResolvedValue(mockGame);

            await cleanupExpiredBookings();

            expect(mockGame.status).toBe('Open');
            expect(mockGame.save).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Game game123 status reset to Open')
            );
        });
    });

    describe('Error Handling: Stripe Retrieve Fails', () => {
        it('should log error and continue when Stripe retrieve fails', async () => {
            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_123',
                status: 'Pending',
                createdAt: new Date(Date.now() - 15 * 60 * 1000)
            };

            (Booking.find as jest.Mock).mockResolvedValue([mockBooking]);
            mockStripeSessionRetrieve.mockRejectedValue(new Error('Stripe API error'));

            await cleanupExpiredBookings();

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to expire session for booking booking123')
            );
        });
    });

    describe('Error Handling: Stripe Expire Fails', () => {
        it('should log error when Stripe expire fails', async () => {
            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_123',
                status: 'Pending',
                createdAt: new Date(Date.now() - 15 * 60 * 1000)
            };

            (Booking.find as jest.Mock).mockResolvedValue([mockBooking]);
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'open',
                metadata: {}
            });
            mockStripeSessionExpire.mockRejectedValue(new Error('Stripe expire failed'));

            await cleanupExpiredBookings();

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to expire session for booking booking123')
            );
        });
    });

    describe('Error Handling: Database Query Fails', () => {
        it('should log error when Booking.find fails', async () => {
            (Booking.find as jest.Mock).mockRejectedValue(new Error('Database connection error'));

            await cleanupExpiredBookings();

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error in booking cleanup job')
            );
        });
    });

    describe('Logic: Multiple Bookings Cleanup', () => {
        it('should process multiple expired bookings', async () => {
            const mockBookings = [
                {
                    _id: 'booking1',
                    stripeSessionId: 'sess_1',
                    status: 'Pending',
                    createdAt: new Date(Date.now() - 15 * 60 * 1000)
                },
                {
                    _id: 'booking2',
                    stripeSessionId: 'sess_2',
                    status: 'Pending',
                    createdAt: new Date(Date.now() - 20 * 60 * 1000)
                }
            ];

            (Booking.find as jest.Mock).mockResolvedValue(mockBookings);
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'open',
                metadata: {}
            });
            mockStripeSessionExpire.mockResolvedValue({
                status: 'expired'
            });

            await cleanupExpiredBookings();

            expect(mockStripeSessionRetrieve).toHaveBeenCalledTimes(2);
            expect(mockStripeSessionExpire).toHaveBeenCalledTimes(2);
            expect(mockStripeSessionExpire).toHaveBeenCalledWith('sess_1');
            expect(mockStripeSessionExpire).toHaveBeenCalledWith('sess_2');
        });
    });

    describe('Edge Case: Booking Without Session ID', () => {
        it('should skip bookings without stripeSessionId', async () => {
            const mockBookings = [
                {
                    _id: 'booking1',
                    stripeSessionId: null, // No session ID
                    status: 'Pending',
                    createdAt: new Date(Date.now() - 15 * 60 * 1000)
                },
                {
                    _id: 'booking2',
                    stripeSessionId: 'sess_2',
                    status: 'Pending',
                    createdAt: new Date(Date.now() - 15 * 60 * 1000)
                }
            ];

            (Booking.find as jest.Mock).mockResolvedValue(mockBookings);
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'open',
                metadata: {}
            });
            mockStripeSessionExpire.mockResolvedValue({
                status: 'expired'
            });

            await cleanupExpiredBookings();

            // Should only process booking2
            expect(mockStripeSessionRetrieve).toHaveBeenCalledTimes(1);
            expect(mockStripeSessionRetrieve).toHaveBeenCalledWith('sess_2');
        });
    });

    describe('Success: Verify Logging', () => {
        it('should log appropriate messages during cleanup', async () => {
            const mockBooking = {
                _id: 'booking123',
                stripeSessionId: 'sess_123',
                status: 'Pending',
                createdAt: new Date(Date.now() - 15 * 60 * 1000)
            };

            (Booking.find as jest.Mock).mockResolvedValue([mockBooking]);
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'open',
                metadata: {}
            });
            mockStripeSessionExpire.mockResolvedValue({
                status: 'expired'
            });

            await cleanupExpiredBookings();

            expect(logger.info).toHaveBeenCalledWith('Running booking cleanup job...');
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Found 1 expired pending bookings')
            );
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Expired session sess_123')
            );
        });
    });
});
