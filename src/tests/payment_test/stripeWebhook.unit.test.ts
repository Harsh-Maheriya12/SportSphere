import { Request, Response } from 'express';
import Booking from '../../models/Booking';
import TimeSlot from '../../models/TimeSlot';
import Game from '../../models/gameModels';

// Define mock function BEFORE jest.mock
const mockStripeWebhookConstructEvent = jest.fn();

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

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        webhooks: {
            constructEvent: mockStripeWebhookConstructEvent,
        },
    }));
});

// Import AFTER mocks are set up
import { stripeWebhook } from '../../controllers/payment/stripeWebhook';

describe('stripeWebhook - Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = 'test_secret';
        process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';

        req = {
            headers: { 'stripe-signature': 'valid_sig' },
            body: {}
        } as unknown as Request;

        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            sendStatus: jest.fn()
        } as Partial<Response>;

        mockStripeWebhookConstructEvent.mockReset();
        jest.clearAllMocks();
    });

    describe('Logic: Event Type Checking', () => {
        it('should handle checkout.session events with logging', async () => {
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_123',
                data: {
                    object: {
                        id: 'sess_123',
                        payment_status: 'paid',
                        payment_intent: 'pi_123'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockResolvedValue(null);

            await stripeWebhook(req as Request, res as Response);

            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });

        it('should handle non-checkout.session events', async () => {
            const mockEvent = {
                type: 'payment_intent.succeeded',
                id: 'evt_456',
                data: {
                    object: {
                        id: 'pi_456'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            await stripeWebhook(req as Request, res as Response);

            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logic: Expired Session - No Metadata/Booking', () => {
        it('should handle expired session when both metadata and booking are missing', async () => {
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid'
                        // No metadata
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockResolvedValue(null); // No booking

            await stripeWebhook(req as Request, res as Response);

            expect(Booking.findOne).toHaveBeenCalledWith({ stripeSessionId: 'sess_expired' });
            expect(TimeSlot.findOneAndUpdate).not.toHaveBeenCalled();
            expect(TimeSlot.findOne).not.toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logic: Expired Session - Metadata Without GameId', () => {
        it('should release slot using metadata without game cleanup', async () => {
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid',
                        metadata: {
                            timeSlotDocId: 'tsDoc123',
                            slotId: 'slot123'
                            // No gameId
                        }
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking123',
                status: 'Pending',
                stripeSessionId: 'sess_expired',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(true);

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Failed');
            expect(TimeSlot.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: 'tsDoc123', 'slots._id': 'slot123' },
                { $set: { 'slots.$.status': 'available', 'slots.$.bookedForSport': null } }
            );
            expect(Game.findById).not.toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logic: Expired Session - Game Not Found', () => {
        it('should handle expired session when game is not found', async () => {
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid',
                        metadata: {
                            gameId: 'game123',
                            timeSlotDocId: 'tsDoc123',
                            slotId: 'slot123'
                        }
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking123',
                status: 'Pending',
                stripeSessionId: 'sess_expired',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(true);
            (Game.findById as jest.Mock).mockResolvedValue(null); // Game not found

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Failed');
            expect(Game.findById).toHaveBeenCalledWith('game123');
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logic: Expired Session - Fallback Slot Not Found', () => {
        it('should handle expired session when fallback TimeSlot is not found', async () => {
            const startTime = new Date('2024-01-15T10:00:00Z');
            const endTime = new Date('2024-01-15T11:00:00Z');

            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid'
                        // No metadata
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking123',
                status: 'Pending',
                stripeSessionId: 'sess_expired',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(null); // TimeSlot not found

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Failed');
            expect(TimeSlot.findOne).toHaveBeenCalledWith({
                subVenue: 'subVenue123',
                date: '2024-01-15'
            });
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logic: Expired Session - Fallback Slot Index Not Found', () => {
        it('should handle expired session when slot index is not found in fallback', async () => {
            const startTime = new Date('2024-01-15T10:00:00Z');
            const endTime = new Date('2024-01-15T11:00:00Z');

            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking123',
                status: 'Pending',
                stripeSessionId: 'sess_expired',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            // TimeSlot exists but no matching slot
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [
                    {
                        _id: 'slot123',
                        startTime: new Date('2024-01-15T11:00:00Z'), // Different time
                        endTime: new Date('2024-01-15T12:00:00Z'),
                        status: 'booked'
                    }
                ],
                save: jest.fn().mockResolvedValue(true)
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Failed');
            expect(mockTimeSlot.save).not.toHaveBeenCalled(); // Slot not found, so no save
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logic: Expired Session - Partial Metadata', () => {
        it('should use fallback when metadata has only timeSlotDocId', async () => {
            const startTime = new Date('2024-01-15T10:00:00Z');
            const endTime = new Date('2024-01-15T11:00:00Z');

            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid',
                        metadata: {
                            timeSlotDocId: 'tsDoc123'
                            // Missing slotId
                        }
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking123',
                status: 'Pending',
                stripeSessionId: 'sess_expired',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'booked',
                bookedForSport: 'Cricket'
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot],
                save: jest.fn().mockResolvedValue(true)
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Failed');
            expect(TimeSlot.findOneAndUpdate).not.toHaveBeenCalled(); // Metadata incomplete
            expect(TimeSlot.findOne).toHaveBeenCalled(); // Fallback used
            expect(mockSlot.status).toBe('available');
            expect(mockSlot.bookedForSport).toBeNull();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });

        it('should use fallback when metadata has only slotId', async () => {
            const startTime = new Date('2024-01-15T10:00:00Z');
            const endTime = new Date('2024-01-15T11:00:00Z');

            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid',
                        metadata: {
                            slotId: 'slot123'
                            // Missing timeSlotDocId
                        }
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking123',
                status: 'Pending',
                stripeSessionId: 'sess_expired',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot = {
                _id: 'slot123',
                startTime,
                endTime,
                status: 'booked',
                bookedForSport: 'Cricket'
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot],
                save: jest.fn().mockResolvedValue(true)
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Failed');
            expect(TimeSlot.findOneAndUpdate).not.toHaveBeenCalled(); // Metadata incomplete
            expect(TimeSlot.findOne).toHaveBeenCalled(); // Fallback used
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logic: Completed Session - Booking Update Fields', () => {
        it('should update both status and payment intent for completed session', async () => {
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_completed',
                data: {
                    object: {
                        id: 'sess_completed',
                        payment_status: 'paid',
                        payment_intent: 'pi_123'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking123',
                status: 'Pending',
                stripeSessionId: 'sess_completed',
                stripePaymentIntentId: undefined,
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Paid');
            expect(mockBooking.stripePaymentIntentId).toBe('pi_123');
            expect(mockBooking.save).toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logic: Time Comparison in Fallback', () => {
        it('should correctly match slots by exact time comparison', async () => {
            const startTime = new Date('2024-01-15T10:00:00.000Z');
            const endTime = new Date('2024-01-15T11:00:00.000Z');

            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking123',
                status: 'Pending',
                stripeSessionId: 'sess_expired',
                subVenueId: 'subVenue123',
                startTime,
                endTime,
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockSlot1 = {
                _id: 'slot1',
                startTime: new Date('2024-01-15T09:00:00.000Z'),
                endTime: new Date('2024-01-15T10:00:00.000Z'),
                status: 'booked'
            };
            const mockSlot2 = {
                _id: 'slot2',
                startTime: new Date('2024-01-15T10:00:00.000Z'), // Exact match
                endTime: new Date('2024-01-15T11:00:00.000Z'), // Exact match
                status: 'booked',
                bookedForSport: 'Cricket'
            };
            const mockTimeSlot = {
                _id: 'tsDoc123',
                slots: [mockSlot1, mockSlot2],
                save: jest.fn().mockResolvedValue(true)
            };
            (TimeSlot.findOne as jest.Mock).mockResolvedValue(mockTimeSlot);

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Failed');
            expect(mockSlot1.status).toBe('booked'); // Not changed
            expect(mockSlot2.status).toBe('available'); // Changed
            expect(mockSlot2.bookedForSport).toBeNull();
            expect(mockTimeSlot.save).toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });
});
