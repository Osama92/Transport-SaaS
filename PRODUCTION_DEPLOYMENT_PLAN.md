# 🚀 PRODUCTION DEPLOYMENT PLAN - Transport SaaS

## 📊 CURRENT STATUS AUDIT

### ✅ What's Working:
1. **Firebase Authentication** - User signup/login
2. **Firestore Database** - Multi-tenant organization structure
3. **Role-Based Access** - Individual/Business/Partner
4. **Driver Wallet System** - Live with Paystack virtual accounts
5. **Organization Wallet** - Live with Paystack virtual accounts
6. **Firebase Functions** - 4 functions deployed
7. **Webhook** - Configured for wallet payments

### ⚠️ CRITICAL GAPS (Must Fix Before Production):

1. **NO Payment for Subscriptions**
   - Current: Users select plan, gets marked "active" instantly
   - Needed: Pay via Paystack before accessing dashboard

2. **NO Email Verification**
   - Current: Any email works (even fake ones)
   - Risk: Spam accounts, no way to recover accounts
   - Needed: Verify email before onboarding

3. **Missing Firestore Rules**
   - `walletTransactions` - NOT protected
   - `organizationWalletTransactions` - NOT protected
   - Risk: Users can read/write any wallet transaction

4. **No Subscription Webhooks**
   - Can't verify if payment succeeded
   - Can't handle failed/cancelled subscriptions
   - Can't update subscription status automatically

5. **Incomplete Signup Data**
   - Missing: Company Name (for Business/Partner)
   - Missing: Terms of Service acceptance
   - Missing: WhatsApp opt-in for notifications

---

## 🎯 PRODUCTION IMPLEMENTATION PLAN

### PHASE 1: Secure Signup & Email Verification ⏱️ 1 hour

#### 1.1 Update SignUpPage.tsx
- Add Company Name field
- Add Terms of Service checkbox
- Add WhatsApp opt-in checkbox
- Add password strength indicator
- Add email validation

#### 1.2 Update AuthContext.tsx
- Send email verification after signup
- Block onboarding until email verified
- Add `isEmailVerified` check

#### 1.3 Create Email Verification Screen
- Shows message "Check your email"
- Refresh button to check verification status
- Resend verification email option

---

### PHASE 2: Paystack Subscription Payments ⏱️ 2 hours

#### 2.1 Create Subscription Plans in Paystack Dashboard
**Manual Step** - Do this first:
1. Go to: https://dashboard.paystack.com/settings/plans
2. Create plans for each tier:

**Individual Plans:**
- Basic: ₦0/month (Free) - Plan Code: `IND_BASIC`
- Pro: ₦5,000/month - Plan Code: `IND_PRO`
- Premium: ₦10,000/month - Plan Code: `IND_PREMIUM`

**Business Plans:**
- Starter: ₦15,000/month - Plan Code: `BUS_STARTER`
- Growth: ₦30,000/month - Plan Code: `BUS_GROWTH`
- Enterprise: ₦50,000/month - Plan Code: `BUS_ENTERPRISE`

**Partner Plans:**
- Basic: ₦20,000/month - Plan Code: `PARTNER_BASIC`
- Pro: ₦40,000/month - Plan Code: `PARTNER_PRO`
- Enterprise: ₦75,000/month - Plan Code: `PARTNER_ENTERPRISE`

#### 2.2 Update SubscriptionPage.tsx
- Integrate Paystack Popup for payment
- Use `react-paystack` library (already installed!)
- Only proceed to dashboard after successful payment
- Handle payment failures gracefully

#### 2.3 Create Firebase Function: `handleSubscriptionWebhook`
- Listen for Paystack subscription events:
  - `subscription.create` - New subscription paid
  - `subscription.disable` - Subscription cancelled
  - `invoice.payment_failed` - Payment failed
- Update organization subscription status
- Grant/revoke access based on payment

#### 2.4 Configure Paystack Webhook
Add new webhook URL:
```
https://us-central1-glyde-platform.cloudfunctions.net/handleSubscriptionWebhook
```

Events to listen for:
- ✅ `subscription.create`
- ✅ `subscription.disable`
- ✅ `subscription.not_renew`
- ✅ `invoice.create`
- ✅ `invoice.update`
- ✅ `invoice.payment_failed`

---

### PHASE 3: Update Firestore Security Rules ⏱️ 30 minutes

#### 3.1 Add Wallet Transaction Rules
```javascript
// Wallet transactions - driver-scoped
match /walletTransactions/{transactionId} {
  allow read: if isAuthenticated() &&
              resource.data.driverId == request.auth.uid;
  allow create: if isAuthenticated() &&
                request.resource.data.driverId == request.auth.uid;
  // Only Cloud Functions can update status
  allow update: if false;
  allow delete: if false;
}

// Organization wallet transactions
match /organizationWalletTransactions/{transactionId} {
  allow read: if isAuthenticated() &&
              isOrganizationMember(resource.data.organizationId);
  allow create: if isAuthenticated() &&
                requestBelongsToUserOrg();
  allow update: if false; // Only Cloud Functions
  allow delete: if false;
}
```

#### 3.2 Add Subscription Access Check
```javascript
// Helper function to check if organization has active subscription
function hasActiveSubscription(orgId) {
  let org = get(/databases/$(database)/documents/organizations/$(orgId)).data;
  return org.subscription.status == 'active' ||
         org.subscription.status == 'trial';
}

// Update all collections to require active subscription
match /drivers/{driverId} {
  allow read: if belongsToUserOrg() &&
              hasActiveSubscription(getUserOrganization(request.auth.uid));
  // ... etc
}
```

---

### PHASE 4: Firebase Hosting Deployment ⏱️ 30 minutes

#### 4.1 Configure firebase.json
Already configured! Just need to:
```bash
npm run build
firebase deploy --only hosting
```

#### 4.2 Set Custom Domain (Optional)
1. Go to Firebase Console → Hosting
2. Add custom domain: `app.yourcompany.com`
3. Update DNS records as instructed

#### 4.3 Environment Variables
Ensure all prod credentials are set:
- ✅ Paystack Live Keys
- ✅ Firebase Config
- ✅ WhatsApp Token
- ✅ Termii API Key

---

### PHASE 5: Testing Checklist ⏱️ 1 hour

#### 5.1 Signup Flow Test
- [ ] Create account with valid email
- [ ] Receive verification email
- [ ] Click verification link
- [ ] Redirected to role selection
- [ ] Select role (Business)
- [ ] Redirected to subscription page

#### 5.2 Subscription Payment Test
- [ ] Select paid plan (₦15,000 Starter)
- [ ] Paystack popup opens
- [ ] Pay with test card: `5060 6666 6666 6666 6666` CVV: `123` Expiry: `12/28` PIN: `1234`
- [ ] Payment successful → redirected to dashboard
- [ ] Subscription status = "active" in Firestore
- [ ] Webhook received and processed

#### 5.3 Subscription Webhook Test
- [ ] Go to Paystack Dashboard → Webhooks
- [ ] Test `subscription.create` event
- [ ] Check Firebase Functions logs
- [ ] Verify organization subscription updated

#### 5.4 Access Control Test
- [ ] Suspend subscription in Paystack
- [ ] Webhook fires → status = "inactive"
- [ ] User gets logged out / blocked from dashboard
- [ ] Reactivate → access restored

#### 5.5 Wallet Test
- [ ] Organization wallet works
- [ ] Driver wallet works
- [ ] Virtual accounts created
- [ ] Transfers credited automatically

---

## 🔐 SECURITY CHECKLIST

### Before Going Live:
- [ ] All Firestore rules deployed and tested
- [ ] Email verification required
- [ ] Payment required for paid plans
- [ ] Webhook signature verification enabled
- [ ] Environment variables secured (no hardcoded keys)
- [ ] CORS configured for production domain only
- [ ] Rate limiting on Cloud Functions
- [ ] SSL/TLS enabled (automatic with Firebase Hosting)

---

## 💰 PRICING STRUCTURE (FINAL)

### Individual Plans:
- **Basic**: FREE - 5 shipments/month
- **Pro**: ₦5,000/month - 50 shipments/month
- **Premium**: ₦10,000/month - Unlimited

### Business Plans:
- **Starter**: ₦15,000/month - 3 transporters, 20 shipments/month
- **Growth**: ₦30,000/month - 10 transporters, 100 shipments/month
- **Enterprise**: ₦50,000/month - Unlimited

### Partner Plans:
- **Basic**: ₦20,000/month - 5 drivers, 10 vehicles
- **Pro**: ₦40,000/month - 20 drivers, 30 vehicles
- **Enterprise**: ₦75,000/month - Unlimited

---

## 📦 DEPLOYMENT COMMANDS

### 1. Build Frontend
```bash
cd "/home/sir_dan_carter/Desktop/Project Files/Transport-SaaS"
npm run build
```

### 2. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 3. Deploy Functions
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 4. Deploy Hosting
```bash
firebase deploy --only hosting
```

### 5. Deploy Everything
```bash
npm run build
cd functions && npm run build && cd ..
firebase deploy
```

---

## 🌐 PRODUCTION URLs

After deployment:
- **Main App**: `https://glyde-platform.web.app`
- **Custom Domain** (if configured): `https://app.glyde.transport`
- **Driver Portal**: `https://glyde-platform.web.app/driver-wallet`
- **Functions**:
  - Paystack Webhook: `https://us-central1-glyde-platform.cloudfunctions.net/paystackWebhook`
  - Subscription Webhook: `https://us-central1-glyde-platform.cloudfunctions.net/handleSubscriptionWebhook`

---

## 📊 SUCCESS METRICS

After going live, monitor:
1. **Signups per day**
2. **Email verification rate** (should be >90%)
3. **Subscription conversion rate** (should be >30%)
4. **Payment success rate** (should be >95%)
5. **Webhook delivery rate** (should be 100%)
6. **Active users** (logins in last 7 days)
7. **Churn rate** (cancelled subscriptions)

---

## 🆘 ROLLBACK PLAN

If something goes wrong:

```bash
# Rollback to previous deployment
firebase hosting:rollback

# Check previous versions
firebase hosting:versions:list

# Rollback to specific version
firebase hosting:rollback --site glyde-platform --version <version-id>
```

---

## 📞 SUPPORT RESOURCES

- **Paystack Support**: support@paystack.com
- **Firebase Support**: https://firebase.google.com/support
- **Function Logs**: `firebase functions:log`
- **Firestore Console**: https://console.firebase.google.com/project/glyde-platform/firestore

---

## ⏱️ TOTAL ESTIMATED TIME

- **Phase 1** (Email Verification): 1 hour
- **Phase 2** (Subscription Payments): 2 hours
- **Phase 3** (Security Rules): 30 minutes
- **Phase 4** (Hosting Deploy): 30 minutes
- **Phase 5** (Testing): 1 hour

**TOTAL**: ~5 hours for complete production-ready deployment

---

## ✅ READY TO START?

**Next Steps:**
1. Review this plan
2. Confirm pricing structure
3. Create Paystack subscription plans
4. I'll implement Phase 1-5 systematically
5. Deploy to production
6. Test with internal staff

**Let's get this right the first time!** 🚀
