import cron from 'node-cron';
import Stripe from 'stripe';
import Booking from '../models/Booking';
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
                    // If already expired but booking is still Pending, we might have missed the webhook
                    // Let's manually trigger the logic or just log it. 
                    // Ideally, we should rely on the webhook logic to keep things DRY.
                    // But if the webhook failed, we might want a fallback here.
                    // For now, let's just log. The webhook retry policy should handle transient failures.
                    logger.warn(`Session ${booking.stripeSessionId} is already expired but booking ${booking._id} is still Pending.`);

                    // Optional: Force fail if needed, but better to investigate why webhook didn't fire
                    // booking.status = 'Failed';
                    // await booking.save();
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
