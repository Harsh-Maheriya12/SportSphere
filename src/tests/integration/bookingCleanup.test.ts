import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Request, Response } from 'express';
import { cleanupExpiredBookings } from '../../services/bookingCleanup';
import { getSlotsForSubVenueDate } from '../../controllers/timeslotController';
// import { stripeWebhook } from '../../controllers/payment/stripeWebhook';
import User from '../../models/User';
import Venue from '../../models/Venue';
import SubVenue from '../../models/SubVenue';
import TimeSlot from '../../models/TimeSlot';
import Booking from '../../models/Booking';

// Mock Stripe
const mockStripeSessionExpire = jest.fn();
const mockStripeSessionRetrieve = jest.fn();
const mockStripeWebhookConstructEvent = jest.fn();

jest.mock('stripe');
import Stripe from 'stripe';

// Mock Logger
jest.mock('../../config/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

describe('Booking Cleanup Integration Tests', () => {
    let mongod: MongoMemoryServer;
    let user: any;
    let venue: any;
    let subVenue: any;
    let timeSlot: any;
    let slotId: string;
    let stripeWebhook: any; // Variable to hold the dynamically imported function

    beforeAll(async () => {
        // Setup Stripe Mock Implementation BEFORE importing module that uses it
        (Stripe as unknown as jest.Mock).mockImplementation(() => ({
            checkout: {
                sessions: {
                    expire: mockStripeSessionExpire,
                    retrieve: mockStripeSessionRetrieve,
                },
            },
            webhooks: {
                constructEvent: mockStripeWebhookConstructEvent,
            },
        }));

        // Dynamically import stripeWebhook
        // Dynamically import stripeWebhook
        const webhookModule = require('../../controllers/payment/stripeWebhook');
        stripeWebhook = webhookModule.stripeWebhook;

        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        process.env.STRIPE_SECRET_KEY = 'test_secret_key';
        process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';
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
                status: 'booked', // Initially booked
                bookedForSport: 'Cricket',
                prices: { Cricket: 1000 }
            }]
        });

        slotId = timeSlot.slots[0]._id.toString();
    });

    describe('cleanupExpiredBookings', () => {
        it('should expire Stripe session for old pending bookings', async () => {
            // Create an expired booking (created 15 mins ago)
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

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
                stripeSessionId: 'sess_expired',
                status: 'Pending',
                createdAt: fifteenMinutesAgo // Manually set createdAt
            });

            // Mock Stripe responses
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'open'
            });
            mockStripeSessionExpire.mockResolvedValue({
                status: 'expired'
            });

            await cleanupExpiredBookings();

            expect(mockStripeSessionRetrieve).toHaveBeenCalledWith('sess_expired');
            expect(mockStripeSessionExpire).toHaveBeenCalledWith('sess_expired');
        });

        it('should not expire recent pending bookings', async () => {
            // Create a recent booking (created 5 mins ago)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            await Booking.create({
                user: user._id,
                venueId: venue._id,
                subVenueId: subVenue._id,
                sport: 'Cricket',
                coordinates: { type: 'Point', coordinates: [0, 0] },
                startTime: timeSlot.slots[0].startTime,
                endTime: timeSlot.slots[0].endTime,
                amount: 1000,
                currency: 'inr',
                stripeSessionId: 'sess_recent',
                status: 'Pending',
                createdAt: fiveMinutesAgo
            });

            await cleanupExpiredBookings();

            expect(mockStripeSessionRetrieve).not.toHaveBeenCalled();
            expect(mockStripeSessionExpire).not.toHaveBeenCalled();
        });
    });

    describe('stripeWebhook - checkout.session.expired', () => {
        it('should release slot and mark booking as Failed on session expiry', async () => {
            // Setup: Booking is Pending, Slot is Booked
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
                stripeSessionId: 'sess_expired_webhook',
                status: 'Pending'
            });

            // Mock Webhook Event
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_123',
                data: {
                    object: {
                        id: 'sess_expired_webhook',
                        payment_status: 'unpaid'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const req = {
                headers: { 'stripe-signature': 'valid_sig' },
                body: {} // body is processed by constructEvent
            } as unknown as Request;

            const res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                sendStatus: jest.fn()
            } as unknown as Response;

            await stripeWebhook(req, res);

            expect(res.sendStatus).toHaveBeenCalledWith(200);

            // Verify Booking Failed
            const updatedBooking = await Booking.findById(booking._id);
            expect(updatedBooking?.status).toBe('Failed');

            // Verify Slot Released
            const updatedTs = await TimeSlot.findById(timeSlot._id);
            const slot = updatedTs?.slots.id(slotId);
            expect(slot?.status).toBe('available');
            expect(slot?.bookedForSport).toBeNull();
        });

        it('should return slot as available in getSlots API after cleanup', async () => {
            // Setup: Booking is Pending, Slot is Booked
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
                stripeSessionId: 'sess_expired_api_check',
                status: 'Pending'
            });

            // Mock Webhook Event
            const mockEvent = {
                type: 'checkout.session.expired',
                id: 'evt_api_check',
                data: {
                    object: {
                        id: 'sess_expired_api_check',
                        payment_status: 'unpaid'
                    }
                }
            };

            mockStripeWebhookConstructEvent.mockReturnValue(mockEvent);

            const reqWebhook = {
                headers: { 'stripe-signature': 'valid_sig' },
                body: {}
            } as unknown as Request;

            const resWebhook = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                sendStatus: jest.fn()
            } as unknown as Response;

            // Trigger Cleanup via Webhook
            await stripeWebhook(reqWebhook, resWebhook);

            // Verify API Response
            const reqApi = {
                params: { subVenueId: subVenue._id.toString() },
                query: { date: timeSlot.date }
            } as unknown as Request;

            const resApi = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            } as unknown as Response;

            await getSlotsForSubVenueDate(reqApi, resApi);

            expect(resApi.status).toHaveBeenCalledWith(200);
            expect(resApi.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                timeSlot: expect.objectContaining({
                    slots: expect.arrayContaining([
                        expect.objectContaining({
                            _id: expect.anything(), // The ID might be an object or string depending on serialization
                            status: 'available',
                            bookedForSport: null
                        })
                    ])
                })
            }));

            // More specific check to ensure OUR slot is available
            const jsonResponse = (resApi.json as jest.Mock).mock.calls[0][0];
            const returnedSlot = jsonResponse.timeSlot.slots.find((s: any) => s._id.toString() === slotId);
            expect(returnedSlot).toBeTruthy();
            expect(returnedSlot.status).toBe('available');
        });
    });
});
