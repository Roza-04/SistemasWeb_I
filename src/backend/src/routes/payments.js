import express from 'express';
import Stripe from 'stripe';
import { User, Payment } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { getStripeClient, isStripeEnabled } from '../utils/stripe.js';
import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();

// POST /api/payments/create-setup-intent - Create SetupIntent to save card
router.post('/create-setup-intent', authenticate, async (req, res, next) => {
  try {
    if (!isStripeEnabled()) {
      return res.status(503).json({ detail: 'Stripe is not configured' });
    }

    const stripe = getStripeClient();

    // Create or get Stripe customer
    let customerId = req.user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          user_id: req.user.id.toString()
        }
      });
      customerId = customer.id;

      // Save customer ID to user
      await req.user.update({ stripe_customer_id: customerId });
      logger.info(`💳 Created Stripe customer ${customerId} for user ${req.user.id}`);
    }

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        user_id: req.user.id.toString()
      }
    });

    logger.info(`🔐 Created SetupIntent ${setupIntent.id} for user ${req.user.id}`);

    res.json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id
    });
  } catch (error) {
    logger.error('Failed to create SetupIntent:', error);
    next(error);
  }
});

// POST /api/payments/confirm-setup-intent - Confirm SetupIntent and save payment method
router.post('/confirm-setup-intent', authenticate, async (req, res, next) => {
  try {
    const { setup_intent_id } = req.body;

    if (!setup_intent_id) {
      return res.status(400).json({ detail: 'setup_intent_id is required' });
    }

    if (!isStripeEnabled()) {
      return res.status(503).json({ detail: 'Stripe is not configured' });
    }

    const stripe = getStripeClient();

    // Retrieve SetupIntent
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);

    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        detail: `SetupIntent status is ${setupIntent.status}. Expected 'succeeded'.` 
      });
    }

    const paymentMethodId = setupIntent.payment_method;
    const customerId = req.user.stripe_customer_id;

    // Explicitly attach payment method to customer (in case it's not attached)
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      logger.info(`✅ Attached payment method ${paymentMethodId} to customer ${customerId}`);
    } catch (attachError) {
      // If already attached, Stripe will throw an error - that's OK
      if (attachError.code !== 'resource_already_attached') {
        throw attachError;
      }
      logger.info(`ℹ️ Payment method ${paymentMethodId} already attached to customer`);
    }

    // Save payment method ID to user
    await req.user.update({ stripe_payment_method_id: paymentMethodId });

    logger.info(`💳 Saved payment method ${paymentMethodId} for user ${req.user.id}`);

    res.json({
      success: true,
      payment_method_id: paymentMethodId,
      message: 'Payment method saved successfully'
    });
  } catch (error) {
    logger.error('Failed to confirm SetupIntent:', error);
    next(error);
  }
});

// POST /api/payments/webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        logger.info(`✅ PaymentIntent succeeded: ${paymentIntent.id}`);
        
        // Update payment status in database
        const [payment] = await sequelize.query(
          `SELECT * FROM payments WHERE stripe_payment_id = :stripe_payment_id LIMIT 1`,
          {
            replacements: { stripe_payment_id: paymentIntent.id },
            type: QueryTypes.SELECT
          }
        );
        
        if (payment) {
          await sequelize.query(
            `UPDATE payments SET status = 'PENDING', updated_at = NOW() WHERE id = :id`,
            {
              replacements: { id: payment.id },
              type: QueryTypes.UPDATE
            }
          );
          logger.info(`💰 Payment ${payment.id} marked as captured`);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        logger.error(`❌ PaymentIntent failed: ${failedIntent.id}`);
        
        const [failedPayment] = await sequelize.query(
          `SELECT * FROM payments WHERE stripe_payment_id = :stripe_payment_id LIMIT 1`,
          {
            replacements: { stripe_payment_id: failedIntent.id },
            type: QueryTypes.SELECT
          }
        );
        
        if (failedPayment) {
          await sequelize.query(
            `UPDATE payments SET status = 'PENDING', updated_at = NOW() WHERE id = :id`,
            {
              replacements: { id: failedPayment.id },
              type: QueryTypes.UPDATE
            }
          );
          logger.info(`💔 Payment ${failedPayment.id} marked as failed`);
        }
        break;

      case 'payment_intent.canceled':
        const canceledIntent = event.data.object;
        logger.info(`🚫 PaymentIntent canceled: ${canceledIntent.id}`);
        
        const [canceledPayment] = await sequelize.query(
          `SELECT * FROM payments WHERE stripe_payment_id = :stripe_payment_id LIMIT 1`,
          {
            replacements: { stripe_payment_id: canceledIntent.id },
            type: QueryTypes.SELECT
          }
        );
        
        if (canceledPayment) {
          await sequelize.query(
            `UPDATE payments SET status = 'PENDING', updated_at = NOW() WHERE id = :id`,
            {
              replacements: { id: canceledPayment.id },
              type: QueryTypes.UPDATE
            }
          );
          logger.info(`🚫 Payment ${canceledPayment.id} marked as cancelled`);
        }
        break;

      case 'setup_intent.succeeded':
        const setupIntent = event.data.object;
        logger.info(`✅ SetupIntent succeeded: ${setupIntent.id}`);
        break;

      case 'setup_intent.setup_failed':
        const failedSetup = event.data.object;
        logger.error(`❌ SetupIntent failed: ${failedSetup.id}`);
        break;

      default:
        logger.info(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// GET /api/payments/methods - Get user's saved payment methods
router.get('/methods', authenticate, async (req, res, next) => {
  try {
    if (!isStripeEnabled()) {
      return res.status(503).json({ detail: 'Stripe is not configured' });
    }

    const stripe = getStripeClient();

    // Check if user has a Stripe customer ID
    if (!req.user.stripe_customer_id) {
      logger.info(`ℹ️ User ${req.user.id} has no Stripe customer ID yet`);
      return res.json({
        success: true,
        payment_methods: []
      });
    }

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: req.user.stripe_customer_id,
      type: 'card',
    });

    logger.info(`💳 Retrieved ${paymentMethods.data.length} payment methods for user ${req.user.id}`);

    // Format payment methods for frontend
    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: 'card',
      card: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      },
      is_default: pm.id === req.user.stripe_payment_method_id,
      created: pm.created
    }));

    res.json({
      success: true,
      payment_methods: formattedMethods
    });
  } catch (error) {
    logger.error('Failed to retrieve payment methods:', error);
    next(error);
  }
});

// DELETE /api/payments/methods/:id - Delete a payment method
router.delete('/methods/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isStripeEnabled()) {
      return res.status(503).json({ detail: 'Stripe is not configured' });
    }

    const stripe = getStripeClient();

    // Detach payment method from customer
    await stripe.paymentMethods.detach(id);

    // If this was the default payment method, clear it from user
    if (req.user.stripe_payment_method_id === id) {
      await req.user.update({ stripe_payment_method_id: null });
    }

    logger.info(`🗑️ Deleted payment method ${id} for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete payment method:', error);
    next(error);
  }
});

// GET /api/payments/test-endpoint - Test if Stripe is configured
router.get('/test-endpoint', async (req, res) => {
  const configured = isStripeEnabled();
  
  res.json({
    stripe_configured: configured,
    has_secret_key: !!process.env.STRIPE_SECRET_KEY,
    has_public_key: !!process.env.STRIPE_PUBLIC_KEY,
    has_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    message: configured 
      ? 'Stripe is properly configured' 
      : 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env'
  });
});

export default router;
