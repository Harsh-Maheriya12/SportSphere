import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Request, Response } from 'express';
import { createDirectBooking } from '../../controllers/Booking/directBooking';
import { verifyPayment } from '../../controllers/Booking/verifyPayment';
import { retryPayment } from '../../controllers/Booking/retryPayment';
import User from '../../models/User';
import Venue from '../../models/Venue';
import SubVenue from '../../models/SubVenue';
import TimeSlot from '../../models/TimeSlot';
import Booking from '../../models/Booking';
import AppError from '../../utils/AppError';

// Mock Stripe
const mockStripeSessionCreate = jest.fn();
const mockStripeSessionRetrieve = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: mockStripeSessionCreate,
                retrieve: mockStripeSessionRetrieve,
            },
        },
    }));
});

// Mock Logger
jest.mock('../../config/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

describe('Booking and Payment Integration Tests', () => {
    let mongod: MongoMemoryServer;
    let user: any;
    let venue: any;
    let subVenue: any;
    let timeSlot: any;
    let slotId: string;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        process.env.STRIPE_SECRET_KEY = 'test_secret_key';
        process.env.FRONTEND_URL = 'http://localhost:3000';
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });

    beforeEach(async () => {
        await User.deleteMany({});
        await Venue.deleteMany({});
        await SubVenue.deleteMany({});
        await TimeSlot.deleteMany({});
        await Booking.deleteMany({});
        jest.clearAllMocks();

        // Setup basic data
        user = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'player',
            age: 25,
            gender: 'male',
            profilePhoto: 'photo.jpg'
        });

        venue = await Venue.create({
            name: 'Test Venue',
            location: { type: 'Point', coordinates: [0, 0] },
            description: 'Test Description',
            address: 'Test Address',
            city: 'Test City',
            state: 'Test State',
            sports: ['Cricket'],
            amenities: ['Parking'],
            images: ['image.jpg'],
            owner: new mongoose.Types.ObjectId(),
        });

        subVenue = await SubVenue.create({
            name: 'Pitch 1',
            venue: venue._id,
            sport: 'Cricket',
            isIndoor: false,
            surfaceType: 'Grass',
            dimensions: '22 yards',
            pricePerHour: 1000,
            images: ['pitch.jpg']
        });

        const startTime = new Date();
        startTime.setHours(10, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(11, 0, 0, 0);

        timeSlot = await TimeSlot.create({
            subVenue: subVenue._id,
            date: startTime.toISOString().split('T')[0],
            slots: [{
                startTime,
                endTime,
                status: 'available',
                prices: { Cricket: 1000 }
            }]
        });

        slotId = timeSlot.slots[0]._id.toString();
    });

    const mockReq = (body: any = {}, query: any = {}) => ({
        body,
        query,
        user: { _id: user._id },
    } as unknown as Request);

    const mockRes = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res as Response;
    };

    const next = jest.fn();

    describe('createDirectBooking', () => {
        it('should successfully lock slot and create booking session', async () => {
            mockStripeSessionCreate.mockResolvedValue({
                id: 'sess_123',
                url: 'http://stripe.com/pay',
            });

            const req = mockReq({
                subVenueId: subVenue._id,
                timeSlotDocId: timeSlot._id,
                slotId: slotId,
                sport: 'Cricket'
            });
            const res = mockRes();

            await createDirectBooking(req, res, next);

            // Verify response
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                url: 'http://stripe.com/pay',
                bookingId: expect.any(Object)
            }));

            // Verify Slot Locked
            const updatedTs = await TimeSlot.findById(timeSlot._id);
            const slot = (updatedTs?.slots as any).find((s: any) => s._id.toString() === slotId);
            expect(slot?.status).toBe('booked');
            expect(slot?.bookedForSport).toBe('Cricket');

            // Verify Booking Created
            const booking = await Booking.findOne({ user: user._id });
            expect(booking).toBeTruthy();
            expect(booking?.status).toBe('Pending');
            expect(booking?.stripeSessionId).toBe('sess_123');
        });

        it('should fail if slot is already booked', async () => {
            // Manually book the slot first
            await TimeSlot.updateOne(
                { _id: timeSlot._id, "slots._id": slotId },
                { $set: { "slots.$.status": "booked" } }
            );

            const req = mockReq({
                subVenueId: subVenue._id,
                timeSlotDocId: timeSlot._id,
                slotId: slotId,
                sport: 'Cricket'
            });
            const res = mockRes();

            await createDirectBooking(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Slot is no longer available',
                statusCode: 400
            }));
        });

        it('should rollback slot lock if Stripe fails', async () => {
            mockStripeSessionCreate.mockRejectedValue(new Error('Stripe Error'));

            const req = mockReq({
                subVenueId: subVenue._id,
                timeSlotDocId: timeSlot._id,
                slotId: slotId,
                sport: 'Cricket'
            });
            const res = mockRes();

            await createDirectBooking(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Stripe Error'
            }));

            // Verify Slot Unlocked (Rolled back)
            const updatedTs = await TimeSlot.findById(timeSlot._id);
            const slot = (updatedTs?.slots as any).find((s: any) => s._id.toString() === slotId);
            expect(slot?.status).toBe('available');
            expect(slot?.bookedForSport).toBeNull();

            // Verify No Booking Created
            const booking = await Booking.findOne({ user: user._id });
            expect(booking).toBeNull();
        });
    });

    describe('verifyPayment', () => {
        it('should update booking status to Paid on success', async () => {
            // Create a pending booking
            const booking = await Booking.create({
                user: user._id,
                venueId: venue._id,
                subVenueId: subVenue._id,
                sport: 'Cricket',
                coordinates: { type: 'Point', coordinates: [0, 0] },
                startTime: new Date(),
                endTime: new Date(),
                amount: 1000,
                currency: 'inr',
                stripeSessionId: 'sess_valid',
                status: 'Pending'
            });

            mockStripeSessionRetrieve.mockResolvedValue({
                payment_status: 'paid',
                payment_intent: 'pi_123'
            });

            const req = mockReq({}, { sessionId: 'sess_valid' });
            const res = mockRes();

            await verifyPayment(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Payment verified successfully'
            }));

            const updatedBooking = await Booking.findById(booking._id);
            expect(updatedBooking?.status).toBe('Paid');
            expect(updatedBooking?.stripePaymentIntentId).toBe('pi_123');
        });

        it('should not update booking if payment not paid', async () => {
            const booking = await Booking.create({
                user: user._id,
                venueId: venue._id,
                subVenueId: subVenue._id,
                sport: 'Cricket',
                coordinates: { type: 'Point', coordinates: [0, 0] },
                startTime: new Date(),
                endTime: new Date(),
                amount: 1000,
                currency: 'inr',
                stripeSessionId: 'sess_unpaid',
                status: 'Pending'
            });

            mockStripeSessionRetrieve.mockResolvedValue({
                payment_status: 'unpaid'
            });

            const req = mockReq({}, { sessionId: 'sess_unpaid' });
            const res = mockRes();

            await verifyPayment(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: expect.stringContaining('Payment not completed')
            }));

            const updatedBooking = await Booking.findById(booking._id);
            expect(updatedBooking?.status).toBe('Pending');
        });
    });

    describe('retryPayment', () => {
        it('should successfully retry a Failed booking if slot is available', async () => {
            // Setup: Failed booking, Slot available
            const booking = await Booking.create({
                user: user._id,
                venueId: venue._id,
                subVenueId: subVenue._id,
                sport: 'Cricket',
                coordinates: { type: 'Point', coordinates: [0, 0] },
                startTime: timeSlot.slots[0].startTime,
                endTime: timeSlot.slots[0].endTime,
                amount: 1000,
                currency: 'inr',
                stripeSessionId: 'sess_old',
                status: 'Failed'
            });

            mockStripeSessionCreate.mockResolvedValue({
                id: 'sess_new',
                url: 'http://stripe.com/retry',
            });

            const req = mockReq({ bookingId: booking._id });
            const res = mockRes();

            await retryPayment(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                url: 'http://stripe.com/retry'
            }));

            // Verify Slot Locked
            const updatedTs = await TimeSlot.findById(timeSlot._id);
            const slot = updatedTs?.slots.id(slotId);
            expect(slot?.status).toBe('booked');

            // Verify Booking Updated
            const updatedBooking = await Booking.findById(booking._id);
            expect(updatedBooking?.status).toBe('Pending');
            expect(updatedBooking?.stripeSessionId).toBe('sess_new');
        });

        it('should fail retry if slot is taken by someone else', async () => {
            // Setup: Failed booking, Slot BOOKED
            const booking = await Booking.create({
                user: user._id,
                venueId: venue._id,
                subVenueId: subVenue._id,
                sport: 'Cricket',
                coordinates: { type: 'Point', coordinates: [0, 0] },
                startTime: timeSlot.slots[0].startTime,
                endTime: timeSlot.slots[0].endTime,
                amount: 1000,
                currency: 'inr',
                stripeSessionId: 'sess_old',
                status: 'Failed'
            });

            // Another user books the slot
            await TimeSlot.updateOne(
                { _id: timeSlot._id, "slots._id": slotId },
                { $set: { "slots.$.status": "booked" } }
            );

            const req = mockReq({ bookingId: booking._id });
            const res = mockRes();

            await retryPayment(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Slot is no longer available',
                statusCode: 400
            }));
        });
    });
});
