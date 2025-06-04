import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from '../services/PaymentService';
// BusinessServiceConfig is no longer needed here as PaymentService doesn't require it in constructor
// import { BusinessServiceConfig } from '../config/config';

// Instantiate PaymentService directly.
// The config is imported and used within PaymentService.ts for Stripe initialization.
const paymentService = new PaymentService();

export const createPaymentIntentHandler = async (
  request: FastifyRequest<{ Body: { amount: number; currency: string; businessId: string; bookingId?: string; customerEmail?: string } }>,
  reply: FastifyReply
) => {
  try {
    // paymentService is now initialized globally in this file.
    // No need to check and re-initialize in each request.
    const { amount, currency, businessId, bookingId, customerEmail } = request.body;

    if (!amount || !currency || !businessId) {
      return reply.status(400).send({ error: 'Missing required fields: amount, currency, businessId' });
    }

    // Basic validation for amount (must be positive integer)
    if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        return reply.status(400).send({ error: 'Invalid amount: must be a positive integer representing cents.' });
    }


    const result = await paymentService.createPaymentIntent({ amount, currency, businessId, bookingId, customerEmail });

    if (result.error || !result.clientSecret) {
      return reply.status(500).send({ error: result.error || 'Could not create payment intent.' });
    }

    return reply.status(200).send({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  } catch (error: any) {
    console.error('Payment intent creation failed:', error);
    return reply.status(500).send({ error: 'Internal server error while creating payment intent.' });
  }
};

export const confirmPaymentHandler = async (
  request: FastifyRequest<{ Body: { paymentIntentId: string; bookingId?: string } }>,
  reply: FastifyReply
) => {
  try {
    // Ensure paymentService is initialized (if not done globally)
    if (!paymentService) {
        // This is just a fallback, ideally service is initialized once
        // const config = (await import('../config')).default; // This line causes issues with top-level await, removed.
        // paymentService = new PaymentService(); // Assuming PaymentService grabs config itself
        console.error("PaymentService not initialized at confirmPaymentHandler"); // Should not happen if initialized globally
        return reply.status(500).send({ error: 'Internal server error: Payment service not available.' });
    }

    const { paymentIntentId, bookingId } = request.body;

    if (!paymentIntentId) {
      return reply.status(400).send({ error: 'Missing required field: paymentIntentId' });
    }

    const result = await paymentService.confirmPayment({ paymentIntentId, bookingId });

    if (!result.success || !result.paymentRecord) {
      return reply.status(400).send({ error: result.error || 'Could not confirm payment.' });
    }

    return reply.status(200).send({
      status: 'success',
      paymentRecord: result.paymentRecord,
      bookingUpdated: result.bookingUpdated,
    });
  } catch (error: any) {
    console.error('Payment confirmation failed:', error);
    return reply.status(500).send({ error: 'Internal server error during payment confirmation.' });
  }
};

export const getBusinessRevenueHandler = async (
  request: FastifyRequest<{ Params: { businessId: string } }>,
  reply: FastifyReply
) => {
  try {
    // Ensure paymentService is initialized
    if (!paymentService) {
        // const config = (await import('../config')).default; // Fallback, already commented out
        // paymentService = new PaymentService();
        console.error("PaymentService not initialized at getBusinessRevenueHandler"); // Should not happen
        return reply.status(500).send({ error: 'Internal server error: Payment service not available.' });
    }

    const { businessId } = request.params;

    if (!businessId) {
      return reply.status(400).send({ error: 'Missing required parameter: businessId' });
    }

    const result = await paymentService.getBusinessRevenue({ businessId });

    if (result.error) {
      // Distinguish between "not found" (which might be valid, e.g., no payments yet) vs. actual error
      // For now, any error from service is treated as 500, but could be refined.
      // Given the current implementation of getBusinessRevenue, an error means a processing error,
      // not "no revenue found". "No revenue" would be totalRevenue: 0.
      return reply.status(500).send({ error: result.error });
    }

    return reply.status(200).send({
      totalRevenue: result.totalRevenue,
      monthlyRevenue: result.monthlyRevenue,
      recentPayments: result.recentPayments,
    });
  } catch (error: any) {
    // @ts-ignore
    console.error(`Revenue retrieval failed for business ${request.params.businessId}:`, error);
    return reply.status(500).send({ error: 'Internal server error while fetching revenue.' });
  }
};

export const stripeWebhookHandler = async (
  request: FastifyRequest, // Raw request needed
  reply: FastifyReply
) => {
  // Ensure paymentService is initialized
  if (!paymentService) {
      // Fallback initialization - this path should ideally not be hit if service is always initialized globally
      // const config = (await import('../config')).default; // Avoid top-level await if possible, or ensure it's handled
      console.error("Stripe Webhook: PaymentService not initialized.");
      paymentService = new PaymentService(); // Assuming PaymentService can initialize itself or Stripe key is in env
  }

  const signature = request.headers['stripe-signature'];
  // Body is accessed via request.rawBody with Fastify when addContentTypeParser used,
  // or if body parsing is disabled for this route.
  // The subtask runner will need to ensure rawBody is available.

  // @ts-ignore Property 'rawBody' does not exist on type 'FastifyRequest'. Fastify needs specific setup for this.
  if (!request.rawBody) {
    console.error('Stripe Webhook: Raw body is not available. Ensure Fastify is configured correctly for this route.');
    return reply.status(400).send('Raw body needed for webhook verification.');
  }

  // @ts-ignore Property 'rawBody' does not exist on type 'FastifyRequest'.
  const result = await paymentService.handleStripeWebhook(signature, request.rawBody);

  if (!result.received && result.error) {
    return reply.status(400).send(`Webhook Error: ${result.error}`);
  }

  // Stripe expects a 200 OK for successful webhook delivery
  return reply.status(200).send({ received: true, message: result.message });
};
