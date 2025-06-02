import { templateService } from '../services/templateService';
import { emailService } from '../services/emailService';
import { logger } from '../utils/logger';
import { natsConnection } from '../events/natsClient'; // To register subscribers
import { config } from '../config'; // For fromEmail if needed, though emailService handles it

// --- Event Payload Interfaces ---
// These should match the payloads published by the Scheduling Service for these events.

interface BookingUserDetails {
    name?: string; // e.g., "John Doe"
    email: string; 
}

interface BookingServiceDetails {
    name: string;
    durationMinutes: number;
    price?: number; // Optional price
    currency?: string;
}

interface BookingBusinessDetails {
    name: string;
    ownerEmail: string; // Email of the business owner/contact point
    phone?: string;
}

// booking.confirmed event payload
// IMPORTANT: This payload structure is an *assumption*. It needs to match what Scheduling Service publishes.
// Scheduling service's BookingConfirmedEvent payload was:
// { bookingId, customerId, serviceId, businessId, newStatus, startTime, endTime }
// This needs enrichment with emails, names, etc.
// For MVP, we assume enrichment happens *before* this service, or this service makes calls.
// The prompt says: "For MVP, assume necessary details like email are available or can be simplified."
// I will proceed with the assumption that the event payload is enriched.
interface BookingConfirmedPayload {
    bookingId: string;
    customer: BookingUserDetails; // Enriched data
    business: BookingBusinessDetails; // Enriched data
    service: BookingServiceDetails; // Enriched data
    startTime: string; // ISO 8601 string
    endTime: string;   // ISO 8601 string
    // Other relevant details like price, currency might be directly in service or booking details
}

// booking.cancelled event payload
interface BookingCancelledPayload {
    bookingId: string;
    customer: BookingUserDetails; // Enriched data
    business: BookingBusinessDetails; // Enriched data
    service: BookingServiceDetails; // Enriched data
    startTime: string; // ISO 8601 string
    cancellationReason?: string;
    cancelledBy?: string; // e.g., "CUSTOMER", "BUSINESS_OWNER", "SYSTEM"
}


// --- Event Handler Functions ---

async function handleBookingConfirmed(payload: BookingConfirmedPayload): Promise<void> {
    logger.info("Handling booking.confirmed event", { bookingId: payload.bookingId });

    const bookingDate = new Date(payload.startTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const bookingTime = new Date(payload.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

    // 1. Send confirmation to customer
    try {
        const customerEmailData = {
            customerName: payload.customer.name || 'Valued Customer',
            serviceName: payload.service.name,
            businessName: payload.business.name,
            bookingId: payload.bookingId,
            bookingDate: bookingDate,
            bookingTime: bookingTime,
            durationMinutes: payload.service.durationMinutes,
            price: payload.service.price,
            currency: payload.service.currency,
            businessPhone: payload.business.phone,
        };
        const customerHtml = await templateService.render('booking-confirmation', customerEmailData);
        await emailService.sendEmail(
            payload.customer.email,
            `Your Booking for ${payload.service.name} is Confirmed! (ID: ${payload.bookingId.substring(0,8)})`,
            customerHtml
        );
        logger.info("Booking confirmation email sent to customer", { bookingId: payload.bookingId, customerEmail: payload.customer.email });
    } catch (error) {
        logger.error("Failed to send booking confirmation to customer", { bookingId: payload.bookingId, error });
    }

    // 2. Send notification to business owner
    try {
        const businessEmailData = {
            businessOwnerName: payload.business.name, // Or a specific owner name if available
            businessName: payload.business.name,
            serviceName: payload.service.name,
            bookingId: payload.bookingId,
            customerName: payload.customer.name || 'N/A',
            customerEmail: payload.customer.email,
            bookingDate: bookingDate,
            bookingTime: bookingTime,
            durationMinutes: payload.service.durationMinutes,
            price: payload.service.price,
            currency: payload.service.currency,
        };
        const businessHtml = await templateService.render('new-booking-to-business', businessEmailData);
        await emailService.sendEmail(
            payload.business.ownerEmail,
            `New Booking Received: ${payload.service.name} (ID: ${payload.bookingId.substring(0,8)})`,
            businessHtml
        );
        logger.info("New booking notification email sent to business", { bookingId: payload.bookingId, businessOwnerEmail: payload.business.ownerEmail });
    } catch (error) {
        logger.error("Failed to send new booking notification to business", { bookingId: payload.bookingId, error });
    }

    // 3. Reminder scheduling logic (MVP: Log)
    const reminderTime = new Date(new Date(payload.startTime).getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
    logger.info(`Reminder scheduling (MVP): Logged for booking ${payload.bookingId} at ${reminderTime.toISOString()}`);
}

async function handleBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
    logger.info("Handling booking.cancelled event", { bookingId: payload.bookingId });

    const bookingDate = new Date(payload.startTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const bookingTime = new Date(payload.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

    // 1. Send cancellation to customer
    try {
        const customerEmailData = {
            customerName: payload.customer.name || 'Valued Customer',
            serviceName: payload.service.name,
            businessName: payload.business.name,
            bookingId: payload.bookingId,
            bookingDate: bookingDate,
            bookingTime: bookingTime,
            cancellationReason: payload.cancellationReason || "Not provided",
            businessPhone: payload.business.phone,
            bookingLink: config.email.provider === 'console' ? "#" : (process.env.FRONTEND_URL || "https://slotwise.com") // Placeholder for actual booking link
        };
        const customerHtml = await templateService.render('booking-cancellation-customer', customerEmailData);
        await emailService.sendEmail(
            payload.customer.email,
            `Your Booking for ${payload.service.name} has been Cancelled (ID: ${payload.bookingId.substring(0,8)})`,
            customerHtml
        );
        logger.info("Booking cancellation email sent to customer", { bookingId: payload.bookingId, customerEmail: payload.customer.email });
    } catch (error) {
        logger.error("Failed to send booking cancellation to customer", { bookingId: payload.bookingId, error });
    }

    // 2. Send cancellation notification to business owner
    try {
        const businessEmailData = {
            businessOwnerName: payload.business.name, // Or a specific owner name
            businessName: payload.business.name,
            serviceName: payload.service.name,
            bookingId: payload.bookingId,
            customerName: payload.customer.name || 'N/A',
            customerEmail: payload.customer.email,
            bookingDate: bookingDate,
            bookingTime: bookingTime,
            cancellationReason: payload.cancellationReason || "Not provided",
            cancelledBy: payload.cancelledBy || "N/A"
        };
        const businessHtml = await templateService.render('booking-cancellation-business', businessEmailData);
        await emailService.sendEmail(
            payload.business.ownerEmail,
            `Booking Cancelled: ${payload.service.name} by ${payload.customer.name || 'customer'} (ID: ${payload.bookingId.substring(0,8)})`,
            businessHtml
        );
        logger.info("Booking cancellation notification email sent to business", { bookingId: payload.bookingId, businessOwnerEmail: payload.business.ownerEmail });
    } catch (error) {
        logger.error("Failed to send booking cancellation notification to business", { bookingId: payload.bookingId, error });
    }
}


// Function to initialize subscribers
export function initializeBookingEventSubscribers(): void {
    if (!natsConnection.isConnected()) {
        logger.warn("NATS connection not established. Cannot initialize booking event subscribers.");
        // Optionally, retry connection or handle this state appropriately.
        // For now, just returning. Connection is usually awaited in index.ts.
        return;
    }

    // These subject names must match what Scheduling Service publishes
    const bookingConfirmedSubject = "booking.confirmed"; 
    const bookingCancelledSubject = "booking.cancelled";

    natsConnection.subscribe(bookingConfirmedSubject, async (data: BookingConfirmedPayload) => {
        await handleBookingConfirmed(data);
    }).catch(err => logger.error(`Failed to subscribe to ${bookingConfirmedSubject}`, { error: err }));

    natsConnection.subscribe(bookingCancelledSubject, async (data: BookingCancelledPayload) => {
        await handleBookingCancelled(data);
    }).catch(err => logger.error(`Failed to subscribe to ${bookingCancelledSubject}`, { error: err }));

    logger.info("Booking event subscribers initialized.");
}
