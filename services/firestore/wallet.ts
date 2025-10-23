import { doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

const ORGANIZATIONS_COLLECTION = 'organizations';

/**
 * Add funds to organization wallet
 * In production, this would be called after successful payment from Paystack/Flutterwave
 */
export const addFundsToWallet = async (
    organizationId: string,
    amount: number,
    paymentMethod: string,
    transactionReference?: string
): Promise<void> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
        const orgSnap = await getDoc(orgRef);

        if (!orgSnap.exists()) {
            throw new Error('Organization not found');
        }

        // Use increment to avoid race conditions
        await updateDoc(orgRef, {
            walletBalance: increment(amount),
            updatedAt: serverTimestamp(),
        });

        // TODO: In production, also create a transaction record in a subcollection
        // await addDoc(collection(db, ORGANIZATIONS_COLLECTION, organizationId, 'transactions'), {
        //     type: 'credit',
        //     amount,
        //     method: paymentMethod,
        //     reference: transactionReference,
        //     description: 'Wallet top-up',
        //     status: 'completed',
        //     createdAt: serverTimestamp(),
        // });

    } catch (error) {
        console.error('Error adding funds to wallet:', error);
        throw error;
    }
};

/**
 * Deduct funds from organization wallet (used by payroll processing)
 */
export const deductFundsFromWallet = async (
    organizationId: string,
    amount: number,
    description: string
): Promise<void> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
        const orgSnap = await getDoc(orgRef);

        if (!orgSnap.exists()) {
            throw new Error('Organization not found');
        }

        const currentBalance = orgSnap.data().walletBalance || 0;

        if (currentBalance < amount) {
            throw new Error(`Insufficient funds. Available: ₦${currentBalance.toLocaleString()}, Required: ₦${amount.toLocaleString()}`);
        }

        await updateDoc(orgRef, {
            walletBalance: increment(-amount),
            updatedAt: serverTimestamp(),
        });

        // TODO: Create debit transaction record
    } catch (error) {
        console.error('Error deducting funds from wallet:', error);
        throw error;
    }
};

/**
 * Get wallet balance for an organization
 */
export const getWalletBalance = async (organizationId: string): Promise<number> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
        const orgSnap = await getDoc(orgRef);

        if (!orgSnap.exists()) {
            throw new Error('Organization not found');
        }

        return orgSnap.data().walletBalance || 0;
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        throw error;
    }
};

/**
 * Initialize wallet balance for new organization
 */
export const initializeWallet = async (
    organizationId: string,
    initialBalance: number = 0
): Promise<void> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);

        await updateDoc(orgRef, {
            walletBalance: initialBalance,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error initializing wallet:', error);
        throw error;
    }
};
