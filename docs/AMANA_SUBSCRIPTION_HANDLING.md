# Amana WhatsApp - Subscription & Trial Expiry Handling

## Trial Period Configuration

**Duration:** 10 days (matching web platform)
**Role:** Partner (Fleet Manager) only
**Features:** Full access during trial

---

## Subscription Expiry Flow (WhatsApp)

### Day 1-7: Silent Trial Period

User has full access, no reminders

### Day 8: First Reminder (2 days before expiry)

```
Amana: "⏰ Trial Reminder

Hi [First Name]! Your 10-day trial ends in 2 days.

To continue using Amana after [Date]:
💰 ₦30,000/month

What you'll keep:
✅ Unlimited drivers & vehicles
✅ Route tracking & optimization
✅ Payroll processing
✅ Invoice generation
✅ Analytics & reports
✅ WhatsApp + Web access

Ready to subscribe?
1️⃣ Pay Monthly (₦30,000)
2️⃣ Pay Yearly (₦300,000 - Save 17%)
3️⃣ Remind me tomorrow

Reply with number or 'subscribe'"

[Button: "💳 Subscribe Now"]
[Button: "⏰ Remind Tomorrow"]
```

### Day 9: Second Reminder (1 day before expiry)

```
Amana: "⚠️ Trial Ends Tomorrow!

Hi [First Name], your trial expires tomorrow at 11:59 PM.

Without subscription, you'll lose access to:
❌ Creating new routes
❌ Adding drivers/vehicles
❌ Processing payroll
❌ Generating invoices

✅ You can still view existing data

SUBSCRIBE NOW:
💳 ₦30,000/month
💳 ₦300,000/year (Save 17%)

Payment methods:
• Paystack (Card, Bank Transfer)
• Direct Bank Transfer

Reply 'pay' to subscribe"

[Button: "💳 Pay Now"]
[Button: "📞 Contact Sales"]
```

### Day 10 Morning: Final Reminder

```
Amana: "🚨 FINAL REMINDER

Your trial ends TODAY at 11:59 PM.

Don't lose access to your fleet management tools!

Quick subscribe:
Reply 'PAY' for payment link

Need help?
Reply 'HELP' to speak with support

- Amana Team"

[Button: "💳 Subscribe Now"]
```

### Day 10 11:59 PM: Trial Expired

```
Amana: "❌ Trial Expired

Hi [First Name], your 10-day trial has ended.

🔒 LIMITED ACCESS MODE:
✅ View drivers, vehicles, routes
✅ Check wallet balance
✅ Download past invoices
❌ Create new routes
❌ Add drivers/vehicles
❌ Process payroll
❌ Generate invoices

TO RESTORE FULL ACCESS:
Reply 'SUBSCRIBE' for payment options

Questions? Reply 'HELP'"

[Button: "💳 Subscribe"]
[Button: "❓ Help"]
```

---

## Post-Expiry Behavior (WhatsApp)

### User Tries to Perform Action (Read-Only Mode)

```
User: "add driver"

Amana: "🔒 Subscription Required

Sorry, adding drivers requires an active subscription.

Your trial ended on [Date].

SUBSCRIBE NOW:
💰 ₦30,000/month - Partner Plan

Includes:
✅ Unlimited fleet management
✅ Payroll & invoices
✅ Analytics & tracking
✅ 24/7 WhatsApp support

Reply 'PAY' to subscribe

[Button: "💳 Subscribe Now"]
[Button: "📋 View Plans"]
```

### User Can Still Query (Read-Only Actions)

```
User: "show drivers"

Amana: "👥 Your Drivers (12):

1. Adebayo O. - Available
2. Chinedu E. - On Route
3. Fatima A. - Available
...

🔒 Trial expired. Subscribe to manage drivers.

Reply 'SUBSCRIBE' to restore full access"

[Button: "💳 Subscribe"]
```

---

## Subscription Payment Flow (WhatsApp)

### Step 1: User Initiates Payment

```
User: "subscribe" OR clicks [Subscribe] button

Amana: "Choose Your Plan

PARTNER - FLEET MANAGER

1️⃣ Monthly Plan
   ₦30,000/month
   • Billed monthly
   • Cancel anytime
   • Full features

2️⃣ Annual Plan (BEST VALUE)
   ₦300,000/year
   • Save ₦60,000 (17%)
   • Billed yearly
   • Full features

Reply with number (1 or 2)"

[Button: "1️⃣ Monthly"]
[Button: "2️⃣ Annual"]
```

### Step 2: Payment Method Selection

```
User: "1" (Monthly)

Amana: "💳 Payment Method

Total: ₦30,000/month

Choose payment method:

1️⃣ Pay with Card (Paystack)
   • Instant activation
   • Secure payment
   • Card/Bank Transfer

2️⃣ Bank Transfer (Manual)
   • Send proof
   • 1-2 hour verification
   • Bank details provided

Reply with number"

[Button: "💳 Card Payment"]
[Button: "🏦 Bank Transfer"]
```

### Step 3A: Paystack Payment (Instant)

```
User: "1" (Card payment)

Amana: "💳 Complete Payment

Click the link below to pay ₦30,000:

🔗 https://paystack.com/pay/amana-[reference]

✅ Secure Paystack checkout
✅ Pay with card or bank transfer
✅ Instant activation

After payment, return here and type 'DONE'

Payment valid for 30 minutes.

[Button: "🔗 Pay Now"]
[Button: "❌ Cancel"]
```

[User completes Paystack payment]

```
Amana: "🎉 PAYMENT SUCCESSFUL!

✅ Subscription activated!

Plan: Partner Monthly
Amount: ₦30,000
Next billing: [Date + 30 days]

Your account now has:
✅ Unlimited drivers & vehicles
✅ Full route management
✅ Payroll processing
✅ Invoice generation
✅ Analytics & reports

Receipt sent to +234XXX and email.

What would you like to do?
• 'add driver'
• 'create route'
• 'check wallet'

[Button: "🚗 Add Driver"]
[Button: "📍 Create Route"]
```

### Step 3B: Bank Transfer (Manual)

```
User: "2" (Bank transfer)

Amana: "🏦 Bank Transfer Details

ACCOUNT DETAILS:
Bank: GTBank
Account Name: Amana Technologies Ltd
Account Number: 0123456789
Amount: ₦30,000

IMPORTANT:
Use this reference in narration:
REF: AMANA-[unique-id]

After transfer:
1. Send payment screenshot here
2. We'll verify (1-2 hours)
3. Account activated automatically

Transfer expires in 24 hours.

[Button: "📸 Send Proof"]
[Button: "❌ Cancel"]
```

[User sends screenshot]

```
Amana: "📸 Screenshot Received!

We're verifying your payment of ₦30,000.

⏱️ Verification takes 1-2 hours (faster during business hours)

You'll receive confirmation once verified.

Check status: Type 'payment status'

Reference: AMANA-[unique-id]"
```

[After verification]

```
Amana: "✅ PAYMENT VERIFIED!

Your subscription is now active!

Plan: Partner Monthly
Amount: ₦30,000 paid
Next billing: [Date + 30 days]

Full access restored! 🎉

Ready to continue where you left off?

[Button: "🚗 Add Driver"]
[Button: "📍 Create Route"]
[Button: "💰 Check Wallet"]
```

---

## Subscription Renewal Reminders

### 3 Days Before Renewal

```
Amana: "⏰ Subscription Renewal

Hi [First Name]!

Your subscription renews in 3 days.

Renewal Date: [Date]
Amount: ₦30,000
Payment Method: [Card ending 1234]

✅ Auto-renewal enabled

To update payment method or cancel:
Type 'manage subscription'

[Button: "💳 Update Payment"]
[Button: "📋 Manage"]
```

### Renewal Failed

```
Amana: "⚠️ Payment Failed

We couldn't charge ₦30,000 to your card.

Reason: [Insufficient funds / Card expired]

Your subscription expires in 24 hours.

TO AVOID SERVICE INTERRUPTION:
1️⃣ Update payment method
2️⃣ Pay manually

Reply 'UPDATE CARD' or 'PAY NOW'

[Button: "💳 Update Card"]
[Button: "💰 Pay Now"]
```

### Subscription Cancelled (After Failed Payment)

```
Amana: "❌ Subscription Cancelled

Your subscription was cancelled due to payment failure.

You now have LIMITED ACCESS:
✅ View existing data
❌ Create new routes
❌ Add drivers/vehicles
❌ Process payroll

TO REACTIVATE:
Reply 'RESUBSCRIBE'

All your data is safe and will be restored upon reactivation.

[Button: "💳 Resubscribe"]
[Button: "❓ Help"]
```

---

## Grace Period (Optional - Recommended)

### 3-Day Grace Period After Expiry

```
Day 1 After Expiry:
"⚠️ Subscription Expired

Your subscription expired yesterday, but you still have 3 days grace period with full access.

Renew now to avoid interruption:
Reply 'RENEW'"

Day 2 of Grace:
"⚠️ 2 Days Left

Grace period ends in 2 days. Renew to keep access."

Day 3 of Grace (Final):
"🚨 FINAL DAY

Grace period ends tonight at 11:59 PM.
Renew now to avoid losing access."

After Grace Period:
[Switch to Limited Access Mode]
```

---

## Subscription Management Commands

User can type these anytime:

| Command | Action |
|---------|--------|
| `subscription` | Show current plan details |
| `upgrade` | Upgrade to annual |
| `downgrade` | Switch to monthly |
| `cancel` | Cancel auto-renewal |
| `renew` | Renew subscription |
| `payment history` | Show past payments |
| `receipt` | Get latest receipt |

### Example: Check Subscription Status

```
User: "subscription"

Amana: "📋 Your Subscription

Plan: Partner Monthly
Status: ✅ Active
Billing: ₦30,000/month
Next renewal: Jan 15, 2025
Payment method: Card •••• 1234

Features:
✅ Unlimited drivers & vehicles
✅ Route management
✅ Payroll processing
✅ Invoice generation
✅ Analytics

Manage:
• 'upgrade' - Switch to annual
• 'update card' - Change payment
• 'cancel' - Stop auto-renewal
• 'receipt' - Download invoice

[Button: "💳 Update Card"]
[Button: "⬆️ Upgrade"]
[Button: "❌ Cancel"]"
```

---

## Implementation Strategy

### Database Schema Updates

```typescript
// organizations collection
{
  subscription: {
    plan: "partner_monthly" | "partner_annual" | "trial",
    status: "active" | "trial" | "expired" | "cancelled" | "grace_period",

    // Trial
    trialStartDate: Timestamp,
    trialEndsAt: Timestamp, // 10 days from start

    // Paid subscription
    startDate: Timestamp,
    currentPeriodEnd: Timestamp,

    // Payment
    paymentMethod: "card" | "bank_transfer",
    paystackCustomerId?: string,
    lastPaymentDate?: Timestamp,
    nextBillingDate?: Timestamp,

    // Grace period
    gracePeriodEndsAt?: Timestamp, // 3 days after expiry

    // Tracking
    remindersSent: {
      day8: boolean,
      day9: boolean,
      day10: boolean,
      renewal3Days: boolean
    }
  }
}

// whatsapp_payment_requests (for bank transfers)
{
  id: "AMANA-ABC123",
  phoneNumber: "+2348012345678",
  organizationId: "org-abc-123",
  plan: "partner_monthly",
  amount: 30000,
  method: "bank_transfer",
  reference: "AMANA-ABC123",
  status: "pending" | "verified" | "expired",
  proofImageUrl?: string,
  createdAt: Timestamp,
  expiresAt: Timestamp, // 24 hours
  verifiedAt?: Timestamp,
  verifiedBy?: string // Admin user who verified
}
```

### Cloud Functions Needed

```typescript
// 1. Trial expiry checker (runs daily)
exports.checkTrialExpiry = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    // Find orgs with trials expiring in 2, 1, 0 days
    // Send WhatsApp reminders
  });

// 2. Subscription renewal checker (runs daily)
exports.checkSubscriptionRenewal = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    // Find subscriptions expiring in 3 days
    // Send renewal reminders
  });

// 3. Paystack webhook (instant payment verification)
exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
  // Verify payment signature
  // Update subscription status
  // Send confirmation WhatsApp message
});

// 4. Verify manual bank transfer (called by admin)
exports.verifyBankTransfer = functions.https.onCall(async (data, context) => {
  // Admin verifies screenshot
  // Update subscription
  // Send confirmation to user
});
```

---

## Recommendation: Grace Period Strategy

I recommend **3-day grace period** after trial ends:

✅ **Pros:**
- Gives users buffer to pay
- Reduces churn (users forget, then remember)
- Maintains good user experience
- Common in SaaS industry

⚠️ **Cons:**
- Some users exploit it (13 days free instead of 10)
- Delays revenue collection

**Solution:** Grace period for first expiry only (trial → paid). No grace for monthly renewals.

---

## Pricing Reminder

**Partner Plan:**
- Monthly: ₦30,000/month
- Annual: ₦300,000/year (saves ₦60,000)

**Payment Methods:**
1. Paystack (instant) - Card, Bank Transfer, USSD
2. Manual Bank Transfer (1-2 hour verification)

---

## Questions for You:

1. **Grace period?** 3 days after trial expires?
2. **Payment methods?** Paystack + Manual bank transfer?
3. **Auto-renewal?** Default ON or OFF?
4. **Failed payment retry?** How many times before cancelling?

Ready to start building the database schema and webhook? 🚀