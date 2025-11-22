import { Request, Response } from "express";
import Stripe from "stripe";
import AppError from "../../utils/AppError";
import logger from "../../config/logger";
import Booking from "../../models/Booking";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-10-29.clover",
});

export const stripeWebhook = async (req : Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    logger.error(`Stripe Webhook Signature Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  logger.info(`Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info(`Checkout session completed: ${session.id}`);
        
        // Find and update the booking
        const booking = await Booking.findOne({ stripeSessionId: session.id });
        
        if (booking) {
          booking.status = "Paid";
          booking.stripePaymentIntentId = session.payment_intent as string;
          await booking.save();
          
          logger.info(`Booking ${booking._id} marked as Paid`);
        } else {
          logger.warn(`No booking found for session ${session.id}`);
        }
        break;

      case "checkout.session.expired":
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        logger.info(`⏰ Checkout session expired: ${expiredSession.id}`);
        
        // Mark booking as failed
        const expiredBooking = await Booking.findOne({ stripeSessionId: expiredSession.id });
        if (expiredBooking) {
          expiredBooking.status = "Failed";
          await expiredBooking.save();
          logger.info(`Booking ${expiredBooking._id} marked as Failed (expired)`);
        }
        break;

      case "payment_intent.succeeded":
        logger.info(`Payment succeeded: ${event.data.object.id}`);
        break;

      case "payment_intent.payment_failed":
        logger.error(`Payment failed: ${event.data.object.id}`);
        break;

      default:
        logger.warn(`Unhandled event type ${event.type}`);
    }
  } catch (err: any) {
    logger.error(`Error processing webhook: ${err.message}`);
    res.status(500).send(`Webhook processing error: ${err.message}`);
    return;
  }

  res.sendStatus(200);
  return; 
};
