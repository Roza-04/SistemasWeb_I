import Stripe from 'stripe';
import logger from './logger.js';

let stripeClient = null;

export const getStripeClient = () => {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
    logger.info('✅ Stripe client initialized');
  }
  return stripeClient;
};

export const isStripeEnabled = () => {
  return !!process.env.STRIPE_SECRET_KEY;
};

export const getAppCommissionPercent = () => {
  return parseFloat(process.env.APP_COMMISSION_PERCENT || '15');
};

export const calculateCommission = (amount) => {
  const commissionPercent = getAppCommissionPercent();
  const commissionAmount = (amount * commissionPercent) / 100;
  const driverAmount = amount - commissionAmount;
  
  return {
    totalAmount: amount,
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    driverAmount: Math.round(driverAmount * 100) / 100,
    commissionPercent
  };
};

export const createPaymentIntent = async (amount, paymentMethodId, customerId, metadata = {}, currency = 'eur', destinationAccountId = null) => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntentData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true, // Auto-confirm for immediate authorization
      capture_method: 'manual', // Manual capture for authorization
      metadata
    };

    // If destination account is provided, add transfer_data to send funds to driver
    if (destinationAccountId) {
      const commission = calculateCommission(amount);
      const applicationFeeAmount = Math.round(commission.commissionAmount * 100);
      
      paymentIntentData.transfer_data = {
        destination: destinationAccountId
      };
      paymentIntentData.application_fee_amount = applicationFeeAmount;
      
      logger.info(`PaymentIntent will transfer €${commission.driverAmount} to ${destinationAccountId} (fee: €${commission.commissionAmount})`);
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    logger.info(`Created PaymentIntent: ${paymentIntent.id} for amount ${amount}`);
    return paymentIntent;
  } catch (error) {
    logger.error('Error creating PaymentIntent:', error);
    throw error;
  }
};

export const confirmPaymentIntent = async (paymentIntentId) => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    logger.info(`Confirmed PaymentIntent: ${paymentIntentId}`);
    return paymentIntent;
  } catch (error) {
    logger.error(`Error confirming PaymentIntent ${paymentIntentId}:`, error);
    throw error;
  }
};

export const capturePaymentIntent = async (paymentIntentId, amountToCapture = null) => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const options = {};
    if (amountToCapture !== null) {
      options.amount_to_capture = Math.round(amountToCapture * 100);
    }

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, options);
    logger.info(`Captured PaymentIntent: ${paymentIntentId}`);
    return paymentIntent;
  } catch (error) {
    logger.error(`Error capturing PaymentIntent ${paymentIntentId}:`, error);
    throw error;
  }
};

export const cancelPaymentIntent = async (paymentIntentId) => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    logger.info(`Cancelled PaymentIntent: ${paymentIntentId}`);
    return paymentIntent;
  } catch (error) {
    logger.error(`Error cancelling PaymentIntent ${paymentIntentId}:`, error);
    throw error;
  }
};

export const createRefund = async (paymentIntentId, amount = null) => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const options = { payment_intent: paymentIntentId };
    if (amount !== null) {
      options.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(options);
    logger.info(`Created refund: ${refund.id} for PaymentIntent: ${paymentIntentId}`);
    return refund;
  } catch (error) {
    logger.error(`Error creating refund for PaymentIntent ${paymentIntentId}:`, error);
    throw error;
  }
};

/**
 * Calculate cancellation penalty based on time until ride departure
 * @param {Date} departureTime - Ride departure time
 * @param {Date} cancellationTime - Cancellation time
 * @returns {number} - Penalty percentage (0.0 to 1.0)
 */
export const calculateCancellationPenalty = (departureTime, cancellationTime) => {
  const hoursUntilDeparture = (new Date(departureTime) - new Date(cancellationTime)) / (1000 * 60 * 60);
  
  if (hoursUntilDeparture >= 24) {
    return 0;        // 0% penalty (100% refund) if cancelled 24h or more before
  } else {
    return 0.30;     // 30% penalty (70% refund) if cancelled less than 24h before
  }
};

/**
 * Create a transfer to a Stripe Connect account
 * @param {number} amount - Amount in euros
 * @param {string} destinationAccountId - Stripe Connect account ID
 * @param {object} metadata - Additional metadata
 * @returns {Promise} - Transfer object
 */
export const createTransfer = async (amount, destinationAccountId, metadata = {}) => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur',
      destination: destinationAccountId,
      metadata: metadata
    });
    
    logger.info(`✅ Transfer created: ${transfer.id} for €${amount} to ${destinationAccountId}`);
    return transfer;
  } catch (error) {
    logger.error(`Error creating transfer to ${destinationAccountId}:`, error);
    throw error;
  }
};

/**
 * Create a payout (transfer to bank account)
 * @param {number} amount - Amount in euros
 * @param {string} stripeAccountId - Stripe Connect account ID
 * @returns {Promise} - Payout object
 */
export const createPayout = async (amount, stripeAccountId) => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'eur'
      },
      {
        stripeAccount: stripeAccountId
      }
    );
    
    logger.info(`💸 Payout created: ${payout.id} for €${amount} to account ${stripeAccountId}`);
    return payout;
  } catch (error) {
    logger.error(`Error creating payout for account ${stripeAccountId}:`, error);
    throw error;
  }
};

export default {
  getStripeClient,
  isStripeEnabled,
  getAppCommissionPercent,
  calculateCommission,
  createPaymentIntent,
  confirmPaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
  createRefund,
  calculateCancellationPenalty,
  createTransfer,
  createPayout
};
