/**
 * Firebase Cloud Functions for Transport SaaS
 * Handles Paystack integration for driver wallets
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cors from 'cors';
import * as express from 'express';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Paystack Configuration
const PAYSTACK_SECRET_KEY = functions.config().paystack?.secret || 'sk_live_YOUR_SECRET_KEY_HERE';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// CORS configuration
const corsHandler = cors({ origin: true });

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

    // Check if virtual account already exists
    if (driver?.wallet?.virtualAccountNumber) {
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
        preferred_bank: 'wema-bank', // Can be configured
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

    // Update driver document with virtual account details
    await db.collection('drivers').doc(driverId).update({
      'wallet.virtualAccountNumber': accountData.account_number,
      'wallet.virtualAccountName': accountData.account_name,
      'wallet.bankName': accountData.bank.name,
      'wallet.bankCode': accountData.bank.code,
      'wallet.paystackAccountId': accountData.id,
      paystackCustomerCode: accountData.customer.customer_code,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info(`Virtual account created for driver ${driverId}`, {
      accountNumber: accountData.account_number,
      bankName: accountData.bank.name
    });

    return {
      success: true,
      message: 'Virtual account created successfully',
      data: {
        accountNumber: accountData.account_number,
        accountName: accountData.account_name,
        bankName: accountData.bank.name
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

/**
 * Webhook handler for Paystack events
 * Automatically credits driver wallet when payment is received
 */
export const paystackWebhook = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Verify webhook signature
      const hash = req.headers['x-paystack-signature'];
      // TODO: Implement signature verification in production

      const event = req.body;

      functions.logger.info('Paystack webhook received', {
        event: event.event,
        data: event.data
      });

      // Handle different event types
      switch (event.event) {
        case 'charge.success':
          await handleChargeSuccess(event.data);
          break;

        case 'transfer.success':
          await handleTransferSuccess(event.data);
          break;

        case 'transfer.failed':
          await handleTransferFailed(event.data);
          break;

        case 'transfer.reversed':
          await handleTransferReversed(event.data);
          break;

        default:
          functions.logger.info('Unhandled webhook event', { event: event.event });
      }

      res.status(200).send({ success: true });
    } catch (error: any) {
      functions.logger.error('Webhook processing error', { error: error.message });
      res.status(500).send({ success: false, error: error.message });
    }
  });
});

/**
 * Handle successful charge (payment received to virtual account)
 */
async function handleChargeSuccess(data: any) {
  try {
    // Find driver by virtual account number or customer code
    const accountNumber = data.authorization?.account_number;
    const customerCode = data.customer?.customer_code;

    if (!accountNumber && !customerCode) {
      functions.logger.warn('No account number or customer code in charge event');
      return;
    }

    let driverQuery;
    if (accountNumber) {
      driverQuery = db.collection('drivers')
        .where('wallet.virtualAccountNumber', '==', accountNumber)
        .limit(1);
    } else {
      driverQuery = db.collection('drivers')
        .where('paystackCustomerCode', '==', customerCode)
        .limit(1);
    }

    const driversSnapshot = await driverQuery.get();

    if (driversSnapshot.empty) {
      functions.logger.warn('Driver not found for payment', { accountNumber, customerCode });
      return;
    }

    const driverDoc = driversSnapshot.docs[0];
    const driverId = driverDoc.id;
    const driver = driverDoc.data();

    const amount = data.amount / 100; // Convert from kobo to naira
    const currentBalance = driver.wallet?.balance || 0;
    const newBalance = currentBalance + amount;

    // Update driver wallet balance
    await db.collection('drivers').doc(driverId).update({
      'wallet.balance': newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create transaction record
    await db.collection('walletTransactions').add({
      driverId: driverId,
      type: 'credit',
      amount: amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: 'Wallet funding via virtual account',
      status: 'completed',
      reference: data.reference,
      paystackReference: data.reference,
      paystackTransactionId: data.id,
      metadata: {
        channel: data.channel,
        currency: data.currency,
        paidAt: data.paid_at
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info('Wallet credited successfully', {
      driverId,
      amount,
      newBalance,
      reference: data.reference
    });

    // TODO: Send notification to driver (SMS/WhatsApp/Push)
  } catch (error: any) {
    functions.logger.error('Error handling charge success', { error: error.message, data });
    throw error;
  }
}

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

    // Get driver
    const driverDoc = await db.collection('drivers').doc(transaction.driverId).get();

    if (!driverDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Driver not found');
    }

    const driver = driverDoc.data();

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
 * Handle successful transfer
 */
async function handleTransferSuccess(data: any) {
  try {
    const transferCode = data.transfer_code;

    // Find transaction by transfer code
    const transactionsSnapshot = await db.collection('walletTransactions')
      .where('paystackTransferCode', '==', transferCode)
      .limit(1)
      .get();

    if (transactionsSnapshot.empty) {
      functions.logger.warn('Transaction not found for transfer', { transferCode });
      return;
    }

    const transactionDoc = transactionsSnapshot.docs[0];
    const transactionId = transactionDoc.id;

    // Update transaction status
    await db.collection('walletTransactions').doc(transactionId).update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info('Transfer completed', { transactionId, transferCode });

    // TODO: Send notification to driver
  } catch (error: any) {
    functions.logger.error('Error handling transfer success', { error: error.message, data });
  }
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(data: any) {
  try {
    const transferCode = data.transfer_code;

    // Find transaction
    const transactionsSnapshot = await db.collection('walletTransactions')
      .where('paystackTransferCode', '==', transferCode)
      .limit(1)
      .get();

    if (transactionsSnapshot.empty) {
      functions.logger.warn('Transaction not found for failed transfer', { transferCode });
      return;
    }

    const transactionDoc = transactionsSnapshot.docs[0];
    const transactionId = transactionDoc.id;
    const transaction = transactionDoc.data();

    // Refund the amount back to driver's wallet
    const driverDoc = await db.collection('drivers').doc(transaction.driverId).get();
    const driver = driverDoc.data();
    const currentBalance = driver?.wallet?.balance || 0;
    const refundedBalance = currentBalance + transaction.amount;

    await db.collection('drivers').doc(transaction.driverId).update({
      'wallet.balance': refundedBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update transaction status
    await db.collection('walletTransactions').doc(transactionId).update({
      status: 'failed',
      failureReason: data.reason || 'Transfer failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info('Transfer failed and refunded', {
      transactionId,
      transferCode,
      refundedAmount: transaction.amount
    });

    // TODO: Send notification to driver
  } catch (error: any) {
    functions.logger.error('Error handling transfer failure', { error: error.message, data });
  }
}

/**
 * Handle reversed transfer
 */
async function handleTransferReversed(data: any) {
  try {
    const transferCode = data.transfer_code;

    // Find transaction
    const transactionsSnapshot = await db.collection('walletTransactions')
      .where('paystackTransferCode', '==', transferCode)
      .limit(1)
      .get();

    if (transactionsSnapshot.empty) {
      functions.logger.warn('Transaction not found for reversed transfer', { transferCode });
      return;
    }

    const transactionDoc = transactionsSnapshot.docs[0];
    const transactionId = transactionDoc.id;
    const transaction = transactionDoc.data();

    // Refund the amount back to driver's wallet
    const driverDoc = await db.collection('drivers').doc(transaction.driverId).get();
    const driver = driverDoc.data();
    const currentBalance = driver?.wallet?.balance || 0;
    const refundedBalance = currentBalance + transaction.amount;

    await db.collection('drivers').doc(transaction.driverId).update({
      'wallet.balance': refundedBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update transaction status
    await db.collection('walletTransactions').doc(transactionId).update({
      status: 'reversed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info('Transfer reversed and refunded', {
      transactionId,
      transferCode,
      refundedAmount: transaction.amount
    });

    // TODO: Send notification to driver
  } catch (error: any) {
    functions.logger.error('Error handling transfer reversal', { error: error.message, data });
  }
}
