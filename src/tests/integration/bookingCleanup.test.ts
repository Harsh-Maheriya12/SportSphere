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
import Game, { IGame } from '../../models/gameModels';

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
        // Reset all mocks first
        mockStripeSessionExpire.mockReset();
        mockStripeSessionRetrieve.mockReset();
        mockStripeWebhookConstructEvent.mockReset();
        jest.clearAllMocks();

        await User.deleteMany({});
        await Venue.deleteMany({});
        await SubVenue.deleteMany({});
        await TimeSlot.deleteMany({});
        await TimeSlot.deleteMany({});
        await Booking.deleteMany({});
        await Game.deleteMany({});

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

        it('should manually fail booking and unlock slot if session is already expired (Webhook Missed)', async () => {
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
                stripeSessionId: 'sess_already_expired',
                status: 'Pending',
                createdAt: fifteenMinutesAgo
            });

            // Mock Stripe to return already expired session with metadata
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'expired',
                metadata: {
                    timeSlotDocId: timeSlot._id.toString(),
                    slotId: slotId
                }
            });

            // Mock Atomic Lock (Unlock)
            const mockFindOneAndUpdate = jest.spyOn(TimeSlot, 'findOneAndUpdate');
            mockFindOneAndUpdate.mockResolvedValue(true);

            await cleanupExpiredBookings();

            expect(mockStripeSessionRetrieve).toHaveBeenCalledWith('sess_already_expired');

            // Verify Booking Failed
            const updatedBooking = await Booking.findById(booking._id);
            expect(updatedBooking?.status).toBe('Failed');

            // Verify Slot Unlocked via Metadata
            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                {
                    _id: timeSlot._id.toString(),
                    "slots._id": slotId
                },
                {
                    $set: {
                        "slots.$.status": "available",
                        "slots.$.bookedForSport": null
                    }
                }
            );

            mockFindOneAndUpdate.mockRestore();
        });

        it('should reset Game status to Open if cleanup handles expired game session', async () => {
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

            // Create a Game
            const game: IGame = await Game.create({
                host: user._id,
                sport: 'cricket',
                description: 'Test Game',
                venue: {
                    venueId: venue._id,
                    venueName: 'Test Venue',
                    city: 'Test City',
                    coordinates: { type: 'Point', coordinates: [0, 0] }
                },
                subVenue: {
                    subVenueId: subVenue._id,
                    name: 'Pitch 1'
                },
                slot: {
                    timeSlotDocId: timeSlot._id,
                    slotId: slotId,
                    date: '2024-01-01',
                    startTime: new Date(),
                    endTime: new Date(),
                    price: 500
                },
                playersNeeded: { min: 2, max: 10 },
                approxCostPerPlayer: 100,
                status: 'Full' // Initially Full
            });

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
                stripeSessionId: 'sess_game_cleanup',
                status: 'Pending',
                createdAt: fifteenMinutesAgo
            });

            // Mock Stripe to return already expired session with GAME metadata
            mockStripeSessionRetrieve.mockResolvedValue({
                status: 'expired',
                metadata: {
                    gameId: (game._id as mongoose.Types.ObjectId).toString(),
                    slotId: slotId
                }
            });

            await cleanupExpiredBookings();

            // Verify Game Status Reset
            const updatedGame = await Game.findById(game._id);
            expect(updatedGame?.status).toBe('Open');
        });

        it('should handle Stripe API errors gracefully', async () => {
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

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
                stripeSessionId: 'sess_error',
                status: 'Pending',
                createdAt: fifteenMinutesAgo
            });

            // Mock Stripe to throw an error
            mockStripeSessionRetrieve.mockRejectedValue(new Error('Stripe API Error'));

            // Should not throw, just log error
            await expect(cleanupExpiredBookings()).resolves.not.toThrow();

            expect(mockStripeSessionRetrieve).toHaveBeenCalledWith('sess_error');
        });

        it('should handle no expired bookings gracefully', async () => {
            // Don't create any expired bookings
            // The cleanup should just return early

            await cleanupExpiredBookings();

            // Should not call Stripe at all
            expect(mockStripeSessionRetrieve).not.toHaveBeenCalled();
            expect(mockStripeSessionExpire).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            // Mock Booking.find to throw a database error
            const mockBookingFind = jest.spyOn(Booking, 'find');
            mockBookingFind.mockRejectedValue(new Error('Database connection error'));

            // Should not throw, just log error
            await expect(cleanupExpiredBookings()).resolves.not.toThrow();

            // Restore the original implementation
            mockBookingFind.mockRestore();
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
