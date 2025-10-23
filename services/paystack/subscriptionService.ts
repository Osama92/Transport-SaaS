/**
 * Paystack Subscription Service
 * Handles all Paystack subscription API interactions
 */

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackPlan {
  name: string;
  amount: number; // in kobo (multiply naira by 100)
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually';
  currency?: string;
  description?: string;
  invoice_limit?: number; // 0 = unlimited renewals
}

export interface PaystackPlanResponse {
  status: boolean;
  message: string;
  data?: {
    plan_code: string;
    name: string;
    amount: number;
    interval: string;
    integration: number;
    currency: string;
  };
}

export interface SubscriptionData {
  customer: string; // customer code or email
  plan: string; // plan code
  start_date?: string; // ISO 8601 format for future start
  authorization?: string; // authorization code
}

export interface SubscriptionResponse {
  status: boolean;
  message: string;
  data?: {
    subscription_code: string;
    email_token: string;
    customer: {
      id: number;
      customer_code: string;
      email: string;
    };
    plan: {
      id: number;
      plan_code: string;
      name: string;
    };
    next_payment_date: string;
    amount: number;
    status: string;
  };
}

/**
 * Create a subscription plan on Paystack
 */
export const createSubscriptionPlan = async (planData: PaystackPlan): Promise<PaystackPlanResponse> => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/plan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: planData.name,
        amount: planData.amount,
        interval: planData.interval,
        currency: planData.currency || 'NGN',
        description: planData.description || '',
        invoice_limit: planData.invoice_limit || 0
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to create plan'
    };
  }
};

/**
 * Create a subscription for a customer
 */
export const createSubscription = async (subscriptionData: SubscriptionData): Promise<SubscriptionResponse> => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to create subscription'
    };
  }
};

/**
 * Disable a subscription
 */
export const disableSubscription = async (subscriptionCode: string, emailToken: string): Promise<any> => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/subscription/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: subscriptionCode,
        token: emailToken
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error disabling subscription:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to disable subscription'
    };
  }
};

/**
 * Enable a disabled subscription
 */
export const enableSubscription = async (subscriptionCode: string, emailToken: string): Promise<any> => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/subscription/enable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: subscriptionCode,
        token: emailToken
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error enabling subscription:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to enable subscription'
    };
  }
};

/**
 * Get subscription details
 */
export const getSubscription = async (subscriptionCode: string): Promise<any> => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/subscription/${subscriptionCode}`, {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch subscription'
    };
  }
};

/**
 * List all subscriptions for a customer
 */
export const listCustomerSubscriptions = async (customerCode: string, page: number = 1, perPage: number = 50): Promise<any> => {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/subscription?customer=${customerCode}&perPage=${perPage}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to list subscriptions'
    };
  }
};

/**
 * Get payment history for a customer
 */
export const getPaymentHistory = async (customerCode: string, page: number = 1, perPage: number = 50): Promise<any> => {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction?customer=${customerCode}&perPage=${perPage}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const result = await response.json();

    if (result.status) {
      // Filter for subscription payments only
      const subscriptionPayments = result.data.filter((tx: any) =>
        tx.plan || tx.metadata?.plan || tx.metadata?.subscription
      );

      return {
        status: true,
        data: subscriptionPayments.map((tx: any) => ({
          reference: tx.reference,
          amount: tx.amount / 100, // Convert from kobo to naira
          status: tx.status,
          paidAt: tx.paid_at,
          plan: tx.plan?.name || tx.metadata?.plan || tx.metadata?.planName,
          subscriptionCode: tx.subscription?.subscription_code,
          channel: tx.channel,
          customerEmail: tx.customer?.email
        })),
        meta: result.meta
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch payment history'
    };
  }
};

/**
 * Map plan names to Paystack plan codes
 * In production, these should be stored in environment variables or Firestore
 */
export const PLAN_CODES: Record<string, string> = {
  trial: '', // No plan code for trial
  basic: import.meta.env.VITE_PAYSTACK_BASIC_PLAN_CODE || '',
  pro: import.meta.env.VITE_PAYSTACK_PRO_PLAN_CODE || '',
  enterprise: import.meta.env.VITE_PAYSTACK_ENTERPRISE_PLAN_CODE || ''
};

/**
 * Get plan code by plan name
 */
export const getPlanCode = (planName: string): string => {
  return PLAN_CODES[planName.toLowerCase()] || '';
};
