/**
 * Wallet Transaction Service
 * Manages all wallet-related transactions for drivers
 */

import { db } from '../../firebase/firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import type { WalletTransaction, Driver } from '../../types';

/**
 * Credit (add funds to) driver wallet
 */
export const creditDriverWallet = async (
  driverId: string,
  amount: number,
  description: string,
  metadata?: WalletTransaction['metadata']
): Promise<{ success: boolean; transaction?: WalletTransaction; error?: string }> => {
  try {
    const driverRef = doc(db, 'drivers', driverId);
    const driverSnap = await getDoc(driverRef);

    if (!driverSnap.exists()) {
      return { success: false, error: 'Driver not found' };
    }

    const driverData = driverSnap.data() as Driver;
    const currentBalance = driverData.walletBalance || 0;
    const newBalance = currentBalance + amount;

    // Generate unique reference
    const reference = `TXN_${driverId}_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create transaction record
    const transaction: Omit<WalletTransaction, 'id'> = {
      driverId,
      organizationId: driverData.organizationId,
      type: 'credit',
      amount,
      currency: driverData.walletCurrency || 'NGN',
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      status: 'success',
      reference,
      description,
      paymentMethod: 'paystack',
      metadata: {
        ...metadata,
        source: metadata?.source || 'wallet_funding'
      },
      initiatedAt: serverTimestamp() as any,
      completedAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    };

    // Use Firestore transaction to ensure atomicity
    await runTransaction(db, async (firestoreTransaction) => {
      const freshDriverSnap = await firestoreTransaction.get(driverRef);

      if (!freshDriverSnap.exists()) {
        throw new Error('Driver not found');
      }

      const currentDriverData = freshDriverSnap.data() as Driver;
      const currentBal = currentDriverData.walletBalance || 0;

      // Update driver wallet balance
      firestoreTransaction.update(driverRef, {
        walletBalance: currentBal + amount,
        updatedAt: serverTimestamp()
      });
    });

    // Add transaction record
    const txnRef = await addDoc(collection(db, 'walletTransactions'), transaction);

    return {
      success: true,
      transaction: {
        ...transaction,
        id: txnRef.id,
        initiatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as WalletTransaction
    };
  } catch (error) {
    console.error('Credit wallet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to credit wallet'
    };
  }
};

/**
 * Debit (withdraw funds from) driver wallet
 */
export const debitDriverWallet = async (
  driverId: string,
  amount: number,
  description: string,
  recipient?: WalletTransaction['recipient'],
  metadata?: WalletTransaction['metadata']
): Promise<{ success: boolean; transaction?: WalletTransaction; error?: string }> => {
  try {
    const driverRef = doc(db, 'drivers', driverId);
    const driverSnap = await getDoc(driverRef);

    if (!driverSnap.exists()) {
      return { success: false, error: 'Driver not found' };
    }

    const driverData = driverSnap.data() as Driver;
    const currentBalance = driverData.walletBalance || 0;

    // Check if sufficient balance
    if (currentBalance < amount) {
      return {
        success: false,
        error: `Insufficient balance. Available: ₦${currentBalance.toLocaleString()}, Required: ₦${amount.toLocaleString()}`
      };
    }

    const newBalance = currentBalance - amount;

    // Generate unique reference
    const reference = `TXN_${driverId}_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create transaction record
    const transaction: Omit<WalletTransaction, 'id'> = {
      driverId,
      organizationId: driverData.organizationId,
      type: 'debit',
      amount,
      currency: driverData.walletCurrency || 'NGN',
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      status: 'pending', // Initially pending until transfer completes
      reference,
      description,
      paymentMethod: 'paystack',
      recipient,
      metadata: {
        ...metadata,
        source: metadata?.source || 'withdrawal'
      },
      initiatedAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    };

    // Use Firestore transaction to ensure atomicity
    await runTransaction(db, async (firestoreTransaction) => {
      const freshDriverSnap = await firestoreTransaction.get(driverRef);

      if (!freshDriverSnap.exists()) {
        throw new Error('Driver not found');
      }

      const currentDriverData = freshDriverSnap.data() as Driver;
      const currentBal = currentDriverData.walletBalance || 0;

      if (currentBal < amount) {
        throw new Error('Insufficient balance');
      }

      // Update driver wallet balance
      firestoreTransaction.update(driverRef, {
        walletBalance: currentBal - amount,
        updatedAt: serverTimestamp()
      });
    });

    // Add transaction record
    const txnRef = await addDoc(collection(db, 'walletTransactions'), transaction);

    return {
      success: true,
      transaction: {
        ...transaction,
        id: txnRef.id,
        initiatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as WalletTransaction
    };
  } catch (error) {
    console.error('Debit wallet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to debit wallet'
    };
  }
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (
  transactionId: string,
  status: WalletTransaction['status'],
  additionalData?: Partial<WalletTransaction>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const txnRef = doc(db, 'walletTransactions', transactionId);

    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (status === 'success') {
      updates.completedAt = serverTimestamp();
    } else if (status === 'failed') {
      updates.failedAt = serverTimestamp();
    }

    if (additionalData) {
      Object.assign(updates, additionalData);
    }

    await updateDoc(txnRef, updates);

    return { success: true };
  } catch (error) {
    console.error('Update transaction status error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update transaction'
    };
  }
};

/**
 * Get driver's transaction history
 */
export const getDriverTransactions = async (
  driverId: string,
  limitCount: number = 50
): Promise<{ success: boolean; transactions?: WalletTransaction[]; error?: string }> => {
  try {
    const q = query(
      collection(db, 'walletTransactions'),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const transactions: WalletTransaction[] = [];

    snapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      } as WalletTransaction);
    });

    return { success: true, transactions };
  } catch (error) {
    console.error('Get transactions error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions'
    };
  }
};

/**
 * Get driver's wallet balance
 */
export const getDriverBalance = async (
  driverId: string
): Promise<{ success: boolean; balance?: number; currency?: string; error?: string }> => {
  try {
    const driverRef = doc(db, 'drivers', driverId);
    const driverSnap = await getDoc(driverRef);

    if (!driverSnap.exists()) {
      return { success: false, error: 'Driver not found' };
    }

    const driverData = driverSnap.data() as Driver;

    return {
      success: true,
      balance: driverData.walletBalance || 0,
      currency: driverData.walletCurrency || 'NGN'
    };
  } catch (error) {
    console.error('Get balance error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch balance'
    };
  }
};

/**
 * Get transaction by reference
 */
export const getTransactionByReference = async (
  reference: string
): Promise<{ success: boolean; transaction?: WalletTransaction; error?: string }> => {
  try {
    const q = query(
      collection(db, 'walletTransactions'),
      where('reference', '==', reference),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: 'Transaction not found' };
    }

    const doc = snapshot.docs[0];
    return {
      success: true,
      transaction: {
        id: doc.id,
        ...doc.data()
      } as WalletTransaction
    };
  } catch (error) {
    console.error('Get transaction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transaction'
    };
  }
};

/**
 * Get total withdrawn amount for a driver in a given period
 * (Used for checking daily/monthly limits)
 */
export const getTotalWithdrawnInPeriod = async (
  driverId: string,
  startDate: Date,
  endDate: Date = new Date()
): Promise<{ success: boolean; total?: number; error?: string }> => {
  try {
    const q = query(
      collection(db, 'walletTransactions'),
      where('driverId', '==', driverId),
      where('type', '==', 'debit'),
      where('status', '==', 'success'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);
    let total = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() as WalletTransaction;
      total += data.amount;
    });

    return { success: true, total };
  } catch (error) {
    console.error('Get total withdrawn error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate total'
    };
  }
};
