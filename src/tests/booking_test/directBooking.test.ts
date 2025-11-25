import { Request, Response, NextFunction } from 'express';
import { createDirectBooking } from '../../controllers/Booking/directBooking';
import TimeSlot from '../../models/TimeSlot';
import Booking from '../../models/Booking';
import SubVenue from '../../models/SubVenue';
import AppError from '../../utils/AppError';

// Mock dependencies
jest.mock('../../models/TimeSlot');
jest.mock('../../models/Booking');
jest.mock('../../models/SubVenue');
jest.mock('../../models/Venue');
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

describe('createDirectBooking Controller', () => {
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

    it('should successfully create a booking and return Stripe URL', async () => {
        req.body = {
            subVenueId: 'subVenue123',
            timeSlotDocId: 'tsDoc123',
            slotId: 'slot123',
            sport: 'Cricket'
        };

        // Mock SubVenue
        (SubVenue.findById as jest.Mock).mockResolvedValue({
            _id: 'subVenue123',
            venue: 'venue123',
            pricePerHour: 1000,
            sports: [{ name: 'Cricket' }]
        });

        // Mock TimeSlot findOneAndUpdate (locking the slot)
        const mockSlot = {
            _id: 'slot123',
            startTime: new Date(),
            endTime: new Date(),
            prices: { Cricket: 1000 },
            status: 'available',
            bookedForSport: null
        };

        (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: [mockSlot]
        });

        // Mock Booking create
        (Booking.create as jest.Mock).mockResolvedValue({
            _id: 'booking123',
            status: 'Pending',
            stripeSessionId: 'sess_123'
        });

        // Mock Stripe
        mockStripeSessionCreate.mockResolvedValue({
            id: 'sess_123',
            url: 'http://stripe.com/pay'
        });

        // Mock TimeSlot findById (Validation)
        (TimeSlot.findById as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: {
                id: jest.fn().mockReturnValue(mockSlot)
            }
        });

        // Mock Venue findById
        (jest.requireMock('../../models/Venue').default.findById as jest.Mock).mockResolvedValue({
            _id: 'venue123',
            location: { coordinates: [0, 0] }
        });

        await createDirectBooking(req as Request, res as Response, next);
        if ((next as jest.Mock).mock.calls.length > 0) {
            console.log('DirectBooking Error:', (next as jest.Mock).mock.calls[0][0]);
        }

        expect(TimeSlot.findOneAndUpdate).toHaveBeenCalled();
        expect(Booking.create).toHaveBeenCalled();
        expect(mockStripeSessionCreate).toHaveBeenCalledWith(expect.objectContaining({
            mode: 'payment',
            expires_at: expect.any(Number),
            line_items: [
                expect.objectContaining({
                    price_data: expect.objectContaining({
                        unit_amount: 100000 // 1000 * 100
                    })
                })
            ],
            metadata: expect.objectContaining({
                type: 'direct',
                userId: 'user123',
                bookingId: expect.any(String),
                timeSlotDocId: 'tsDoc123',
                slotId: 'slot123'
            })
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            url: 'http://stripe.com/pay'
        }));
    });

    it('should return 400 if required fields are missing', async () => {
        req.body = {}; // Missing fields

        await createDirectBooking(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Missing required fields');
    });

    it('should return 400 if slot is not available', async () => {
        req.body = {
            subVenueId: 'subVenue123',
            timeSlotDocId: 'tsDoc123',
            slotId: 'slot123',
            sport: 'Cricket'
        };

        (SubVenue.findById as jest.Mock).mockResolvedValue({
            _id: 'subVenue123',
            venue: 'venue123',
            pricePerHour: 1000,
            sports: [{ name: 'Cricket' }]
        });

        const mockSlot = {
            _id: 'slot123',
            startTime: new Date(),
            endTime: new Date(),
            prices: { Cricket: 1000 },
            status: 'booked',
            bookedForSport: 'Cricket'
        };

        // Mock TimeSlot findById (Validation)
        (TimeSlot.findById as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: {
                id: jest.fn().mockReturnValue({ ...mockSlot, status: 'booked' }) // Already booked
            }
        });

        // Mock findOneAndUpdate returning null (condition failed, slot likely booked)
        (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

        await createDirectBooking(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Slot is no longer available');
    });

    it('should rollback slot lock if Stripe session creation fails', async () => {
        req.body = {
            subVenueId: 'subVenue123',
            timeSlotDocId: 'tsDoc123',
            slotId: 'slot123',
            sport: 'Cricket'
        };

        (SubVenue.findById as jest.Mock).mockResolvedValue({
            _id: 'subVenue123',
            venue: 'venue123',
            pricePerHour: 1000,
            sports: [{ name: 'Cricket' }]
        });

        const mockSlot = {
            _id: 'slot123',
            startTime: new Date(),
            endTime: new Date(),
            prices: { Cricket: 1000 },
            status: 'available',
            bookedForSport: null
        };

        (TimeSlot.findOneAndUpdate as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: [mockSlot]
        });

        // Mock TimeSlot findById (Validation)
        (TimeSlot.findById as jest.Mock).mockResolvedValue({
            _id: 'tsDoc123',
            slots: {
                id: jest.fn().mockReturnValue(mockSlot)
            }
        });

        // Mock Venue findById
        (jest.requireMock('../../models/Venue').default.findById as jest.Mock).mockResolvedValue({
            _id: 'venue123',
            location: { coordinates: [0, 0] }
        });

        // Mock Stripe Failure
        mockStripeSessionCreate.mockRejectedValue(new Error('Stripe Error'));

        try {
            await createDirectBooking(req as Request, res as Response, next);
        } catch (e) {
            console.log('DirectBooking Rollback Caught in Test:', e);
        }
        if ((next as jest.Mock).mock.calls.length > 0) {
            console.log('DirectBooking Rollback Next:', (next as jest.Mock).mock.calls[0][0]);
        }

        // Verify Rollback
        // Verify Rollback
        expect(TimeSlot.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ _id: 'tsDoc123', "slots._id": 'slot123' }),
            expect.objectContaining({
                $set: expect.objectContaining({
                    "slots.$.status": "available"
                })
            })
        );

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
