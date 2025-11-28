import { Request, Response } from 'express';
import Booking from '../../models/Booking';
import TimeSlot from '../../models/TimeSlot';
import Game from '../../models/gameModels';

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

// Define mock function BEFORE jest.mock
const mockStripeWebhookConstructEvent = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        webhooks: {
            constructEvent: mockStripeWebhookConstructEvent,
        },
    }));
});

// Import AFTER mocks are set up
import { stripeWebhook } from '../../controllers/payment/stripeWebhook';

describe('stripeWebhook Controller', () => {
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

        // Reset all mocks
        mockStripeWebhookConstructEvent.mockReset();
        jest.clearAllMocks();
    });

    describe('checkout.session.completed', () => {
        it('should mark booking as Paid when session is completed', async () => {
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_123',
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

            expect(Booking.findOne).toHaveBeenCalledWith({ stripeSessionId: 'sess_completed' });
            expect(mockBooking.status).toBe('Paid');
            expect(mockBooking.stripePaymentIntentId).toBe('pi_123');
            expect(mockBooking.save).toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });

        it('should log warning when no booking found for completed session', async () => {
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_456',
                data: {
                    object: {
                        id: 'sess_unknown',
                        payment_status: 'paid',
                        payment_intent: 'pi_456'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockResolvedValue(null);

            await stripeWebhook(req as Request, res as Response);

            expect(Booking.findOne).toHaveBeenCalledWith({ stripeSessionId: 'sess_unknown' });
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('checkout.session.expired', () => {
        it('should mark booking as Failed and release slot when session expires', async () => {
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

            expect(Booking.findOne).toHaveBeenCalledWith({ stripeSessionId: 'sess_expired' });
            expect(mockBooking.status).toBe('Failed');
            expect(mockBooking.save).toHaveBeenCalled();
            expect(TimeSlot.findOne).toHaveBeenCalledWith({
                subVenue: 'subVenue123',
                date: '2024-01-15'
            });
            expect(mockSlot.status).toBe('available');
            expect(mockSlot.bookedForSport).toBeNull();
            expect(mockTimeSlot.save).toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });

        it('should release slot using metadata if available (Robust Unlocking)', async () => {
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired_metadata',
                data: {
                    object: {
                        id: 'sess_expired_metadata',
                        payment_status: 'unpaid',
                        metadata: {
                            timeSlotDocId: 'tsDoc123',
                            slotId: 'slot123'
                        }
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'bookingMetadata',
                status: 'Pending',
                stripeSessionId: 'sess_expired_metadata',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(true);

            await stripeWebhook(req as Request, res as Response);

            expect(Booking.findOne).toHaveBeenCalledWith({ stripeSessionId: 'sess_expired_metadata' });
            expect(mockBooking.status).toBe('Failed');

            // Verify robust unlocking via findOneAndUpdate
            expect(TimeSlot.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    _id: 'tsDoc123',
                    "slots._id": 'slot123'
                },
                {
                    $set: {
                        "slots.$.status": "available",
                        "slots.$.bookedForSport": null
                    }
                }
            );
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });

        it('should handle expired session when booking has no subVenueId', async () => {
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired_no_venue',
                data: {
                    object: {
                        id: 'sess_expired_no_venue',
                        payment_status: 'unpaid'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const mockBooking = {
                _id: 'booking456',
                status: 'Pending',
                stripeSessionId: 'sess_expired_no_venue',
                subVenueId: null, // No subVenueId
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            await stripeWebhook(req as Request, res as Response);

            expect(mockBooking.status).toBe('Failed');
            expect(mockBooking.save).toHaveBeenCalled();
            expect(TimeSlot.findOne).not.toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });

        it('should handle expired session when no booking found', async () => {
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired_no_booking',
                data: {
                    object: {
                        id: 'sess_expired_no_booking',
                        payment_status: 'unpaid'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockResolvedValue(null);

            await stripeWebhook(req as Request, res as Response);

            expect(Booking.findOne).toHaveBeenCalledWith({ stripeSessionId: 'sess_expired_no_booking' });
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });

        it('should reset Game status to Open when session expires for a game booking', async () => {
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired_game',
                data: {
                    object: {
                        id: 'sess_expired_game',
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
                _id: 'bookingGame',
                status: 'Pending',
                stripeSessionId: 'sess_expired_game',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            const mockGame = {
                _id: 'game123',
                status: 'Full',
                save: jest.fn().mockResolvedValue(true)
            };
            (Game.findById as jest.Mock).mockResolvedValue(mockGame);

            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({});

            await stripeWebhook(req as Request, res as Response);

            expect(Game.findById).toHaveBeenCalledWith('game123');
            expect(mockGame.status).toBe('Open');
            expect(mockGame.save).toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('payment_intent.payment_failed', () => {
        it('should log payment failure', async () => {
            const mockEvent = {
                type: 'payment_intent.payment_failed',
                id: 'evt_failed',
                data: {
                    object: {
                        id: 'pi_failed'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            await stripeWebhook(req as Request, res as Response);

            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('payment_intent.succeeded', () => {
        it('should log payment success', async () => {
            const mockEvent = {
                type: 'payment_intent.succeeded',
                id: 'evt_succeeded',
                data: {
                    object: {
                        id: 'pi_succeeded'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            await stripeWebhook(req as Request, res as Response);

            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('unhandled event types', () => {
        it('should log warning for unhandled event types', async () => {
            const mockEvent = {
                type: 'customer.created',
                id: 'evt_unhandled',
                data: {
                    object: {
                        id: 'cus_123'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            await stripeWebhook(req as Request, res as Response);

            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
    });

    describe('Logger verification tests', () => {
        it('should log webhook received with event type and ID', async () => {
            const logger = require('../../config/logger').default;
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_logger_test',
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

            expect(logger.info).toHaveBeenCalledWith('Webhook received: checkout.session.completed [ID: evt_logger_test]');
        });

        it('should log session details for checkout.session events', async () => {
            const logger = require('../../config/logger').default;
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_123',
                data: {
                    object: {
                        id: 'sess_details_test',
                        payment_status: 'paid',
                        payment_intent: 'pi_123'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockResolvedValue(null);

            await stripeWebhook(req as Request, res as Response);

            expect(logger.info).toHaveBeenCalledWith('Session ID: sess_details_test, Status: paid');
        });

        it('should log checkout session completed with session ID', async () => {
            const logger = require('../../config/logger').default;
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_123',
                data: {
                    object: {
                        id: 'sess_completed_log',
                        payment_status: 'paid',
                        payment_intent: 'pi_123'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockResolvedValue(null);

            await stripeWebhook(req as Request, res as Response);

            expect(logger.info).toHaveBeenCalledWith('Checkout session completed: sess_completed_log');
        });

        it('should log booking marked as Paid with booking ID', async () => {
            const logger = require('../../config/logger').default;
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

            const mockBooking = {
                _id: 'booking_log_test',
                status: 'Pending',
                stripeSessionId: 'sess_123',
                stripePaymentIntentId: undefined,
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);

            await stripeWebhook(req as Request, res as Response);

            expect(logger.info).toHaveBeenCalledWith('Booking booking_log_test marked as Paid');
        });

        it('should log warning when no booking found with session ID', async () => {
            const logger = require('../../config/logger').default;
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_123',
                data: {
                    object: {
                        id: 'sess_not_found',
                        payment_status: 'paid',
                        payment_intent: 'pi_123'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockResolvedValue(null);

            await stripeWebhook(req as Request, res as Response);

            expect(logger.warn).toHaveBeenCalledWith('No booking found for session sess_not_found');
        });

        it('should log expired session with session ID', async () => {
            const logger = require('../../config/logger').default;
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired_log',
                        payment_status: 'unpaid'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockResolvedValue(null);

            await stripeWebhook(req as Request, res as Response);

            expect(logger.info).toHaveBeenCalledWith('Checkout session expired: sess_expired_log');
        });

        it('should log game status reset with game ID', async () => {
            const logger = require('../../config/logger').default;
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_expired',
                        payment_status: 'unpaid',
                        metadata: {
                            gameId: 'game_log_test',
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

            const mockGame = {
                _id: 'game_log_test',
                status: 'Full',
                save: jest.fn().mockResolvedValue(true)
            };
            (Game.findById as jest.Mock).mockResolvedValue(mockGame);
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(true);

            await stripeWebhook(req as Request, res as Response);

            expect(logger.info).toHaveBeenCalledWith('Game game_log_test status reset to Open (booking expired)');
        });

        it('should log slot released via metadata with session ID', async () => {
            const logger = require('../../config/logger').default;
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_expired',
                data: {
                    object: {
                        id: 'sess_metadata_log',
                        payment_status: 'unpaid',
                        metadata: {
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
                stripeSessionId: 'sess_metadata_log',
                save: jest.fn().mockResolvedValue(true)
            };
            (Booking.findOne as jest.Mock).mockResolvedValue(mockBooking);
            (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(true);

            await stripeWebhook(req as Request, res as Response);

            expect(logger.info).toHaveBeenCalledWith('Slot released via metadata for session sess_metadata_log');
        });

        it('should log slot released via fallback with booking ID', async () => {
            const logger = require('../../config/logger').default;
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
                _id: 'booking_fallback_log',
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

            expect(logger.info).toHaveBeenCalledWith('Slot released via fallback for booking booking_fallback_log');
        });

        it('should log payment failed with payment intent ID', async () => {
            const logger = require('../../config/logger').default;
            const mockEvent = {
                type: 'payment_intent.payment_failed',
                id: 'evt_failed',
                data: {
                    object: {
                        id: 'pi_failed_log'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            await stripeWebhook(req as Request, res as Response);

            expect(logger.error).toHaveBeenCalledWith('Payment failed: pi_failed_log');
        });

        it('should log webhook signature error with error message', async () => {
            const logger = require('../../config/logger').default;
            mockStripeWebhookConstructEvent.mockImplementation(() => {
                throw new Error('Invalid signature test');
            });

            await stripeWebhook(req as Request, res as Response);

            expect(logger.error).toHaveBeenCalledWith('Stripe Webhook Signature Error: Invalid signature test');
        });
    });

    describe('error handling', () => {
        it('should return 400 when webhook signature is invalid', async () => {
            mockStripeWebhookConstructEvent.mockImplementation(() => {
                throw new Error('Invalid signature');
            });

            await stripeWebhook(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('Webhook Error: Invalid signature');
        });

        it('should return 500 when webhook processing fails', async () => {
            const mockEvent = {
                type: 'checkout.session.completed',
                id: 'evt_error',
                data: {
                    object: {
                        id: 'sess_error',
                        payment_status: 'paid',
                        payment_intent: 'pi_error'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);
            (Booking.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

            await stripeWebhook(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith('Webhook processing error: Database error');
        });
    });
});
