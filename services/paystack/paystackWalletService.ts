/**
 * Paystack Wallet Service
 * Handles all Paystack operations for driver wallets
 * Documentation: https://paystack.com/docs/api/
 */

import type { Driver, WalletTransaction } from '../../types';
import { db } from '../../firebase/firebaseConfig';
import { doc, updateDoc, addDoc, collection, serverTimestamp, increment } from 'firebase/firestore';

interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  baseUrl: string;
  testMode: boolean;
}

interface CreateSubaccountResponse {
  success: boolean;
  data?: {
    subaccount_code: string;
    business_name: string;
    account_number: string;
    bank_name: string;
  };
  error?: string;
}

interface CreateCustomerResponse {
  success: boolean;
  data?: {
    customer_code: string;
    email: string;
    customer_id: number;
  };
  error?: string;
}

interface CreateTransferRecipientResponse {
  success: boolean;
  data?: {
    recipient_code: string;
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
  };
  error?: string;
}

interface InitiateTransferResponse {
  success: boolean;
  data?: {
    transfer_code: string;
    reference: string;
    amount: number;
    status: string;
  };
  error?: string;
}

interface VerifyBankAccountResponse {
  success: boolean;
  data?: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
  error?: string;
}

interface GetBalanceResponse {
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

class PaystackWalletService {
  private config: PaystackConfig;

  constructor() {
    const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY || '';
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

    this.config = {
      secretKey,
      publicKey,
      baseUrl: 'https://api.paystack.co',
      testMode: secretKey.startsWith('sk_test_')
    };
  }

  /**
   * Make authenticated request to Paystack API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      // Check if API key is configured
      if (!this.config.secretKey || this.config.secretKey === 'sk_test_your_secret_key_here') {
        console.warn('Paystack API key not configured. Using test mode.');
        return {
          success: false,
          error: 'Paystack API key not configured'
        };
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const result = await response.json();

      if (response.ok && result.status) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.message || 'Request failed'
        };
      }
    } catch (error) {
      console.error('Paystack API error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Create a dedicated virtual account (DVA) for a driver
   * This allows drivers to receive payments directly
   */
  async createDedicatedVirtualAccount(driver: Driver): Promise<CreateSubaccountResponse> {
    try {
      const payload = {
        email: driver.email || `driver.${driver.id}@transportco.ng`,
        first_name: driver.name.split(' ')[0],
        last_name: driver.name.split(' ').slice(1).join(' ') || driver.name.split(' ')[0],
        phone: driver.phone.replace('+', ''),
        preferred_bank: 'wema-bank', // Wema Bank is default for DVA
        country: 'NG'
      };

      const result = await this.makeRequest<any>(
        '/dedicated_account',
        'POST',
        payload
      );

      if (result.success && result.data) {
        // Update driver record with virtual account details
        await this.updateDriverPaystackInfo(driver.id, {
          virtualAccountNumber: result.data.account_number,
          virtualAccountBank: result.data.bank?.name || 'Wema Bank',
          customerCode: result.data.customer?.customer_code
        });

        return {
          success: true,
          data: {
            subaccount_code: result.data.dedicated_account?.id || '',
            business_name: driver.name,
            account_number: result.data.account_number,
            bank_name: result.data.bank?.name || 'Wema Bank'
          }
        };
      }

      return {
        success: false,
        error: result.error
      };
    } catch (error) {
      console.error('Create DVA error:', error);
      return {
        success: false,
        error: 'Failed to create virtual account'
      };
    }
  }

  /**
   * Create a Paystack customer for the driver
   */
  async createCustomer(driver: Driver): Promise<CreateCustomerResponse> {
    try {
      const payload = {
        email: driver.email || `driver.${driver.id}@transportco.ng`,
        first_name: driver.name.split(' ')[0],
        last_name: driver.name.split(' ').slice(1).join(' ') || driver.name.split(' ')[0],
        phone: driver.phone.replace('+', ''),
        metadata: {
          driver_id: driver.id,
          organization_id: driver.organizationId
        }
      };

      const result = await this.makeRequest<any>(
        '/customer',
        'POST',
        payload
      );

      if (result.success && result.data) {
        await this.updateDriverPaystackInfo(driver.id, {
          customerCode: result.data.customer_code
        });

        return {
          success: true,
          data: {
            customer_code: result.data.customer_code,
            email: result.data.email,
            customer_id: result.data.id
          }
        };
      }

      return {
        success: false,
        error: result.error
      };
    } catch (error) {
      console.error('Create customer error:', error);
      return {
        success: false,
        error: 'Failed to create customer'
      };
    }
  }

  /**
   * Create transfer recipient for driver's bank account
   * This is needed before making transfers (withdrawals)
   */
  async createTransferRecipient(
    driverId: string,
    bankAccount: {
      accountNumber: string;
      accountName: string;
      bankCode: string;
    }
  ): Promise<CreateTransferRecipientResponse> {
    try {
      const payload = {
        type: 'nuban', // Nigerian bank account
        name: bankAccount.accountName,
        account_number: bankAccount.accountNumber,
        bank_code: bankAccount.bankCode,
        currency: 'NGN',
        metadata: {
          driver_id: driverId
        }
      };

      const result = await this.makeRequest<any>(
        '/transferrecipient',
        'POST',
        payload
      );

      if (result.success && result.data) {
        // Update driver record with recipient code
        await this.updateDriverPaystackInfo(driverId, {
          recipientCode: result.data.recipient_code
        });

        return {
          success: true,
          data: {
            recipient_code: result.data.recipient_code,
            type: result.data.type,
            name: result.data.name,
            account_number: result.data.details.account_number,
            bank_code: result.data.details.bank_code
          }
        };
      }

      return {
        success: false,
        error: result.error
      };
    } catch (error) {
      console.error('Create recipient error:', error);
      return {
        success: false,
        error: 'Failed to create transfer recipient'
      };
    }
  }

  /**
   * Verify bank account details
   */
  async verifyBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<VerifyBankAccountResponse> {
    try {
      const result = await this.makeRequest<any>(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
      );

      if (result.success && result.data) {
        return {
          success: true,
          data: {
            account_number: result.data.account_number,
            account_name: result.data.account_name,
            bank_id: result.data.bank_id
          }
        };
      }

      return {
        success: false,
        error: result.error || 'Could not verify account'
      };
    } catch (error) {
      console.error('Verify account error:', error);
      return {
        success: false,
        error: 'Failed to verify bank account'
      };
    }
  }

  /**
   * Initiate transfer (withdrawal) from driver wallet
   */
  async initiateTransfer(
    driverId: string,
    recipientCode: string,
    amount: number, // In kobo
    reason: string = 'Wallet withdrawal'
  ): Promise<InitiateTransferResponse> {
    try {
      const payload = {
        source: 'balance',
        amount,
        recipient: recipientCode,
        reason,
        currency: 'NGN',
        reference: `WD_${driverId}_${Date.now()}`,
        metadata: {
          driver_id: driverId,
          type: 'withdrawal'
        }
      };

      const result = await this.makeRequest<any>(
        '/transfer',
        'POST',
        payload
      );

      if (result.success && result.data) {
        return {
          success: true,
          data: {
            transfer_code: result.data.transfer_code,
            reference: result.data.reference,
            amount: result.data.amount,
            status: result.data.status
          }
        };
      }

      return {
        success: false,
        error: result.error
      };
    } catch (error) {
      console.error('Initiate transfer error:', error);
      return {
        success: false,
        error: 'Failed to initiate transfer'
      };
    }
  }

  /**
   * Get list of Nigerian banks
   */
  async getBanks(): Promise<{ success: boolean; banks?: Array<{ name: string; code: string; id: number }>; error?: string }> {
    try {
      const result = await this.makeRequest<any>(
        '/bank?currency=NGN&country=nigeria'
      );

      if (result.success && result.data) {
        return {
          success: true,
          banks: result.data.map((bank: any) => ({
            name: bank.name,
            code: bank.code,
            id: bank.id
          }))
        };
      }

      return {
        success: false,
        error: result.error
      };
    } catch (error) {
      console.error('Get banks error:', error);
      return {
        success: false,
        error: 'Failed to fetch banks'
      };
    }
  }

  /**
   * Update driver's Paystack information in Firestore
   */
  private async updateDriverPaystackInfo(
    driverId: string,
    paystackInfo: Partial<Driver['paystack']>
  ): Promise<void> {
    try {
      const driverRef = doc(db, 'drivers', driverId);
      await updateDoc(driverRef, {
        [`paystack.${Object.keys(paystackInfo)[0]}`]: Object.values(paystackInfo)[0],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update driver Paystack info error:', error);
      throw error;
    }
  }

  /**
   * Check if test mode is enabled
   */
  isTestMode(): boolean {
    return this.config.testMode;
  }
}

// Export singleton instance
export const paystackWalletService = new PaystackWalletService();

// Export types
export type {
  CreateSubaccountResponse,
  CreateCustomerResponse,
  CreateTransferRecipientResponse,
  InitiateTransferResponse,
  VerifyBankAccountResponse,
  GetBalanceResponse
};
