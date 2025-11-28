import cron from 'node-cron';
import Stripe from 'stripe';
import Booking from '../models/Booking';
import TimeSlot from '../models/TimeSlot';
import Game from '../models/gameModels';
import logger from '../config/logger';

// Lazy-load Stripe
let stripe: Stripe;
const getStripe = () => {
    if (!stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            logger.error('STRIPE_SECRET_KEY is not set');
            throw new Error('STRIPE_SECRET_KEY is not set');
        }
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-10-29.clover',
        });
    }
    return stripe;
};

export const cleanupExpiredBookings = async () => {
    logger.info('Running booking cleanup job...');

    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        // Find pending bookings created more than 10 minutes ago
        // We only care about those that have a stripeSessionId
        const expiredBookings = await Booking.find({
            status: 'Pending',
            createdAt: { $lt: tenMinutesAgo },
            stripeSessionId: { $exists: true, $ne: null }
        });

        if (expiredBookings.length === 0) {
            logger.info(' No expired bookings found.');
            return;
        }

        logger.info(`Found ${expiredBookings.length} expired pending bookings. Processing...`);

        const stripeClient = getStripe();

        for (const booking of expiredBookings) {
            try {
                if (!booking.stripeSessionId) continue;

                // Check session status first
                const session = await stripeClient.checkout.sessions.retrieve(booking.stripeSessionId);

                if (session.status === 'open') {
                    // Expire the session
                    // This will trigger the 'checkout.session.expired' webhook
                    // which handles the slot release and booking status update
                    await stripeClient.checkout.sessions.expire(booking.stripeSessionId);
                    logger.info(`Expired session ${booking.stripeSessionId} for booking ${booking._id}`);
                } else if (session.status === 'expired') {
                    // If already expired but booking is still Pending, the webhook likely failed.
                    // Perform manual cleanup as a fallback.
                    logger.warn(`Session ${booking.stripeSessionId} is already expired but booking ${booking._id} is still Pending. Running manual cleanup.`);

                    booking.status = 'Failed';
                    await booking.save();

                    // Robust Unlocking: Use metadata if available
                    const metadata = session.metadata;
                    if (metadata && metadata.timeSlotDocId && metadata.slotId) {
                        await TimeSlot.findOneAndUpdate(
                            {
                                _id: metadata.timeSlotDocId,
                                "slots._id": metadata.slotId
                            },
                            {
                                $set: {
                                    "slots.$.status": "available",
                                    "slots.$.bookedForSport": null
                                }
                            }
                        );
                        logger.info(`Slot released via metadata for booking ${booking._id} (cleanup job)`);
                    } else if (booking.subVenueId) {
                        // Fallback: Use booking details
                        const dateStr = booking.startTime.toISOString().split('T')[0]; // YYYY-MM-DD

                        const timeSlot = await TimeSlot.findOne({
                            subVenue: booking.subVenueId,
                            date: dateStr
                        });

                        if (timeSlot) {
                            const slotIndex = timeSlot.slots.findIndex((s: any) =>
                                new Date(s.startTime).getTime() === new Date(booking.startTime).getTime() &&
                                new Date(s.endTime).getTime() === new Date(booking.endTime).getTime()
                            );

                            if (slotIndex !== -1) {
                                timeSlot.slots[slotIndex].status = "available";
                                timeSlot.slots[slotIndex].bookedForSport = null;
                                await timeSlot.save();
                                logger.info(`Slot released via booking lookup for booking ${booking._id} (cleanup job)`);
                            }
                        }
                    }

                    // Reset Game Status if applicable
                    if (metadata && metadata.gameId) {
                        const game = await Game.findById(metadata.gameId);
                        if (game) {
                            game.status = 'Open';
                            await game.save();
                            logger.info(`Game ${game._id} status reset to Open (cleanup job)`);
                        }
                    }
                }
            } catch (err: any) {
                logger.error(`Failed to expire session for booking ${booking._id}: ${err.message}`);
            }
        }
    } catch (error: any) {
        logger.error(`Error in booking cleanup job: ${error.message}`);
    }
};

export const initBookingCleanup = () => {
    // Run every minute
    cron.schedule('* * * * *', () => {
        cleanupExpiredBookings();
    });
    logger.info('Booking cleanup job scheduled (runs every minute).');
};
