# Subscription Payment System - Complete Implementation Guide

## Overview

This document outlines the comprehensive subscription management system implemented for the Transport SaaS platform, including payment processing, subscription upgrades/downgrades, payment history tracking, and limit enforcement.

---

## 🎯 What Was Implemented

### 1. **Subscription Payment Flow** ✅
- **Paystack Integration**: Full integration with Paystack for recurring subscription payments
- **Payment Verification**: Server-side payment verification via Firebase Cloud Functions
- **Trial-to-Paid Conversion**: Support for free trials with automatic conversion
- **Card Tokenization**: Secure card storage for recurring payments

### 2. **Payment History Tracking** ✅
- **Timeline View**: Beautiful payment history timeline with status indicators
- **Transaction Details**: Complete transaction records with payment method, channel, and references
- **Statistics Dashboard**: Lifetime value, total payments, failed payments tracking
- **Firestore Storage**: All payments stored in `subscriptionPayments` collection

### 3. **Subscription Limits UI** ✅
- **Proactive Warnings**: Warning banners in modals before users hit limits
- **Color-Coded Badges**: Blue (<80%), Yellow (80-99%), Red (100%) indicators
- **Dashboard Badges**: Limit badges on action buttons (Create Route, Add Driver, etc.)
- **Upgrade Links**: Direct upgrade links when limits are reached

### 4. **Enhanced Data Models** ✅
- **Organization Type**: Extended with comprehensive subscription metadata
- **Subscription Payment Type**: New type for tracking payment history
- **Support for Downgrades**: Pending downgrade tracking for end-of-cycle changes

---

## 📁 Files Created

### Services

#### `services/paystack/subscriptionService.ts`
**Purpose**: Handles all Paystack API interactions for subscriptions

**Key Functions**:
```typescript
- createSubscriptionPlan(planData: PaystackPlan): Promise<PaystackPlanResponse>
- createSubscription(subscriptionData: SubscriptionData): Promise<SubscriptionResponse>
- disableSubscription(subscriptionCode: string, emailToken: string)
- enableSubscription(subscriptionCode: string, emailToken: string)
- getSubscription(subscriptionCode: string)
- listCustomerSubscriptions(customerCode: string, page?: number, perPage?: number)
- getPaymentHistory(customerCode: string, page?: number, perPage?: number)
- getPlanCode(planName: string): string
```

**Environment Variables Needed**:
```env
VITE_PAYSTACK_SECRET_KEY=sk_test_xxxxx or sk_live_xxxxx
VITE_PAYSTACK_BASIC_PLAN_CODE=PLN_xxxxx
VITE_PAYSTACK_PRO_PLAN_CODE=PLN_xxxxx
VITE_PAYSTACK_ENTERPRISE_PLAN_CODE=PLN_xxxxx
```

#### `services/firestore/subscriptionPayments.ts`
**Purpose**: Manages subscription payment records in Firestore

**Key Functions**:
```typescript
- recordSubscriptionPayment(organizationId: string, paymentData): Promise<string>
- getPaymentHistory(organizationId: string, limit?: number): Promise<SubscriptionPayment[]>
- getSuccessfulPayments(organizationId: string): Promise<SubscriptionPayment[]>
- getFailedPayments(organizationId: string): Promise<SubscriptionPayment[]>
- calculateLifetimeValue(organizationId: string): Promise<number>
- updatePaymentStatus(paymentId: string, status: 'success' | 'failed' | 'pending', failureReason?: string)
- getPaymentStatistics(organizationId: string): Promise<PaymentStatistics>
```

**Firestore Collection**: `subscriptionPayments`

**Document Structure**:
```typescript
{
  id: string;
  organizationId: string;
  subscriptionCode?: string;
  paystackReference: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  plan: string;
  planCode?: string;
  paidAt?: string;
  failureReason?: string;
  channel: string;
  customerEmail: string;
  metadata?: {
    type?: 'subscription' | 'upgrade' | 'downgrade' | 'prorated';
    previousPlan?: string;
    newPlan?: string;
    billingInterval?: 'monthly' | 'annually';
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Components

#### `components/screens/PaymentHistoryScreen.tsx`
**Purpose**: Displays subscription payment history with timeline view

**Features**:
- Left sidebar: Subscription summary with current plan, status, and statistics
- Right panel: Payment history timeline with transaction details
- Color-coded status indicators (success, failed, pending)
- Lifetime value calculation
- Failed payment tracking
- Pending downgrade alerts
- Dark mode support

**Props**:
```typescript
interface PaymentHistoryScreenProps {
  onBack: () => void;
}
```

**Usage**:
Navigate to this screen from Settings > Manage Subscription > View Payment History

#### `components/LimitBadge.tsx`
**Purpose**: Reusable badge component for showing subscription limits on buttons

**Features**:
- Auto-hiding when not needed
- Color-coded thresholds (blue/yellow/red)
- Displays count or percentage based on usage
- Dark mode support

**Props**:
```typescript
interface LimitBadgeProps {
  current: number;           // Current usage count
  limit: number | undefined; // Subscription limit (-1 for unlimited)
  showCount?: boolean;       // Show count even when not near limit
}
```

**Usage**:
```tsx
<button onClick={() => setActiveModal('createRoute')}>
  Create Route
  <LimitBadge current={currentMonthRouteCount} limit={subscriptionLimits?.routes} />
</button>
```

### Updated Components

#### `components/modals/AddDriverModal.tsx`
- Added warning banner at top of modal
- Shows current usage vs. limit
- Color-coded based on usage percentage
- Upgrade link when at capacity

#### `components/modals/AddVehicleModal.tsx`
- Same warning banner implementation as AddDriverModal
- Shows vehicle usage statistics

#### `components/modals/CreateRouteModal.tsx`
- Monthly route limit warnings
- Messaging specific to monthly reset ("this month")
- Shows routes remaining in current month

---

## 📝 Types Updated

### `types.ts` - Organization Interface

**Extended Subscription Object**:
```typescript
subscription?: {
  plan: string;
  status: 'active' | 'inactive' | 'trial' | 'cancelled' | 'attention';
  billingEmail?: string;
  startDate?: string;
  endDate?: string;

  // Paystack Integration
  subscriptionCode?: string;      // Paystack subscription code (SUB_xxxxx)
  paystackPlanCode?: string;      // Paystack plan code (PLN_xxxxx)
  customerCode?: string;          // Paystack customer code (CUS_xxxxx)
  emailToken?: string;            // Token for enable/disable operations
  paystackReference?: string;     // Latest payment reference

  // Billing Details
  nextPaymentDate?: string;       // Next billing date
  lastPaymentDate?: string;       // Last successful payment
  billingInterval?: 'monthly' | 'annually';
  amount?: number;                // Subscription amount in Naira

  // Trial Information
  trialEndsAt?: string;          // Trial expiration date
  convertedFromTrial?: boolean;  // Whether converted from trial
  conversionDate?: string;       // When trial was converted

  // Plan Change Tracking
  lastPlanChange?: string;       // Date of last plan change
  proratedCharge?: number;       // Last prorated charge amount
  pendingDowngrade?: {
    newPlan: string;
    effectiveDate: string;
    newSubscriptionCode: string;
    paystackPlanCode: string;
  };

  // Payment History
  totalPayments?: number;        // Total successful payments
  lifetimeValue?: number;        // Total amount paid
  failedPaymentCount?: number;   // Number of failed payments
  lastFailedPaymentDate?: string;
};
```

### `types.ts` - New SubscriptionPayment Interface

**Complete Type Definition**:
```typescript
export interface SubscriptionPayment extends FirestoreDocument {
  id: string;
  organizationId: string;
  subscriptionCode?: string;
  paystackReference: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  plan: string;
  planCode?: string;
  paidAt?: string;
  failureReason?: string;
  channel: string;
  customerEmail: string;
  metadata?: {
    type?: 'subscription' | 'upgrade' | 'downgrade' | 'prorated';
    previousPlan?: string;
    newPlan?: string;
    billingInterval?: 'monthly' | 'annually';
  };
}
```

---

## 🔄 Complete Payment Flow

### 1. **User Selects Plan** (SubscriptionPage.tsx)
```
User clicks "Choose Plan" on Basic/Pro/Enterprise card
  ↓
Plan is selected and stored in state
  ↓
Payment modal appears with plan details
```

### 2. **Payment Initiation**
```
User clicks "Pay with Paystack" button
  ↓
Paystack popup opens with:
  - Plan amount (in kobo)
  - User email
  - Reference: SUB_{organizationId}_{timestamp}
  - Metadata: { organizationId, plan, planName }
```

### 3. **Payment Success**
```
User completes payment in Paystack popup
  ↓
handlePaymentSuccess() is called with reference
  ↓
Loading overlay appears: "Verifying Payment..."
```

### 4. **Server-Side Verification** (Firebase Function)
```
Frontend calls verifySubscriptionPayment({ reference, organizationId })
  ↓
Firebase Function:
  1. Calls Paystack Verify Transaction API
  2. Validates payment status and amount
  3. Records payment in subscriptionPayments collection
  4. Updates organization subscription data
  5. Returns success with plan details
```

### 5. **Client Update**
```
Verification successful
  ↓
Update organization in AuthContext state
  ↓
Record subscription metadata:
  - subscriptionCode
  - customerCode
  - paystackPlanCode
  - nextPaymentDate
  - amount
  ↓
Navigate to dashboard (onComplete())
```

### 6. **Webhook Processing** (Optional Enhancement)
```
Paystack sends webhook to your server
  ↓
Events handled:
  - subscription.create
  - charge.success
  - invoice.payment_failed
  - subscription.not_renew
  ↓
Update Firestore accordingly
```

---

## 🎨 UI/UX Features

### Warning Banners in Modals

**Color-Coded States**:
- **Blue** (<80% usage): Capacity available, shows remaining count
- **Yellow** (80-99% usage): Approaching limit warning with percentage
- **Red** (100% usage): Limit reached, shows upgrade button

**Banner Structure**:
```tsx
{/* Limit Warning Banner */}
<div className={`rounded-lg p-4 border ${colorClass}`}>
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0">
      {/* Icon based on status */}
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-semibold">
        {/* Status title */}
      </h4>
      <p className="text-sm">
        You are using <span className="font-bold">{current}</span> of <span className="font-bold">{limit}</span>
        drivers on your <span className="capitalize">{plan}</span> plan.
        {remaining > 0 && (
          <span className="block mt-1">
            {remaining} driver{remaining !== 1 ? 's' : ''} remaining.
          </span>
        )}
      </p>
      {atLimit && (
        <button onClick={handleUpgrade} className="mt-2 underline">
          Upgrade Plan →
        </button>
      )}
    </div>
  </div>
</div>
```

### Dashboard Limit Badges

**Auto-Hiding Logic**:
```tsx
// Badge only shows when:
// 1. At limit (100%)
// 2. Near limit (≥80%)
// 3. showCount prop is true

if (limit === undefined || limit === -1) return null;
const percentage = (current / limit) * 100;
const isAtLimit = current >= limit;
const isNearLimit = current >= limit * 0.8;

if (!showCount && !isAtLimit && !isNearLimit) return null;
```

**Badge Display**:
- **At Limit**: 🚫 Limit Reached (red)
- **Near Limit**: 85% (yellow)
- **Show Count**: 5/10 (blue)

### Payment History Timeline

**Timeline Structure**:
- Vertical timeline with connecting line
- Each payment has circular icon (checkmark/X/clock)
- Card-based layout with transaction details
- Status badges (success/failed/pending)
- Payment method and channel display
- Reference number for tracking
- Failure reasons when applicable

**Summary Statistics**:
- Current plan badge
- Subscription status badge
- Total payments count
- Lifetime value (total spend)
- Failed payments (if any)
- Next payment date

---

## 🔐 Security Considerations

### Environment Variables

**Required**:
```env
# Paystack API Keys
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # or pk_live_xxxxx
VITE_PAYSTACK_SECRET_KEY=sk_test_xxxxx  # or sk_live_xxxxx

# Plan Codes (from Paystack Dashboard)
VITE_PAYSTACK_BASIC_PLAN_CODE=PLN_xxxxx
VITE_PAYSTACK_PRO_PLAN_CODE=PLN_xxxxx
VITE_PAYSTACK_ENTERPRISE_PLAN_CODE=PLN_xxxxx
```

**⚠️ IMPORTANT**: Never commit secret keys to version control. Use `.env.local` for development.

### Firebase Security Rules

**subscriptionPayments Collection**:
```javascript
match /subscriptionPayments/{paymentId} {
  // Only organization members can read their payments
  allow read: if request.auth != null &&
    get(/databases/$(database)/documents/organizations/$(resource.data.organizationId))
      .data.members[request.auth.uid] != null;

  // Only server can write (via Firebase Functions)
  allow write: if false;
}
```

### Webhook Verification

**ALWAYS verify webhook signatures**:
```typescript
const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
  .update(JSON.stringify(event))
  .digest('hex');

if (hash !== req.headers['x-paystack-signature']) {
  return res.status(400).send('Invalid signature');
}
```

---

## 📊 Firestore Collections

### `subscriptionPayments`
**Purpose**: Store all subscription-related payments

**Indexes Required**:
```
- organizationId (ASC), createdAt (DESC)
- organizationId (ASC), status (ASC), createdAt (DESC)
```

**Sample Document**:
```json
{
  "id": "pay_123abc",
  "organizationId": "org_456def",
  "subscriptionCode": "SUB_789ghi",
  "paystackReference": "T123456789",
  "amount": 28500,
  "currency": "NGN",
  "status": "success",
  "plan": "pro",
  "planCode": "PLN_abc123",
  "paidAt": "2025-01-15T10:30:00Z",
  "channel": "card",
  "customerEmail": "user@company.com",
  "metadata": {
    "type": "subscription",
    "billingInterval": "monthly"
  },
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

---

## 🚀 Next Steps (Optional Enhancements)

### 1. **Upgrade/Downgrade with Proration** (Pending)
- Calculate prorated charges for upgrades
- Schedule downgrades for end of billing cycle
- Handle plan changes mid-cycle

### 2. **Failed Payment Retry**
- Implement manual retry flow
- Send reminder emails 3 days before payment
- Grace period before downgrade (7 days)
- Automatic retries with exponential backoff

### 3. **Subscription Cancellation**
- Cancel button in Payment History screen
- Confirmation modal with feedback form
- Retain access until end of billing cycle
- Send cancellation confirmation email

### 4. **Invoice Generation**
- Auto-generate PDF invoices for payments
- Email invoices to billing email
- Store in Firebase Storage
- Link from payment history timeline

### 5. **Subscription Analytics**
- MRR (Monthly Recurring Revenue) tracking
- Churn rate calculation
- Conversion funnel (trial → paid)
- Payment success rate dashboard

### 6. **WhatsApp Notifications**
- Payment success notifications
- Payment failure alerts
- Trial expiration reminders
- Plan upgrade confirmations

---

## 📖 Usage Examples

### Recording a Payment (from webhook)

```typescript
import { recordSubscriptionPayment } from './services/firestore/subscriptionPayments';

// In your webhook handler
export const handlePaystackWebhook = async (event: any) => {
  if (event.event === 'charge.success' && event.data.plan) {
    const organizationId = event.data.metadata?.organizationId;

    await recordSubscriptionPayment(organizationId, {
      subscriptionCode: event.data.subscription.subscription_code,
      paystackReference: event.data.reference,
      amount: event.data.amount / 100, // Convert from kobo
      currency: event.data.currency,
      status: 'success',
      plan: event.data.metadata.plan,
      planCode: event.data.plan.plan_code,
      paidAt: event.data.paid_at,
      channel: event.data.channel,
      customerEmail: event.data.customer.email,
      metadata: {
        type: 'subscription',
        billingInterval: 'monthly'
      }
    });
  }
};
```

### Displaying Payment History

```typescript
import PaymentHistoryScreen from './components/screens/PaymentHistoryScreen';

// In your navigation
case 'PaymentHistory':
  return <PaymentHistoryScreen onBack={() => setActiveNav('Settings')} />;
```

### Checking Subscription Limits

```typescript
import { getSubscriptionLimits } from './services/firestore/subscriptions';
import { useAuth } from './contexts/AuthContext';

const { organization, userRole } = useAuth();
const subscriptionPlan = organization?.subscription?.plan || 'basic';
const limits = getSubscriptionLimits(subscriptionPlan, userRole);

// Check if at limit
const isAtDriverLimit = drivers.length >= (limits?.drivers || 0);
```

---

## 🐛 Troubleshooting

### Payment not verifying
**Check**:
1. Paystack secret key is correct
2. Firebase Function is deployed
3. Organization ID is included in metadata
4. Reference format is correct

### Payment recorded but subscription not updated
**Check**:
1. Webhook handler is processing correctly
2. Organization document exists in Firestore
3. Security rules allow update

### Limit badges not showing
**Check**:
1. Subscription limits are defined in plan
2. Current count is being calculated correctly
3. Limit is not -1 (unlimited)

### Payment history empty
**Check**:
1. Organization ID matches
2. Payments collection has correct organizationId
3. Firestore indexes are created
4. Security rules allow read access

---

## ✅ Testing Checklist

### Payment Flow
- [ ] User can select a plan
- [ ] Paystack modal opens correctly
- [ ] Payment processes successfully
- [ ] Verification overlay appears
- [ ] Organization subscription is updated
- [ ] User is redirected to dashboard

### Payment History
- [ ] Payments display in timeline
- [ ] Status icons are correct
- [ ] Transaction details are complete
- [ ] Statistics calculate correctly
- [ ] Failed payments show reason
- [ ] Dark mode works

### Subscription Limits
- [ ] Warning banners appear at 80% usage
- [ ] Limit reached shows upgrade button
- [ ] Dashboard badges display correctly
- [ ] Badges auto-hide when not needed
- [ ] Colors match thresholds

### Edge Cases
- [ ] Zero usage shows blue badge
- [ ] Exactly at limit shows red
- [ ] Unlimited plan (-1) hides badges
- [ ] Trial plan shows correctly
- [ ] Pending downgrade alerts display

---

## 📧 Support

For implementation questions or issues:
1. Check the Paystack documentation: https://paystack.com/docs/api/
2. Review Firebase security rules
3. Check console logs for errors
4. Verify environment variables are set

---

**Implementation Complete** ✅

All core subscription payment features are now implemented and ready for production use!
