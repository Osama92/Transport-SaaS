/**
 * Wallet Service
 * Frontend service for driver wallet operations
 * Communicates with Firebase Functions for Paystack integration
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/firebaseConfig';

const functions = getFunctions(app);

/**
 * Create virtual account for driver
 * Calls Firebase Function to create dedicated NUBAN via Paystack
 */
export const createVirtualAccount = async (driverId: string) => {
  try {
    const createAccount = httpsCallable(functions, 'createDriverVirtualAccount');
    const result = await createAccount({ driverId });

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
    console.error('Error creating virtual account:', error);
    throw new Error(error.message || 'Failed to create virtual account');
  }
};

/**
 * Process withdrawal request
 * Calls Firebase Function to initiate Paystack transfer
 */
export const processWithdrawal = async (transactionId: string) => {
  try {
    const process = httpsCallable(functions, 'processWithdrawal');
    const result = await process({ transactionId });

    return result.data as {
      success: boolean;
      message: string;
      data?: {
        transferCode: string;
        status: string;
      };
    };
  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    throw new Error(error.message || 'Failed to process withdrawal');
  }
};

/**
 * Get wallet balance from Firestore (real-time)
 * Note: Use Firestore listener in components for real-time updates
 */
export const getWalletBalance = async (driverId: string): Promise<number> => {
  // This is a placeholder - use Firestore listener in components
  // See hooks/useDriverWallet.ts for real-time implementation
  return 0;
};

/**
 * Validate bank account details via Paystack
 * This would typically be called from a Firebase Function
 * For now, we'll implement basic validation
 */
export const validateBankAccount = (
  accountNumber: string,
  bankCode: string
): { isValid: boolean; error?: string } => {
  // Basic validation
  if (!accountNumber || accountNumber.length !== 10) {
    return { isValid: false, error: 'Account number must be 10 digits' };
  }

  if (!bankCode) {
    return { isValid: false, error: 'Bank code is required' };
  }

  return { isValid: true };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Nigerian banks list
 * Used for bank selection in withdrawal forms
 */
export const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Suntrust Bank', code: '100' },
  { name: 'Globus Bank', code: '00103' },
  { name: 'Parallex Bank', code: '526' },
  { name: 'Premium Trust Bank', code: '105' },
  { name: 'Optimus Bank', code: '107' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'OPay', code: '999992' },
  { name: 'PalmPay', code: '999991' }
];
