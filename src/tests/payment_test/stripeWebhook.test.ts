import { Request, Response } from 'express';
import Booking from '../../models/Booking';
import TimeSlot from '../../models/TimeSlot';

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
