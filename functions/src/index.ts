/**
 * Firebase Cloud Functions for Transport SaaS
 * Handles Paystack integration and WhatsApp AI assistant
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// WhatsApp Integration
export { whatsappWebhook } from './whatsapp/webhook';

// Driver Authentication
export { createDriverAuth } from './createDriverAuth';

// Paystack Configuration
// Using defineSecret for secure environment variables (Firebase Functions v2 style)
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ||
                            functions.config().paystack?.secret ||
                            '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Create a dedicated virtual account (NUBAN) for a driver
 * Called when a new driver is created or when they first access wallet
 */
export const createDriverVirtualAccount = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { driverId } = data;

    if (!driverId) {
      throw new functions.https.HttpsError('invalid-argument', 'Driver ID is required');
    }

    // Get driver from Firestore
    const driverDoc = await db.collection('drivers').doc(driverId).get();

    if (!driverDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Driver not found');
    }

    const driver = driverDoc.data();

    if (!driver) {
      throw new functions.https.HttpsError('not-found', 'Driver data not found');
    }

    // Check if virtual account already exists
    if (driver.wallet?.virtualAccountNumber) {
      return {
        success: true,
        message: 'Virtual account already exists',
        data: {
          accountNumber: driver.wallet.virtualAccountNumber,
          accountName: driver.wallet.virtualAccountName,
          bankName: driver.wallet.bankName
        }
      };
    }

    // Create dedicated NUBAN on Paystack
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/dedicated_account`,
      {
        customer: driver.paystackCustomerCode || `${driver.email || `driver_${driverId}@transportco.ng`}`,
        preferred_bank: 'titan-paystack', // Titan Trust Bank - More reliable for live mode
        first_name: driver.name.split(' ')[0],
        last_name: driver.name.split(' ').slice(1).join(' ') || driver.name.split(' ')[0],
        phone: driver.phone,
        email: driver.email || `driver_${driverId}@transportco.ng`,
        country: 'NG'
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const accountData = response.data.data;

    // Check account status
    const isActive = accountData.active === true;
    const accountStatus = isActive ? 'active' : 'pending';

    // Update driver document with virtual account details
    await db.collection('drivers').doc(driverId).update({
      'wallet.virtualAccountNumber': accountData.account_number,
      'wallet.virtualAccountName': accountData.account_name,
      'wallet.bankName': accountData.bank.name,
      'wallet.bankCode': accountData.bank.code,
      'wallet.paystackAccountId': accountData.id,
      'wallet.accountStatus': accountStatus,
      'wallet.isActive': isActive,
      paystackCustomerCode: accountData.customer.customer_code,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info(`Virtual account created for driver ${driverId}`, {
      accountNumber: accountData.account_number,
      bankName: accountData.bank.name,
      status: accountStatus,
      active: isActive,
      paystackAccountId: accountData.id
    });

    return {
      success: true,
      message: isActive
        ? 'Virtual account created and activated successfully'
        : 'Virtual account created. Activation may take 5-15 minutes.',
      data: {
        accountNumber: accountData.account_number,
        accountName: accountData.account_name,
        bankName: accountData.bank.name,
        status: accountStatus,
        isActive: isActive
      }
    };
  } catch (error: any) {
    functions.logger.error('Error creating virtual account', {
      error: error.message,
      response: error.response?.data,
      driverId: data.driverId
    });

    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.message || error.message || 'Failed to create virtual account'
    );
  }
});


// ============================================================================
// OLD WEBHOOK CODE REMOVED
// ============================================================================
// The old driver-focused webhook has been removed to avoid duplicate exports.
// The new organization-focused webhook (paystackWebhook) is at line ~800 and handles:
// - Virtual account payments for organizations
// - Automatic wallet balance updates  
// - Transaction recording in Firestore
// - Transfer success/failure handling
// ============================================================================

// END OF COMMENTED OUT OLD WEBHOOK CODE

/**
 * Process driver withdrawal request
 * Initiates transfer via Paystack Transfer API
 */
export const processWithdrawal = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { transactionId } = data;

    if (!transactionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Transaction ID is required');
    }

    // Get transaction
    const transactionDoc = await db.collection('walletTransactions').doc(transactionId).get();

    if (!transactionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Transaction not found');
    }

    const transaction = transactionDoc.data();

    if (transaction?.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Transaction is not pending');
    }

    if (transaction?.type !== 'withdrawal') {
      throw new functions.https.HttpsError('invalid-argument', 'Not a withdrawal transaction');
    }

    // Get driver (to verify existence)
    const driverDoc = await db.collection('drivers').doc(transaction.driverId).get();

    if (!driverDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Driver not found');
    }

    // Verify recipient bank account
    const verifyResponse = await axios.get(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${transaction.bankAccount.accountNumber}&bank_code=${transaction.bankAccount.bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const accountName = verifyResponse.data.data.account_name;

    // Create transfer recipient
    const recipientResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      {
        type: 'nuban',
        name: accountName,
        account_number: transaction.bankAccount.accountNumber,
        bank_code: transaction.bankAccount.bankCode,
        currency: 'NGN'
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const recipientCode = recipientResponse.data.data.recipient_code;

    // Initiate transfer
    const transferResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transfer`,
      {
        source: 'balance',
        amount: transaction.amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason: transaction.description || 'Driver wallet withdrawal',
        reference: transaction.reference || `WD_${Date.now()}`
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const transferData = transferResponse.data.data;

    // Update transaction
    await db.collection('walletTransactions').doc(transactionId).update({
      status: 'processing',
      paystackTransferCode: transferData.transfer_code,
      paystackTransferId: transferData.id,
      metadata: {
        ...transaction.metadata,
        recipientCode,
        accountName
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info('Withdrawal initiated', {
      transactionId,
      driverId: transaction.driverId,
      amount: transaction.amount,
      transferCode: transferData.transfer_code
    });

    return {
      success: true,
      message: 'Withdrawal initiated successfully',
      data: {
        transferCode: transferData.transfer_code,
        status: 'processing'
      }
    };
  } catch (error: any) {
    functions.logger.error('Error processing withdrawal', {
      error: error.message,
      response: error.response?.data,
      transactionId: data.transactionId
    });

    // Update transaction as failed
    if (data.transactionId) {
      await db.collection('walletTransactions').doc(data.transactionId).update({
        status: 'failed',
        failureReason: error.response?.data?.message || error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.message || error.message || 'Failed to process withdrawal'
    );
  }
});


/**
 * Create a dedicated virtual account (NUBAN) for an organization
 * Called when organization wants to fund their wallet
 */
export const createOrganizationVirtualAccount = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { organizationId } = data;

    if (!organizationId) {
      throw new functions.https.HttpsError('invalid-argument', 'Organization ID is required');
    }

    // Get organization from Firestore
    const orgDoc = await db.collection('organizations').doc(organizationId).get();

    if (!orgDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Organization not found');
    }

    const organization = orgDoc.data();

    if (!organization) {
      throw new functions.https.HttpsError('not-found', 'Organization data not found');
    }

    // Check if virtual account already exists
    if (organization.wallet?.virtualAccountNumber) {
      return {
        success: true,
        message: 'Virtual account already exists',
        data: {
          accountNumber: organization.wallet.virtualAccountNumber,
          accountName: organization.wallet.virtualAccountName,
          bankName: organization.wallet.bankName
        }
      };
    }

    // Get owner's email from users collection
    let orgEmail = organization.subscription?.billingEmail;
    let orgPhone = organization.companyDetails?.phone || '08000000000';

    if (!orgEmail && organization.ownerId) {
      try {
        // Fetch owner's user document to get email
        const ownerDoc = await db.collection('users').doc(organization.ownerId).get();
        if (ownerDoc.exists) {
          const owner = ownerDoc.data();
          orgEmail = owner?.email;
          if (!orgPhone || orgPhone === '08000000000') {
            orgPhone = owner?.phone || '08000000000';
          }
        }
      } catch (error) {
        functions.logger.warn('Could not fetch owner email', { ownerId: organization.ownerId });
      }
    }

    // Final fallback - use organization ID to create a unique email
    if (!orgEmail) {
      orgEmail = `org_${organizationId}@glyde.transport`;
    }

    const companyName = organization.name || 'Organization';

    functions.logger.info('Preparing to create virtual account', {
      organizationId,
      email: orgEmail,
      phone: orgPhone,
      companyName
    });

    // Step 1: Create or get Paystack customer if not exists
    let customerCode = organization.paystackCustomerCode;

    if (!customerCode) {
      functions.logger.info('Creating Paystack customer for organization', { organizationId, email: orgEmail });

      const customerResponse = await axios.post(
        `${PAYSTACK_BASE_URL}/customer`,
        {
          email: orgEmail,
          first_name: companyName.split(' ')[0],
          last_name: companyName.split(' ').slice(1).join(' ') || 'Account',
          phone: orgPhone
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      customerCode = customerResponse.data.data.customer_code;

      // Save customer code to organization
      await db.collection('organizations').doc(organizationId).update({
        paystackCustomerCode: customerCode,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      functions.logger.info('Paystack customer created', { organizationId, customerCode });
    }

    // Step 2: Create dedicated NUBAN for the customer
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/dedicated_account`,
      {
        customer: customerCode,
        preferred_bank: 'titan-paystack'  // Titan Trust Bank - More reliable for live mode
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const accountData = response.data.data;

    // Check account status
    const isActive = accountData.active === true;
    const accountStatus = isActive ? 'active' : 'pending';

    // Update organization document with virtual account details
    const walletUpdate: any = {
      'wallet.virtualAccountNumber': accountData.account_number || '',
      'wallet.virtualAccountName': accountData.account_name || '',
      'wallet.bankName': accountData.bank?.name || 'Titan Trust Bank',
      'wallet.paystackAccountId': accountData.id || '',
      'wallet.accountStatus': accountStatus,
      'wallet.isActive': isActive,
      paystackCustomerCode: accountData.customer?.customer_code || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Only add bankCode if it exists
    if (accountData.bank?.code) {
      walletUpdate['wallet.bankCode'] = accountData.bank.code;
    }

    await db.collection('organizations').doc(organizationId).update(walletUpdate);

    functions.logger.info(`Virtual account created for organization ${organizationId}`, {
      accountNumber: accountData.account_number,
      bankName: accountData.bank?.name,
      status: accountStatus,
      active: isActive,
      paystackAccountId: accountData.id
    });

    return {
      success: true,
      message: isActive
        ? 'Virtual account created and activated successfully'
        : 'Virtual account created. Activation may take 5-15 minutes.',
      data: {
        accountNumber: accountData.account_number,
        accountName: accountData.account_name,
        bankName: accountData.bank?.name,
        status: accountStatus,
        isActive: isActive
      }
    };
  } catch (error: any) {
    functions.logger.error('Error creating organization virtual account', {
      error: error.message,
      response: error.response?.data,
      organizationId: data.organizationId
    });

    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.message || error.message || 'Failed to create virtual account'
    );
  }
});

/**
 * Check and update virtual account status
 * Call this to refresh account status if it shows as pending
 */
export const checkVirtualAccountStatus = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { accountId, type } = data; // type: 'driver' | 'organization'

    if (!accountId || !type) {
      throw new functions.https.HttpsError('invalid-argument', 'Account ID and type are required');
    }

    // Get Paystack account ID from Firestore
    const collection = type === 'driver' ? 'drivers' : 'organizations';
    const docSnap = await db.collection(collection).doc(accountId).get();

    if (!docSnap.exists) {
      throw new functions.https.HttpsError('not-found', `${type} not found`);
    }

    const docData = docSnap.data();
    const paystackAccountId = docData?.wallet?.paystackAccountId;

    if (!paystackAccountId) {
      throw new functions.https.HttpsError('not-found', 'Virtual account not found');
    }

    // Fetch account status from Paystack
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/dedicated_account/${paystackAccountId}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const accountData = response.data.data;
    const isActive = accountData.active === true;
    const accountStatus = isActive ? 'active' : 'pending';

    // Update Firestore with latest status
    await db.collection(collection).doc(accountId).update({
      'wallet.accountStatus': accountStatus,
      'wallet.isActive': isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info(`Virtual account status checked for ${type} ${accountId}`, {
      accountNumber: accountData.account_number,
      status: accountStatus,
      active: isActive
    });

    return {
      success: true,
      data: {
        accountNumber: accountData.account_number,
        accountName: accountData.account_name,
        bankName: accountData.bank?.name,
        status: accountStatus,
        isActive: isActive
      }
    };
  } catch (error: any) {
    functions.logger.error('Error checking virtual account status', {
      error: error.message,
      response: error.response?.data
    });
    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.message || error.message || 'Failed to check account status'
    );
  }
});

/**
 * Verify and activate subscription payment
 * This should be called from webhook OR after client-side payment success
 */
export const verifySubscriptionPayment = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { reference, organizationId } = data;

    if (!reference || !organizationId) {
      throw new functions.https.HttpsError('invalid-argument', 'Reference and Organization ID are required');
    }

    functions.logger.info('Verifying subscription payment', { reference, organizationId });

    // Step 1: Verify payment with Paystack
    const verifyResponse = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        }
      }
    );

    const paymentData = verifyResponse.data.data;

    functions.logger.info('Paystack verification response', {
      status: paymentData.status,
      amount: paymentData.amount,
      reference: paymentData.reference
    });

    // Step 2: Check if payment was successful
    if (paymentData.status !== 'success') {
      throw new functions.https.HttpsError('failed-precondition', 'Payment was not successful');
    }

    // Step 3: Extract metadata
    const { plan, planName } = paymentData.metadata || {};

    if (!plan) {
      throw new functions.https.HttpsError('invalid-argument', 'Plan information not found in payment metadata');
    }

    // Step 4: Update organization subscription
    await db.collection('organizations').doc(organizationId).update({
      'subscription.plan': plan,
      'subscription.status': 'active',
      'subscription.startDate': new Date().toISOString(),
      'subscription.paystackReference': reference,
      'subscription.lastPaymentDate': paymentData.paid_at,
      'subscription.amount': paymentData.amount / 100, // Convert from kobo to naira
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Step 5: Create payment record for audit trail
    await db.collection('subscriptionPayments').add({
      organizationId,
      plan,
      planName,
      amount: paymentData.amount / 100,
      currency: paymentData.currency,
      status: 'success',
      paystackReference: reference,
      paystackTransactionId: paymentData.id,
      channel: paymentData.channel,
      paidAt: paymentData.paid_at,
      metadata: paymentData.metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info('Subscription activated successfully', {
      organizationId,
      plan,
      reference
    });

    return {
      success: true,
      message: 'Subscription activated successfully',
      data: {
        plan,
        status: 'active',
        amount: paymentData.amount / 100
      }
    };
  } catch (error: any) {
    functions.logger.error('Error verifying subscription payment', {
      error: error.message,
      response: error.response?.data,
      reference: data.reference
    });

    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.message || error.message || 'Failed to verify payment'
    );
  }
});

/**
 * Resolve Bank Account Name
 * Verifies account number and returns account holder name via Paystack
 */
export const resolveBankAccount = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { accountNumber, bankCode } = data;

    // Validate inputs
    if (!accountNumber || !bankCode) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Account number and bank code are required'
      );
    }

    if (accountNumber.length !== 10) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Account number must be 10 digits'
      );
    }

    functions.logger.info('Resolving bank account', { accountNumber, bankCode });

    // Call Paystack API to resolve account
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank/resolve`,
      {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status && response.data.data) {
      const accountName = response.data.data.account_name;
      const accountNumberVerified = response.data.data.account_number;

      functions.logger.info('Account resolved successfully', {
        accountNumber: accountNumberVerified,
        accountName,
      });

      return {
        success: true,
        accountName,
        accountNumber: accountNumberVerified,
      };
    } else {
      functions.logger.warn('Account resolution failed', { response: response.data });
      throw new functions.https.HttpsError(
        'not-found',
        'Could not resolve account. Please check account number and bank.'
      );
    }
  } catch (error: any) {
    functions.logger.error('Error resolving account', {
      error: error.message,
      response: error.response?.data,
    });

    // Handle Paystack API errors
    if (error.response?.status === 422) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid account number or bank code'
      );
    }

    if (error.response?.status === 404) {
      throw new functions.https.HttpsError(
        'not-found',
        'Account not found. Please verify the account number.'
      );
    }

    // Re-throw if already a functions error
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to resolve account. Please try again.'
    );
  }
});

/**
 * Initiate Bank Transfer via Paystack
 * Transfers funds from organization wallet to external bank account
 */
export const initiateBankTransfer = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const {
      organizationId,
      amount,
      accountNumber,
      bankCode,
      accountName,
      description
    } = data;

    // Validate inputs
    if (!organizationId || !amount || !accountNumber || !bankCode || !accountName) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    if (amount < 100) {
      throw new functions.https.HttpsError('invalid-argument', 'Minimum transfer amount is ₦100');
    }

    // Get organization and verify balance
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    if (!orgDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Organization not found');
    }

    const orgData = orgDoc.data();
    const currentBalance = orgData?.walletBalance || 0;

    if (currentBalance < amount) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Insufficient balance. Available: ₦${currentBalance.toLocaleString()}`
      );
    }

    // Create transfer recipient on Paystack
    const recipientResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      {
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN'
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!recipientResponse.data.status) {
      throw new functions.https.HttpsError('internal', 'Failed to create transfer recipient');
    }

    const recipientCode = recipientResponse.data.data.recipient_code;

    // Generate unique reference
    const reference = `TXN_${organizationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Initiate transfer on Paystack
    let transferResponse;
    try {
      transferResponse = await axios.post(
        `${PAYSTACK_BASE_URL}/transfer`,
        {
          source: 'balance',
          amount: amount * 100, // Convert to kobo
          recipient: recipientCode,
          reason: description || 'Bank transfer',
          reference: reference
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      // Handle Paystack API errors
      if (error.response?.data) {
        const paystackError = error.response.data;
        const errorMessage = paystackError.message || 'Transfer failed';

        functions.logger.error('Paystack transfer error', {
          message: errorMessage,
          data: paystackError
        });

        // Handle insufficient balance error
        if (errorMessage.toLowerCase().includes('balance') ||
            errorMessage.toLowerCase().includes('insufficient') ||
            errorMessage.toLowerCase().includes('enough')) {

          throw new functions.https.HttpsError(
            'failed-precondition',
            'Your Paystack account needs to be funded. Please enable auto-settlement in Paystack Dashboard (Settings → Preferences → Settlement) or contact support to enable instant settlements for your virtual account.'
          );
        }

        throw new functions.https.HttpsError('internal', errorMessage);
      }

      throw error;
    }

    if (!transferResponse.data.status) {
      const errorMessage = transferResponse.data.message || 'Transfer failed';
      throw new functions.https.HttpsError('internal', errorMessage);
    }

    const transferData = transferResponse.data.data;
    const newBalance = currentBalance - amount;

    // Create transaction record
    const txnRef = await db.collection('walletTransactions').add({
      organizationId,
      driverId: '',
      type: 'debit',
      amount,
      currency: 'NGN',
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      status: 'pending',
      reference,
      description: description || 'Bank transfer',
      paymentMethod: 'bank_transfer',
      transferCode: transferData.transfer_code,
      recipient: {
        accountNumber,
        accountName,
        bankCode,
        bankName: data.bankName || ''
      },
      metadata: {
        source: 'bank_transfer',
        recipientCode,
        paystackTransferId: transferData.id,
      },
      initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update organization wallet balance immediately (deduct amount)
    await db.collection('organizations').doc(organizationId).update({
      walletBalance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Bank transfer initiated', {
      organizationId,
      amount,
      reference,
      transferCode: transferData.transfer_code
    });

    return {
      success: true,
      transactionId: txnRef.id,
      reference,
      transferCode: transferData.transfer_code,
      message: 'Transfer initiated successfully'
    };
  } catch (error: any) {
    functions.logger.error('Bank transfer error', {
      error: error.message,
      stack: error.stack
    });

    // Handle Paystack API errors
    if (error.response?.data?.message) {
      throw new functions.https.HttpsError('internal', error.response.data.message);
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to initiate transfer. Please try again.');
  }
});

/**
 * Check Paystack Balance
 * Returns available balances for debugging
 */
export const checkPaystackBalance = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Fetch balance from Paystack
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/balance`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.status) {
      throw new functions.https.HttpsError('internal', 'Failed to fetch Paystack balance');
    }

    const balances = response.data.data;

    functions.logger.info('Paystack balances', { balances });

    return {
      success: true,
      balances: balances.map((bal: any) => ({
        currency: bal.currency,
        balance: bal.balance / 100, // Convert from kobo to naira
        balanceFormatted: `₦${(bal.balance / 100).toLocaleString()}`
      }))
    };
  } catch (error: any) {
    functions.logger.error('Balance check error', {
      error: error.message,
      response: error.response?.data
    });

    throw new functions.https.HttpsError('internal', 'Failed to check balance');
  }
});

/**
 * Transfer to Driver Wallet
 * Internal transfer from organization wallet to driver wallet
 */
export const transferToDriver = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const {
      organizationId,
      driverId,
      amount,
      description
    } = data;

    // Validate inputs
    if (!organizationId || !driverId || !amount) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    if (amount < 100) {
      throw new functions.https.HttpsError('invalid-argument', 'Minimum transfer amount is ₦100');
    }

    // Get organization and verify balance
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    if (!orgDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Organization not found');
    }

    const orgData = orgDoc.data();
    const orgCurrentBalance = orgData?.walletBalance || 0;

    if (orgCurrentBalance < amount) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Insufficient balance. Available: ₦${orgCurrentBalance.toLocaleString()}`
      );
    }

    // Get driver
    const driverDoc = await db.collection('drivers').doc(driverId).get();
    if (!driverDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Driver not found');
    }

    const driverData = driverDoc.data();
    const driverCurrentBalance = driverData?.walletBalance || 0;

    // Generate unique reference
    const reference = `TXN_${organizationId}_${driverId}_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Use Firestore transaction for atomic operation
    await db.runTransaction(async (transaction) => {
      // Debit organization wallet
      transaction.update(orgDoc.ref, {
        walletBalance: orgCurrentBalance - amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Credit driver wallet
      transaction.update(driverDoc.ref, {
        walletBalance: driverCurrentBalance + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create organization debit transaction
      const orgTxnRef = db.collection('walletTransactions').doc();
      transaction.set(orgTxnRef, {
        organizationId,
        driverId: '',
        type: 'debit',
        amount,
        currency: 'NGN',
        balanceBefore: orgCurrentBalance,
        balanceAfter: orgCurrentBalance - amount,
        status: 'success',
        reference: `${reference}_ORG`,
        description: description || `Transfer to driver ${driverData?.name || driverId}`,
        paymentMethod: 'internal_transfer',
        recipient: {
          driverId,
          driverName: driverData?.name || '',
        },
        metadata: {
          source: 'driver_transfer',
          transferType: 'organization_to_driver',
        },
        initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create driver credit transaction
      const driverTxnRef = db.collection('walletTransactions').doc();
      transaction.set(driverTxnRef, {
        organizationId,
        driverId,
        type: 'credit',
        amount,
        currency: 'NGN',
        balanceBefore: driverCurrentBalance,
        balanceAfter: driverCurrentBalance + amount,
        status: 'success',
        reference: `${reference}_DRV`,
        description: description || `Transfer from organization`,
        paymentMethod: 'internal_transfer',
        metadata: {
          source: 'organization_transfer',
          transferType: 'organization_to_driver',
        },
        initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    functions.logger.info('Driver transfer completed', {
      organizationId,
      driverId,
      amount,
      reference
    });

    return {
      success: true,
      reference,
      message: 'Transfer completed successfully'
    };
  } catch (error: any) {
    functions.logger.error('Driver transfer error', {
      error: error.message,
      stack: error.stack
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to complete transfer. Please try again.');
  }
});

/**
 * Paystack Webhook Handler
 * Automatically records transactions when payments are received
 */
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Verify Paystack signature
    const hash = require('crypto')
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      functions.logger.warn('Invalid Paystack signature');
      res.status(401).send('Invalid signature');
      return;
    }

    const event = req.body;
    functions.logger.info('Paystack webhook received', { event: event.event });

    // Handle successful charge (payment received)
    if (event.event === 'charge.success') {
      const data = event.data;

      // Check if this is a virtual account payment
      if (data.channel === 'dedicated_nuban' && data.customer?.customer_code) {
        // Find organization by Paystack customer code
        const orgSnapshot = await db
          .collection('organizations')
          .where('paystackCustomerCode', '==', data.customer.customer_code)
          .limit(1)
          .get();

        if (!orgSnapshot.empty) {
          const organizationId = orgSnapshot.docs[0].id;
          const amount = data.amount / 100; // Convert from kobo to naira

          functions.logger.info('Processing virtual account payment', {
            organizationId,
            amount,
            reference: data.reference
          });

          // Check if transaction already recorded
          const existingTxn = await db
            .collection('walletTransactions')
            .where('reference', '==', data.reference)
            .limit(1)
            .get();

          if (!existingTxn.empty) {
            functions.logger.info('Transaction already recorded', { reference: data.reference });
            res.status(200).send('Transaction already recorded');
            return;
          }

          // Get current balance
          const orgDoc = await db.collection('organizations').doc(organizationId).get();
          const currentBalance = orgDoc.data()?.wallet?.balance || 0;

          // Create transaction record
          await db.collection('walletTransactions').add({
            organizationId,
            driverId: '',
            type: 'credit',
            amount,
            currency: 'NGN',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance + amount,
            status: 'success',
            reference: data.reference,
            description: `Payment received - ${data.customer.email || 'Customer'}`,
            paymentMethod: 'bank_transfer',
            paystackReference: data.reference,
            metadata: {
              source: 'virtual_account_payment',
              customerEmail: data.customer.email,
              channel: data.channel,
              paystackCustomerCode: data.customer.customer_code,
              paidAt: data.paid_at,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update organization wallet balance
          await db.collection('organizations').doc(organizationId).update({
            'wallet.balance': currentBalance + amount,
            'wallet.lastTransactionAt': admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          functions.logger.info('Virtual account payment processed successfully', {
            organizationId,
            amount,
            newBalance: currentBalance + amount
          });
        } else {
          functions.logger.warn('Organization not found for customer code', {
            customerCode: data.customer.customer_code
          });
        }
      }
    }

    // Handle transfer success (payout completed)
    if (event.event === 'transfer.success') {
      const data = event.data;

      functions.logger.info('Transfer completed', {
        transferCode: data.transfer_code,
        amount: data.amount / 100
      });

      // Update transaction status if exists
      const txnSnapshot = await db
        .collection('walletTransactions')
        .where('transferCode', '==', data.transfer_code)
        .limit(1)
        .get();

      if (!txnSnapshot.empty) {
        await txnSnapshot.docs[0].ref.update({
          status: 'success',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Transfer transaction updated to success');
      }
    }

    // Handle transfer failure
    if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const data = event.data;

      functions.logger.info('Transfer failed/reversed', {
        transferCode: data.transfer_code,
        reason: data.reason
      });

      // Update transaction status and refund balance
      const txnSnapshot = await db
        .collection('walletTransactions')
        .where('transferCode', '==', data.transfer_code)
        .limit(1)
        .get();

      if (!txnSnapshot.empty) {
        const txnDoc = txnSnapshot.docs[0];
        const txnData = txnDoc.data();

        await txnDoc.ref.update({
          status: event.event === 'transfer.failed' ? 'failed' : 'reversed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            ...txnData.metadata,
            failureReason: data.reason,
          },
        });

        // Refund the amount back to organization wallet
        const orgDoc = await db.collection('organizations').doc(txnData.organizationId).get();
        const currentBalance = orgDoc.data()?.wallet?.balance || 0;

        await db.collection('organizations').doc(txnData.organizationId).update({
          'wallet.balance': currentBalance + txnData.amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Transfer failed - amount refunded', {
          organizationId: txnData.organizationId,
          amount: txnData.amount
        });
      }
    }

    res.status(200).send('Webhook processed');
  } catch (error: any) {
    functions.logger.error('Error processing Paystack webhook', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).send('Error processing webhook');
  }
});
