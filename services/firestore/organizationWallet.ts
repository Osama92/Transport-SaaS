/**
 * Organization Wallet Service
 * Handles virtual account creation and wallet management for organizations
 */

import { doc, getDoc, updateDoc, serverTimestamp, increment, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebase/firebaseConfig';

const functions = getFunctions(app);
const ORGANIZATIONS_COLLECTION = 'organizations';
const ORGANIZATION_TRANSACTIONS_COLLECTION = 'organizationWalletTransactions';

/**
 * Create virtual account for organization
 * Calls Firebase Function to create dedicated NUBAN via Paystack
 */
export const createOrganizationVirtualAccount = async (organizationId: string) => {
  try {
    const createAccount = httpsCallable(functions, 'createOrganizationVirtualAccount');
    const result = await createAccount({ organizationId });

    return result.data as {
      success: boolean;
      message: string;
      data?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
      };
    };
  } catch (error: any) {
    console.error('Error creating organization virtual account:', error);
    throw new Error(error.message || 'Failed to create virtual account');
  }
};

/**
 * Get organization's virtual account details
 */
export const getOrganizationVirtualAccount = async (organizationId: string) => {
  try {
    const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      throw new Error('Organization not found');
    }

    const orgData = orgSnap.data();

    if (!orgData.wallet?.virtualAccountNumber) {
      // Virtual account doesn't exist, create one
      const result = await createOrganizationVirtualAccount(organizationId);
      return result.data;
    }

    return {
      accountNumber: orgData.wallet.virtualAccountNumber,
      accountName: orgData.wallet.virtualAccountName,
      bankName: orgData.wallet.bankName,
    };
  } catch (error) {
    console.error('Error getting organization virtual account:', error);
    throw error;
  }
};

/**
 * Get organization wallet balance
 */
export const getOrganizationWalletBalance = async (organizationId: string): Promise<number> => {
  try {
    const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      throw new Error('Organization not found');
    }

    return orgSnap.data().walletBalance || 0;
  } catch (error) {
    console.error('Error getting organization wallet balance:', error);
    throw error;
  }
};

/**
 * Get organization wallet transactions
 */
export const getOrganizationTransactions = async (organizationId: string, limit: number = 50) => {
  try {
    const { query, where, orderBy, limit: limitQuery, getDocs } = await import('firebase/firestore');

    const transactionsRef = collection(db, ORGANIZATION_TRANSACTIONS_COLLECTION);
    const q = query(
      transactionsRef,
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc'),
      limitQuery(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting organization transactions:', error);
    throw error;
  }
};

/**
 * Add funds to organization wallet (manual - for testing)
 * In production, this is called automatically by webhook
 */
export const addFundsManually = async (
  organizationId: string,
  amount: number,
  description: string = 'Manual top-up'
): Promise<void> => {
  try {
    const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      throw new Error('Organization not found');
    }

    const currentBalance = orgSnap.data().walletBalance || 0;
    const newBalance = currentBalance + amount;

    // Update organization wallet balance
    await updateDoc(orgRef, {
      walletBalance: newBalance,
      updatedAt: serverTimestamp(),
    });

    // Create transaction record
    await addDoc(collection(db, ORGANIZATION_TRANSACTIONS_COLLECTION), {
      organizationId,
      type: 'credit',
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description,
      status: 'completed',
      method: 'manual',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`Added ${amount} to organization ${organizationId} wallet`);
  } catch (error) {
    console.error('Error adding funds to organization wallet:', error);
    throw error;
  }
};
