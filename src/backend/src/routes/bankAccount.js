import express from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper to check if Stripe is configured
function isStripeEnabled() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLIC_KEY);
}

// Helper to get Stripe client
function getStripeClient() {
  if (!isStripeEnabled()) {
    throw new Error('Stripe is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// POST /api/bank-account/create-or-update - Create or update Stripe Connect account
router.post('/create-or-update', authenticate, async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      dob_day,
      dob_month,
      dob_year,
      iban,
      id_number,
      address_line1,
      address_city,
      address_postal_code,
      phone
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !dob_day || !dob_month || !dob_year || !iban || !id_number) {
      return res.status(400).json({ 
        detail: 'Missing required fields: first_name, last_name, dob (day/month/year), iban, id_number' 
      });
    }

    if (!isStripeEnabled()) {
      return res.status(503).json({ detail: 'Stripe is not configured' });
    }

    const stripe = getStripeClient();

    let accountId = req.user.stripe_account_id;

    // Create or update Stripe Connect account
    if (!accountId) {
      // Create new Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: req.user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name,
          last_name,
          dob: {
            day: dob_day,
            month: dob_month,
            year: dob_year,
          },
          email: req.user.email,
          ...(phone || req.user.phone_number ? { phone: phone || req.user.phone_number } : {}),
          address: {
            line1: address_line1,
            city: address_city,
            postal_code: address_postal_code,
            country: 'ES',
          },
          id_number,
        },
      });

      accountId = account.id;
      await req.user.update({ stripe_account_id: accountId });
      logger.info(`🏦 Created Stripe Connect account ${accountId} for user ${req.user.id}`);
    }

    // Create or update external bank account (IBAN)
    try {
      // First, get existing external accounts
      const existingAccounts = await stripe.accounts.listExternalAccounts(accountId, {
        object: 'bank_account',
      });

      // Delete old bank accounts if any
      for (const account of existingAccounts.data) {
        await stripe.accounts.deleteExternalAccount(accountId, account.id);
      }

      // Add new bank account
      const bankAccount = await stripe.accounts.createExternalAccount(accountId, {
        external_account: {
          object: 'bank_account',
          country: 'ES',
          currency: 'eur',
          account_number: iban,
        },
      });

      // Save bank account info to user
      await req.user.update({
        bank_account_last4: bankAccount.last4,
        bank_account_country: bankAccount.country,
        bank_name: bankAccount.bank_name || 'Bank',
      });

      logger.info(`💳 Added bank account (${bankAccount.last4}) to Connect account ${accountId}`);

      res.json({
        success: true,
        account_id: accountId,
        bank_account: {
          last4: bankAccount.last4,
          bank_name: bankAccount.bank_name,
          country: bankAccount.country,
        },
      });
    } catch (bankError) {
      logger.error('Failed to add bank account:', bankError);
      throw new Error('Invalid IBAN or bank account details');
    }
  } catch (error) {
    logger.error('Failed to create/update bank account:', error);
    next(error);
  }
});

// GET /api/bank-account/info - Get bank account info
router.get('/info', authenticate, async (req, res, next) => {
  try {
    if (!isStripeEnabled()) {
      return res.json({
        has_bank_account: false,
      });
    }

    const hasAccount = !!(
      req.user.stripe_account_id && 
      req.user.bank_account_last4
    );

    res.json({
      has_bank_account: hasAccount,
      last4: req.user.bank_account_last4,
      bank_name: req.user.bank_name,
      country: req.user.bank_account_country,
      stripe_account_id: req.user.stripe_account_id,
    });
  } catch (error) {
    logger.error('Failed to get bank account info:', error);
    next(error);
  }
});

// DELETE /api/bank-account - Delete bank account
router.delete('/', authenticate, async (req, res, next) => {
  try {
    if (!isStripeEnabled()) {
      return res.status(503).json({ detail: 'Stripe is not configured' });
    }

    if (!req.user.stripe_account_id) {
      return res.status(404).json({ detail: 'No bank account found' });
    }

    const stripe = getStripeClient();

    // Delete all external accounts
    const existingAccounts = await stripe.accounts.listExternalAccounts(
      req.user.stripe_account_id,
      { object: 'bank_account' }
    );

    for (const account of existingAccounts.data) {
      await stripe.accounts.deleteExternalAccount(
        req.user.stripe_account_id,
        account.id
      );
    }

    // Clear bank account info from user
    await req.user.update({
      bank_account_last4: null,
      bank_account_country: null,
      bank_name: null,
    });

    logger.info(`🗑️ Deleted bank account for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Bank account deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete bank account:', error);
    next(error);
  }
});

export default router;
