import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { WalletTransaction } from '../../types';

const TRANSACTIONS_COLLECTION = 'walletTransactions';

/**
 * Create a new wallet transaction
 */
export const createTransaction = async (
    transaction: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
    try {
        const transactionRef = doc(collection(db, TRANSACTIONS_COLLECTION));
        const transactionId = transactionRef.id;

        const newTransaction = {
            ...transaction,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(transactionRef, newTransaction);

        console.log('Transaction created:', transactionId);
        return transactionId;
    } catch (error) {
        console.error('Error creating transaction:', error);
        throw new Error('Failed to create transaction');
    }
};

/**
 * Get all transactions for an organization
 */
export const getTransactionsByOrganization = async (
    organizationId: string,
    limitCount: number = 100
): Promise<WalletTransaction[]> => {
    try {
        const q = query(
            collection(db, TRANSACTIONS_COLLECTION),
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as WalletTransaction;
        });
    } catch (error) {
        console.error('Error getting transactions:', error);
        throw new Error('Failed to fetch transactions');
    }
};

/**
 * Get transactions by type (credit/debit)
 */
export const getTransactionsByType = async (
    organizationId: string,
    type: 'credit' | 'debit'
): Promise<WalletTransaction[]> => {
    try {
        const q = query(
            collection(db, TRANSACTIONS_COLLECTION),
            where('organizationId', '==', organizationId),
            where('type', '==', type),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as WalletTransaction;
        });
    } catch (error) {
        console.error('Error getting transactions by type:', error);
        throw new Error('Failed to fetch transactions');
    }
};

/**
 * Get transaction by reference
 */
export const getTransactionByReference = async (
    reference: string
): Promise<WalletTransaction | null> => {
    try {
        const q = query(
            collection(db, TRANSACTIONS_COLLECTION),
            where('reference', '==', reference),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as WalletTransaction;
    } catch (error) {
        console.error('Error getting transaction by reference:', error);
        throw new Error('Failed to fetch transaction');
    }
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (
    transactionId: string,
    status: 'pending' | 'success' | 'failed' | 'reversed'
): Promise<void> => {
    try {
        const transactionRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);

        await updateDoc(transactionRef, {
            status,
            updatedAt: serverTimestamp(),
        });

        console.log('Transaction status updated:', transactionId, status);
    } catch (error) {
        console.error('Error updating transaction status:', error);
        throw new Error('Failed to update transaction status');
    }
};

/**
 * Calculate wallet balance from transactions
 */
export const calculateWalletBalance = async (
    organizationId: string
): Promise<{ balance: number; totalReceived: number; totalSent: number; pendingAmount: number }> => {
    try {
        const transactions = await getTransactionsByOrganization(organizationId, 1000);

        let balance = 0;
        let totalReceived = 0;
        let totalSent = 0;
        let pendingAmount = 0;

        transactions.forEach(transaction => {
            if (transaction.status === 'success') {
                if (transaction.type === 'credit') {
                    balance += transaction.amount;
                    totalReceived += transaction.amount;
                } else {
                    balance -= transaction.amount;
                    totalSent += transaction.amount;
                }
            } else if (transaction.status === 'pending') {
                pendingAmount += transaction.amount;
            }
        });

        return {
            balance,
            totalReceived,
            totalSent,
            pendingAmount,
        };
    } catch (error) {
        console.error('Error calculating wallet balance:', error);
        throw new Error('Failed to calculate balance');
    }
};

/**
 * Record a Paystack payment (called by webhook)
 */
export const recordPaystackPayment = async (data: {
    organizationId: string;
    amount: number;
    reference: string;
    paystackReference: string;
    description: string;
    customerEmail?: string;
    metadata?: any;
}): Promise<string> => {
    try {
        // Check if transaction already exists
        const existing = await getTransactionByReference(data.reference);
        if (existing) {
            console.log('Transaction already recorded:', data.reference);
            return existing.id;
        }

        // Get current balance
        const { balance } = await calculateWalletBalance(data.organizationId);

        const transaction: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
            driverId: '',
            organizationId: data.organizationId,
            type: 'credit',
            amount: data.amount,
            currency: 'NGN',
            balanceBefore: balance,
            balanceAfter: balance + data.amount,
            status: 'success',
            reference: data.reference,
            description: data.description,
            paymentMethod: 'bank_transfer',
            paystackReference: data.paystackReference,
            metadata: {
                source: 'virtual_account_payment',
                customerEmail: data.customerEmail,
                ...data.metadata,
            },
        };

        const transactionId = await createTransaction(transaction);

        // Update organization wallet balance
        const orgRef = doc(db, 'organizations', data.organizationId);
        await updateDoc(orgRef, {
            'wallet.balance': balance + data.amount,
            'wallet.lastTransactionAt': serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        console.log('Paystack payment recorded:', transactionId);
        return transactionId;
    } catch (error) {
        console.error('Error recording Paystack payment:', error);
        throw new Error('Failed to record payment');
    }
};
