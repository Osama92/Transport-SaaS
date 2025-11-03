/**
 * WhatsApp V2 - Database Schema Types
 *
 * This file defines all TypeScript interfaces for Firestore collections
 * used in WhatsApp onboarding and operations.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

export type OnboardingStep =
  | 'initial'           // Just said hello
  | 'personal_info'     // Collecting name
  | 'company_info'      // Collecting company details
  | 'address'           // Collecting business address
  | 'terms'             // Showing terms & privacy
  | 'pin'               // Setting up PIN
  | 'complete';         // Account created

export interface OnboardingSession {
  phoneNumber: string;
  step: OnboardingStep;
  data: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    fleetSize?: '1-5' | '6-10' | '11-20' | '21-50' | '50+';
    street?: string;
    city?: string;
    state?: string;
    pinHash?: string;
    termsAccepted?: boolean;
    termsAcceptedAt?: Timestamp;
  };
  startedAt: Timestamp;
  currentStepStartedAt: Timestamp;
  expiresAt: Timestamp; // 1 hour from start
  completed: boolean;
  lastMessageId?: string; // Track last WhatsApp message
}

// ============================================================================
// WHATSAPP USER TYPES
// ============================================================================

export interface WhatsAppUser {
  phoneNumber: string;
  userId: string; // Links to Firebase Auth uid
  organizationId: string;
  role: 'partner'; // Start with partner only
  displayName: string;
  firstName: string;
  lastName: string;
  pinHash: string; // Hashed 4-digit PIN
  requirePinForAll: boolean; // If true, require PIN for all actions
  registeredAt: Timestamp;
  registrationMethod: 'whatsapp';
  onboardingCompleted: boolean;
  termsAcceptedAt: Timestamp;
  lastActive: Timestamp;
  preferences: {
    language: 'en' | 'ha' | 'ig' | 'yo'; // English, Hausa, Igbo, Yoruba
    notifications: boolean;
  };
}

// ============================================================================
// SESSION TYPES (For conversation context)
// ============================================================================

export interface WhatsAppSession {
  phoneNumber: string;
  userId: string;
  organizationId: string;
  context: {
    lastAction?: string;
    pendingData?: any;
    conversationState: 'idle' | 'awaiting_input' | 'processing';
    currentFlow?: 'add_driver' | 'add_vehicle' | 'create_route' | 'create_invoice';
    stepIndex?: number;
  };
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
    messageId?: string;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp; // 30 minutes of inactivity
}

// ============================================================================
// SUBSCRIPTION TYPES (Extension of existing Organization)
// ============================================================================

export interface SubscriptionDetails {
  plan: 'trial' | 'partner_monthly' | 'partner_annual';
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'grace_period';

  // Trial
  trialStartDate?: Timestamp;
  trialEndsAt?: Timestamp; // 10 days from start

  // Paid subscription
  startDate?: Timestamp;
  currentPeriodEnd?: Timestamp;

  // Payment
  paymentMethod?: 'card' | 'bank_transfer';
  paystackCustomerId?: string;
  paystackSubscriptionCode?: string;
  lastPaymentDate?: Timestamp;
  nextBillingDate?: Timestamp;
  amount?: number; // Amount in Naira

  // Grace period (3 days after expiry)
  gracePeriodEndsAt?: Timestamp;

  // Tracking
  remindersSent?: {
    trial_day8?: boolean;
    trial_day9?: boolean;
    trial_day10?: boolean;
    renewal_3days?: boolean;
    renewal_1day?: boolean;
  };

  // Cancellation
  cancelledAt?: Timestamp;
  cancellationReason?: string;
  autoRenew?: boolean;
}

// ============================================================================
// PAYMENT TYPES (For manual bank transfers)
// ============================================================================

export interface PaymentRequest {
  id: string; // e.g., "AMANA-ABC123"
  phoneNumber: string;
  userId: string;
  organizationId: string;
  plan: 'partner_monthly' | 'partner_annual';
  amount: number; // In Naira
  method: 'bank_transfer' | 'paystack';
  reference: string; // Unique reference for tracking
  status: 'pending' | 'verified' | 'expired' | 'failed';

  // Bank transfer specific
  proofImageUrl?: string; // Screenshot of payment
  bankTransferDetails?: {
    accountNumber: string;
    accountName: string;
    bank: string;
    transferDate: string;
  };

  // Paystack specific
  paystackReference?: string;
  paystackAccessCode?: string;
  paymentLink?: string;

  createdAt: Timestamp;
  expiresAt: Timestamp; // 24 hours for bank transfer, 30 minutes for Paystack
  verifiedAt?: Timestamp;
  verifiedBy?: string; // Admin uid who verified
  paidAt?: Timestamp;
}

// ============================================================================
// PENDING APPROVALS (For PIN-protected actions)
// ============================================================================

export interface PendingApproval {
  id: string;
  type: 'payroll' | 'wallet_withdrawal' | 'large_payment';
  requesterId: string; // User who initiated action
  requesterPhone: string;
  organizationId: string;
  data: {
    amount?: number;
    description?: string;
    payrollMonth?: string;
    driversCount?: number;
    [key: string]: any;
  };
  status: 'pending_pin' | 'approved' | 'rejected' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp; // 10 minutes
  approvedAt?: Timestamp;
  pinAttempts?: number; // Track failed PIN attempts
}

// ============================================================================
// NOTIFICATION QUEUE
// ============================================================================

export interface WhatsAppNotification {
  id: string;
  phoneNumber: string;
  type: 'trial_reminder' | 'subscription_renewal' | 'payment_success' | 'payment_failed' | 'route_assigned' | 'custom';
  template: string; // Template name
  params: Record<string, any>; // Template parameters
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  scheduledFor?: Timestamp; // For scheduled messages
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  readAt?: Timestamp;
  failureReason?: string;
  messageId?: string; // WhatsApp message ID
  createdAt: Timestamp;
}

// ============================================================================
// ANALYTICS & TRACKING
// ============================================================================

export interface OnboardingAnalytics {
  date: string; // YYYY-MM-DD
  started: number; // Users who started onboarding
  completed: number; // Users who completed
  dropoffs: {
    personal_info: number;
    company_info: number;
    address: number;
    terms: number;
    pin: number;
  };
  averageTimeToComplete: number; // In seconds
  source: Record<string, number>; // e.g., { "referral": 10, "organic": 5 }
}

export interface SubscriptionAnalytics {
  date: string; // YYYY-MM-DD
  newTrials: number;
  trialConversions: number; // Trial → Paid
  trialExpirations: number; // Trials that expired without payment
  renewals: number;
  cancellations: number;
  revenue: number; // Total revenue in Naira
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number; // Percentage
}

// ============================================================================
// WEBHOOK EVENT TYPES
// ============================================================================

export interface WhatsAppWebhookEvent {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<WhatsAppMessage>;
        statuses?: Array<WhatsAppMessageStatus>;
      };
      field: 'messages';
    }>;
  }>;
}

export interface WhatsAppMessage {
  from: string; // Phone number
  id: string; // Message ID
  timestamp: string;
  type: 'text' | 'button' | 'interactive' | 'image' | 'document' | 'audio' | 'video' | 'location';
  text?: {
    body: string;
  };
  button?: {
    text: string;
    payload: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

export interface WhatsAppMessageStatus {
  id: string; // Message ID
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface FirestoreTimestampFields {
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface FirestoreDocument extends FirestoreTimestampFields {
  id: string;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  Timestamp,
  FieldValue,
};
