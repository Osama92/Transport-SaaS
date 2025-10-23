/**
 * Firestore Subscription Payments Service
 * Handles payment history storage and retrieval
 */

import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import type { SubscriptionPayment } from '../../types';

/**
 * Record a subscription payment from webhook or payment verification
 */
export const recordSubscriptionPayment = async (
    organizationId: string,
    paymentData: Omit<SubscriptionPayment, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'createdBy'>
): Promise<string> => {
    try {
        const paymentsRef = collection(db, 'subscriptionPayments');

        const docRef = await addDoc(paymentsRef, {
            organizationId,
            ...paymentData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        console.log('Subscription payment recorded:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error recording subscription payment:', error);
        throw error;
    }
};

/**
 * Get payment history for an organization
 */
export const getPaymentHistory = async (
    organizationId: string,
    limit: number = 50
): Promise<SubscriptionPayment[]> => {
    try {
        const paymentsRef = collection(db, 'subscriptionPayments');
        const q = query(
            paymentsRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SubscriptionPayment));
    } catch (error) {
        console.error('Error fetching payment history:', error);
        throw error;
    }
};

/**
 * Get successful payments only
 */
export const getSuccessfulPayments = async (
    organizationId: string
): Promise<SubscriptionPayment[]> => {
    try {
        const paymentsRef = collection(db, 'subscriptionPayments');
        const q = query(
            paymentsRef,
            where('organizationId', '==', organizationId),
            where('status', '==', 'success'),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SubscriptionPayment));
    } catch (error) {
        console.error('Error fetching successful payments:', error);
        throw error;
    }
};

/**
 * Get failed payments only
 */
export const getFailedPayments = async (
    organizationId: string
): Promise<SubscriptionPayment[]> => {
    try {
        const paymentsRef = collection(db, 'subscriptionPayments');
        const q = query(
            paymentsRef,
            where('organizationId', '==', organizationId),
            where('status', '==', 'failed'),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SubscriptionPayment));
    } catch (error) {
        console.error('Error fetching failed payments:', error);
        throw error;
    }
};

/**
 * Calculate total lifetime value (sum of successful payments)
 */
export const calculateLifetimeValue = async (
    organizationId: string
): Promise<number> => {
    try {
        const successfulPayments = await getSuccessfulPayments(organizationId);
        return successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
    } catch (error) {
        console.error('Error calculating lifetime value:', error);
        return 0;
    }
};

/**
 * Update payment status (for manual corrections or retries)
 */
export const updatePaymentStatus = async (
    paymentId: string,
    status: 'success' | 'failed' | 'pending',
    failureReason?: string
): Promise<void> => {
    try {
        const paymentRef = doc(db, 'subscriptionPayments', paymentId);
        await updateDoc(paymentRef, {
            status,
            failureReason: failureReason || null,
            updatedAt: Timestamp.now()
        });

        console.log('Payment status updated:', paymentId, status);
    } catch (error) {
        console.error('Error updating payment status:', error);
        throw error;
    }
};

/**
 * Get payment statistics for an organization
 */
export const getPaymentStatistics = async (
    organizationId: string
): Promise<{
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    lifetimeValue: number;
    averagePayment: number;
}> => {
    try {
        const allPayments = await getPaymentHistory(organizationId);
        const successful = allPayments.filter(p => p.status === 'success');
        const failed = allPayments.filter(p => p.status === 'failed');
        const lifetimeValue = successful.reduce((sum, p) => sum + p.amount, 0);

        return {
            totalPayments: allPayments.length,
            successfulPayments: successful.length,
            failedPayments: failed.length,
            lifetimeValue,
            averagePayment: successful.length > 0 ? lifetimeValue / successful.length : 0
        };
    } catch (error) {
        console.error('Error calculating payment statistics:', error);
        return {
            totalPayments: 0,
            successfulPayments: 0,
            failedPayments: 0,
            lifetimeValue: 0,
            averagePayment: 0
        };
    }
};
