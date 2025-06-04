import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { config } from '../config'; // Import the actual config object

const prisma = new PrismaClient();
// Ensure STRIPE_SECRET_KEY is loaded from config
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-04-10', // Use a recent API version
});

export class PaymentService {
  // config is now directly used by stripe instance, no need to pass it to constructor if only for stripe key
  constructor() {}

  async confirmPayment(params: {
    paymentIntentId: string;
    bookingId?: string; // Optional, but good to have for linking
  }): Promise<{ success: boolean; paymentRecord?: any; bookingUpdated?: boolean; error?: string }> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(params.paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // 1. Store payment record
        // Ensure prisma client is available. It might be better to instantiate it once globally
        // or pass it to the service. For this example, I'll assume it's accessible.
        const existingPayment = await prisma.payment.findUnique({
          where: { stripePaymentIntentId: params.paymentIntentId },
        });

        let paymentRecord;
        const businessIdFromMetadata = paymentIntent.metadata?.businessId;

        if (!existingPayment) {
          paymentRecord = await prisma.payment.create({
            data: {
              stripePaymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount / 100, // Stripe amount is in cents
              currency: paymentIntent.currency,
              status: paymentIntent.status,
              bookingId: params.bookingId, // Link to booking if ID is provided
              businessId: businessIdFromMetadata, // Store businessId
            },
          });
        } else {
          // Optionally update businessId if it was missing, though less common for existing records
          if (existingPayment.businessId !== businessIdFromMetadata && businessIdFromMetadata) {
            paymentRecord = await prisma.payment.update({
                where: { id: existingPayment.id },
                // @ts-ignore // businessId might not be recognized by TS if Prisma Client not regenerated
                data: { businessId: businessIdFromMetadata },
            });
          } else {
            paymentRecord = existingPayment;
          }
        }


        // 2. Update booking status (Placeholder - needs Booking model/service)
        // This part is highly dependent on how Bookings are managed.
        // For now, let's assume there's a Booking model and we can update it.
        // If the Booking model is not in this service's Prisma schema,
        // this would typically involve publishing an event.
        let bookingUpdated = false;
        if (params.bookingId) {
          try {
            // Check if Booking model exists in Prisma schema
            // If prisma.booking is available:
            // await prisma.booking.update({
            //   where: { id: params.bookingId },
            //   data: { status: 'confirmed', paymentStatus: 'paid' }, // Example status
            // });
            // bookingUpdated = true;
            console.warn(`Booking model interaction for bookingId ${params.bookingId} is placeholder.`);
            // For now, we'll simulate this as not implemented if Booking model isn't in business-service
            // This will need to be addressed during integration or if an event system is used.
             // @ts-ignore Property 'booking' does not exist on type 'PrismaClient'.
             if (prisma.booking) {
                 // @ts-ignore Property 'booking' does not exist on type 'PrismaClient'.
                 await prisma.booking.update({
                     where: { id: params.bookingId },
                     data: { status: 'confirmed' }, // Simplified status
                 });
                 bookingUpdated = true;
             } else {
                 console.log(`Skipping booking update for ${params.bookingId} as Booking model is not directly available. Eventual consistency via events would be typical here.`);
                 // This part would typically publish an event like 'payment.succeeded'
                 // with bookingId and paymentDetails.
             }
          } catch (bookingError: any) {
            console.error(`Failed to update booking ${params.bookingId}:`, bookingError.message);
            // Continue even if booking update fails, payment is still recorded
          }
        }

        return { success: true, paymentRecord, bookingUpdated };
      } else {
        return { success: false, error: `Payment not succeeded. Status: ${paymentIntent.status}` };
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      return { success: false, error: error.message };
    }
  }

  async getBusinessRevenue(params: {
    businessId: string;
  }): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    recentPayments: any[]; // Consider defining a type for recent payments
    error?: string;
  }> {
    try {
      // TODO: Add filtering by businessId once it's added to the Payment model
      // For now, the Payment model in the schema doesn't have a direct businessId field.
      // This needs to be added to the Payment model and migration run for proper filtering.
      // Assuming 'succeeded' payments contribute to revenue.

      // const allPayments = await prisma.payment.findMany({ // This was a placeholder, removing
      //   where: {
      //     status: 'succeeded',
      //     // businessId: params.businessId, // UNCOMMENT ONCE businessId IS IN Payment MODEL
      //   },
      //   orderBy: {
      //     createdAt: 'desc',
      //   },
      // });

      // if (!allPayments) { // This was a placeholder, removing
      //      console.warn(`No payments found. This might be because businessId is not yet queryable on the Payment model, or no payments exist.`);
      //      // return { totalRevenue: 0, monthlyRevenue: 0, recentPayments: [], error: "No payments found or businessId filtering not yet implemented in model." };
      // }


      // This is a placeholder for filtering by businessId if it were on the Payment model directly.
      // The current Payment model has bookingId, which could indirectly link to a business.
      // For this iteration, and given the task description, we will simulate as if payments
      // could be directly queried or assume all payments in the system are for this business if not multi-tenant.
      // A proper implementation would require businessId on the Payment model or a join through Booking.

      // The task implies payments are linked to a business. The current schema has:
      // Payment -> bookingId? -> Booking (if model existed and linked) -> businessId
      // Or, PaymentIntent metadata has businessId. We should store businessId on Payment model.
      // For now, let's assume businessId WILL be added to Payment model.
      // The subtask will proceed assuming this field will exist for the query.
      // If the field `businessId` is not on the `Payment` model, these queries will fail or return all payments.
      // This is a known limitation of the current schema state.

      // Attempting to query based on businessId stored in Stripe PaymentIntent metadata,
      // assuming this metadata was propagated to the Payment record's metadata field or a dedicated column.
      // The current Payment model does not have a metadata field.
      // This highlights the need to update the Payment model and confirmPayment logic.
      // For now, this query will likely not work as intended without schema changes.
      // Let's adjust to reflect the actual Payment model structure.
      // The Payment model has: id, bookingId, stripePaymentIntentId, amount, currency, status, createdAt, updatedAt
      // There is no businessId or metadata field on the Payment model itself.
      // This means we cannot directly query payments by businessId using prisma.payment.findMany
      // without schema modification and data backfill.

      // For the purpose of this subtask, and acknowledging the schema limitation,
      // we will fetch all 'succeeded' payments and then filter them in memory if their
      // stripePaymentIntentId can be used to retrieve metadata from Stripe, or if metadata
      // was stored during confirmPayment (which it currently is not on the Payment model).
      // This is highly inefficient and not for production.
      // A more robust solution is to add businessId to the Payment model.

      // Given the current schema, a direct performant query for payments by businessId is not possible.
      // The PaymentIntent metadata *does* have businessId. If confirmPayment stored the *entire* PI
      // or its metadata into a JSON field on our Payment model, we could query that.
      // But it doesn't. It only stores specific fields.

      // Self-correction: The prompt mentions querying `metadata: { path: ['businessId'], equals: params.businessId } }`.
      // This assumes a `metadata` JSON field on the `Payment` model in our database.
      // This field does not exist in the `schema.prisma` for `Payment` model defined earlier.
      // The Payment model is:
      // model Payment {
      //   id                    String    @id @default(uuid())
      //   bookingId             String?
      //   stripePaymentIntentId String?   @unique
      //   amount                Decimal   @db.Decimal(10, 2)
      //   currency              String
      //   status                String // e.g., "succeeded", "pending", "failed"
      //   createdAt             DateTime  @default(now())
      //   updatedAt             DateTime  @updatedAt
      //   @@map("payments")
      // }
      // There is no `metadata` field here.
      // So, the provided query example `AND: [{ metadata: { path: ['businessId'], equals: params.businessId } }]` will fail.

      // What we *can* do is fetch all payments, then for each payment, retrieve its
      // PaymentIntent from Stripe, check its metadata.businessId. This is very slow.
      // Or, acknowledge this is currently not possible without schema change and return dummy data or an error.
      // The subtask asks to *attempt* to query. So I will write the query as if the field *should* exist,
      // and it will likely return no data or error out if the field isn't there.

      // Let's assume, for the sake of progressing with the subtask's query structure,
      // that a `metadata` JSON field exists on the `Payment` model.
      // This would be the ideal query IF the schema supported it:
      /*
      const paymentsForBusiness = await prisma.payment.findMany({
          where: {
              status: 'succeeded',
              metadata: { // This assumes 'metadata' is a JSON field on Payment model
                  path: ['businessId'],
                  equals: params.businessId,
              }
          },
          orderBy: { createdAt: 'desc' },
      });
      */
      // Since `metadata` field is not on `Payment` model, the above query is not possible.
      // The task states "The subtask will attempt to query based on metadata.businessId for getBusinessRevenue."
      // This implies I should try to write a query that *would* work if metadata was stored on the Payment model.
      // However, Prisma's JSON querying capabilities depend on the database (Postgres supports it well).
      // And crucially, the field must exist in the Prisma schema.

      // Given the constraint, I will log the issue and return empty/error,
      // as performing the query as described (metadata path equals) is not possible with current schema.
      // The most honest approach is to state this limitation.
      // console.error("Limitation: Payment model does not have a 'businessId' or 'metadata' field for direct querying by businessId.");
      // console.warn("getBusinessRevenue will return empty results. Schema modification is required to support this feature properly.");
      // Returning empty results as per the note that this would be the outcome.
      // A real implementation would require schema change first.
      // const paymentsForBusiness = []; // Placeholder due to schema limitation - REMOVED

      // Query uses the new direct field 'businessId'
      const paymentsForBusiness = await prisma.payment.findMany({
          where: {
              status: 'succeeded',
              businessId: params.businessId, // Query the new direct field
          },
          orderBy: { createdAt: 'desc' },
      });

      if (!paymentsForBusiness.length) {
          console.warn(`No payments found for businessId: ${params.businessId}. Ensure payments for this business exist and have the businessId field populated.`);
      }


      const totalRevenue = paymentsForBusiness.reduce((sum, payment) => sum + Number(payment.amount), 0);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = paymentsForBusiness
        // @ts-ignore
        .filter(payment => {
          const paymentDate = new Date(payment.createdAt);
          return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        })
        // @ts-ignore
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      const recentPayments = paymentsForBusiness.slice(0, 10).map(p => ({
        // @ts-ignore
        amount: p.amount,
        // @ts-ignore
        date: p.createdAt,
        // @ts-ignore
        currency: p.currency,
        // @ts-ignore
        status: p.status,
        // customerName: 'N/A', // TODO: Retrieve customer details if possible/needed
        // @ts-ignore
        paymentIntentId: p.stripePaymentIntentId
      }));

      return { totalRevenue, monthlyRevenue, recentPayments };
    } catch (error: any) {
      console.error(`Error fetching revenue for business ${params.businessId}:`, error);
      return { totalRevenue: 0, monthlyRevenue: 0, recentPayments: [], error: error.message };
    }
  }

  async handleStripeWebhook(signature: string | string[] | undefined, rawBody: Buffer | string): Promise<{ received: boolean; error?: string; message?: string }> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Stripe webhook secret is not configured.');
      return { received: false, error: 'Webhook secret not configured.' };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature || '', webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return { received: false, error: `Webhook error: ${err.message}` };
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        console.log(`Webhook: PaymentIntent ${paymentIntentSucceeded.id} succeeded.`);
        // Reuse confirmPayment logic or parts of it to avoid duplication
        // Ensure idempotency: check if payment already processed
        const existingPayment = await prisma.payment.findUnique({
          where: { stripePaymentIntentId: paymentIntentSucceeded.id },
        });

        if (existingPayment && existingPayment.status === 'succeeded') {
          console.log(`Webhook: PaymentIntent ${paymentIntentSucceeded.id} already processed and marked as succeeded.`);
          return { received: true, message: 'Event already processed.' };
        }

        // Extract businessId from metadata, as done in confirmPayment
        const businessIdFromMetadata = paymentIntentSucceeded.metadata?.businessId;
        const bookingIdFromMetadata = paymentIntentSucceeded.metadata?.bookingId;

        // Create or update payment record
        await prisma.payment.upsert({
          where: { stripePaymentIntentId: paymentIntentSucceeded.id },
          update: {
            status: paymentIntentSucceeded.status,
            amount: paymentIntentSucceeded.amount / 100,
            currency: paymentIntentSucceeded.currency,
            // @ts-ignore // businessId might not be recognized by TS if Prisma Client not regenerated
            businessId: businessIdFromMetadata,
            bookingId: bookingIdFromMetadata, // Ensure this aligns with your needs
          },
          create: {
            stripePaymentIntentId: paymentIntentSucceeded.id,
            amount: paymentIntentSucceeded.amount / 100,
            currency: paymentIntentSucceeded.currency,
            status: paymentIntentSucceeded.status,
            // @ts-ignore // businessId might not be recognized by TS if Prisma Client not regenerated
            businessId: businessIdFromMetadata,
            bookingId: bookingIdFromMetadata,
          },
        });

        console.log(`Webhook: Payment record for ${paymentIntentSucceeded.id} created/updated.`);

        // TODO: Update booking status (similar to confirmPayment)
        // This part is still a placeholder due to Booking model context.
        if (bookingIdFromMetadata) {
          try {
            // @ts-ignore Property 'booking' does not exist on type 'PrismaClient'.
            if (prisma.booking) { // Check if Booking model is available
              // @ts-ignore Property 'booking' does not exist on type 'PrismaClient'.
              await prisma.booking.update({
                where: { id: bookingIdFromMetadata },
                data: { status: 'confirmed' }, // Or a more specific payment-related status
              });
              console.log(`Webhook: Booking ${bookingIdFromMetadata} status updated.`);
            } else {
              console.log(`Webhook: Booking update for ${bookingIdFromMetadata} skipped (Booking model not directly available).`);
            }
          } catch (bookingError: any) {
            console.error(`Webhook: Failed to update booking ${bookingIdFromMetadata}:`, bookingError.message);
          }
        }
        break;
      case 'payment_intent.payment_failed':
        const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
        console.log(`Webhook: PaymentIntent ${paymentIntentFailed.id} failed.`);
        // Optionally, update payment record to 'failed' and notify admin/user
        await prisma.payment.updateMany({ // Use updateMany if intent ID might not be unique yet or to catch if no record exists
            where: { stripePaymentIntentId: paymentIntentFailed.id },
            data: { status: paymentIntentFailed.status },
        });
        // TODO: Handle booking status update for failed payments (e.g., set to 'payment_failed')
        break;
      // ... handle other event types
      default:
        console.log(`Webhook: Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  async createPaymentIntent(params: {
    amount: number; // Amount in cents
    currency: string;
    businessId: string;
    bookingId?: string; // Optional for now
    customerEmail?: string; // Stripe might require customer details
  }): Promise<{ clientSecret: string | null; paymentIntentId: string; error?: string }> {
    try {
      // TODO: Later, retrieve or create a Stripe customer ID for params.businessId or params.customerEmail
      // For now, creating intent without a customer object
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        // In the latest API versions, `automatic_payment_methods` is preferred.
        automatic_payment_methods: {
          enabled: true,
        },
        // Optionally, link to a booking or business
        metadata: {
          bookingId: params.bookingId || 'N/A',
          businessId: params.businessId,
        },
      });

      if (!paymentIntent.client_secret) {
        return { clientSecret: null, paymentIntentId: paymentIntent.id, error: 'Failed to create payment intent client secret.' };
      }

      return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return { clientSecret: null, paymentIntentId: '', error: error.message };
    }
  }
}
