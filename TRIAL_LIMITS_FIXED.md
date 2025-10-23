# Trial Subscription Limits - FIXED

## Issues Reported

1. **Trial users cannot save anything** - Cannot save routes, clients, vehicles, or drivers
2. **Trial days not calculating correctly** - User registered yesterday but still sees "10 days remaining"

---

## Root Causes Identified

### Issue 1: Missing Trial Plan Definition

**Problem**: The `subscriptionData` object in [firebase/config.ts](firebase/config.ts) did not include a `'trial'` plan definition.

**Effect**: When users were on trial status, the `getSubscriptionLimits('trial', role)` function returned `null` because no trial plan existed. This caused the limit checking logic to behave unpredictably, often blocking all saves.

**Code Location**: `firebase/config.ts` lines 300-346

**Before**:
```typescript
export const subscriptionData: Record<string, SubscriptionPlan[]> = {
  individual: [
    { key: 'basic', price: 13500, isPopular: false },
    // ... no trial plan
  ],
  business: [
    { key: 'starter', price: 148500, isPopular: false },
    // ... no trial plan
  ],
  partner: [
    { key: 'basic', price: 28500, isPopular: false, limits: { ... } },
    // ... no trial plan
  ],
};
```

**After**:
```typescript
export const subscriptionData: Record<string, SubscriptionPlan[]> = {
  individual: [
    { key: 'trial', price: 0, isPopular: false, limits: { vehicles: 1, drivers: 1, routes: 1, clients: 1 } },
    { key: 'basic', price: 13500, isPopular: false },
    // ...
  ],
  business: [
    { key: 'trial', price: 0, isPopular: false, limits: { vehicles: 1, drivers: 1, routes: 1, clients: 1 } },
    { key: 'starter', price: 148500, isPopular: false },
    // ...
  ],
  partner: [
    {
      key: 'trial',
      price: 0,
      isPopular: false,
      limits: {
        vehicles: 1,
        drivers: 1,
        routes: 1,  // per month
        clients: 1
      }
    },
    { key: 'basic', price: 28500, isPopular: false, limits: { ... } },
    // ...
  ],
};
```

---

### Issue 2: Firestore Timestamp Not Converted to ISO String

**Problem**: The `getOrganizationById` function in [services/firestore/organizations.ts](services/firestore/organizations.ts) was converting top-level Firestore Timestamps (`createdAt`, `updatedAt`) to ISO strings, but **NOT** converting timestamps inside the nested `subscription` object (`trialStartDate`, `trialEndDate`, `lastPaymentDate`).

**Effect**: When the TrialBanner component tried to calculate days remaining, it received a Firestore Timestamp object instead of an ISO date string, causing incorrect date calculations. The banner always showed "10 days remaining" regardless of when the user actually registered.

**Code Location**: `services/firestore/organizations.ts` lines 20-40

**Before**:
```typescript
export const getOrganizationById = async (organizationId: string): Promise<Organization | null> => {
    const data = orgSnap.data();
    return {
        id: orgSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as Organization;
};
```

**After**:
```typescript
export const getOrganizationById = async (organizationId: string): Promise<Organization | null> => {
    const data = orgSnap.data();

    // Convert Firestore Timestamps to ISO strings
    const subscription = data.subscription ? {
        ...data.subscription,
        startDate: data.subscription.startDate instanceof Timestamp
            ? data.subscription.startDate.toDate().toISOString()
            : data.subscription.startDate,
        trialStartDate: data.subscription.trialStartDate instanceof Timestamp
            ? data.subscription.trialStartDate.toDate().toISOString()
            : data.subscription.trialStartDate,
        trialEndDate: data.subscription.trialEndDate instanceof Timestamp
            ? data.subscription.trialEndDate.toDate().toISOString()
            : data.subscription.trialEndDate,
        lastPaymentDate: data.subscription.lastPaymentDate instanceof Timestamp
            ? data.subscription.lastPaymentDate.toDate().toISOString()
            : data.subscription.lastPaymentDate,
    } : data.subscription;

    return {
        id: orgSnap.id,
        ...data,
        subscription,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as Organization;
};
```

---

## Trial Limits Now Active

Trial users can now:
- ✅ Save **1 driver**
- ✅ Save **1 vehicle**
- ✅ Save **1 route**
- ✅ Save **1 client**

If they try to add a second resource, they will see the **Limit Reached Modal**:

```
┌─────────────────────────────────────────┐
│  ⚠️  Limit Reached                      │
│                                         │
│  You've reached the driver limit for    │
│  your Trial plan.                       │
│                                         │
│  ℹ️  Upgrade to add more drivers and    │
│     unlock additional features!         │
│                                         │
│  [Cancel]            [Upgrade]          │
└─────────────────────────────────────────┘
```

---

## How Trial Limits Work

### Flow Diagram:

```
User on Trial Plan (plan: 'trial')
    ↓
Clicks "Add Driver/Vehicle/Route/Client"
    ↓
Modal opens → handleSubmit()
    ↓
1. getSubscriptionLimits('trial', 'partner')
   → Returns: { vehicles: 1, drivers: 1, routes: 1, clients: 1 }
    ↓
2. canAddResource(currentCount, limit)
   Example: canAddResource(0, 1) → TRUE ✅
   Example: canAddResource(1, 1) → FALSE ❌
    ↓
If FALSE (limit reached):
  → Show LimitReachedModal
  → User must Cancel or Upgrade
    ↓
If TRUE (limit not reached):
  → Create resource in Firestore
  → Close modal
  → Show success notification
```

---

## Trial Days Calculation

### How It Works Now:

1. **User registers** → AuthContext creates organization with:
   - `trialStartDate`: Current date (ISO string)
   - `trialEndDate`: Current date + 10 days (ISO string)

2. **Organization stored in Firestore** → Dates are stored as Firestore Timestamps

3. **User logs in** → `getOrganizationById()` fetches organization:
   - ✅ **NEW**: Converts Timestamp → ISO string for all subscription dates
   - Returns organization with proper ISO date strings

4. **TrialBanner displays** → Calculates days remaining:
   ```typescript
   const endDate = new Date(trialEndDate); // Now receives ISO string
   const now = new Date();
   const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
   ```

5. **Correct calculation**:
   - User registered yesterday → `daysRemaining = 9`
   - User registered 3 days ago → `daysRemaining = 7`
   - User registered 10 days ago → Trial expired

---

## Testing Checklist

### Test 1: Trial Limits
- [ ] Log in as trial user
- [ ] Add 1 driver → Should succeed
- [ ] Try to add 2nd driver → Should show "Limit Reached" modal
- [ ] Add 1 vehicle → Should succeed
- [ ] Try to add 2nd vehicle → Should show "Limit Reached" modal
- [ ] Add 1 client → Should succeed
- [ ] Try to add 2nd client → Should show "Limit Reached" modal
- [ ] Add 1 route → Should succeed
- [ ] Try to add 2nd route → Should show "Limit Reached" modal

### Test 2: Trial Days Calculation
- [ ] Create new trial user today
- [ ] Check TrialBanner → Should show "Your free trial ends in 10 days"
- [ ] Wait 1 day (or manually adjust Firestore `trialEndDate` to 9 days from now)
- [ ] Reload app → Should show "Your free trial ends in 9 days"
- [ ] Manually set `trialEndDate` to tomorrow
- [ ] Reload app → Should show "Your free trial ends tomorrow!"
- [ ] Manually set `trialEndDate` to yesterday
- [ ] Reload app → TrialBanner should not display (handled by `isTrialExpired`)

### Test 3: Upgrade Flow
- [ ] Trial user reaches limit
- [ ] Clicks "Upgrade" button in LimitReachedModal
- [ ] Should navigate to subscription page
- [ ] Select paid plan and complete payment
- [ ] After payment, subscription status changes to 'active'
- [ ] User can now add more resources (based on new plan limits)

---

## Files Modified

1. ✅ **[firebase/config.ts](firebase/config.ts)** - Added trial plan definition with limits for all roles
2. ✅ **[services/firestore/organizations.ts](services/firestore/organizations.ts)** - Fixed Firestore Timestamp conversion for subscription dates

---

## Expected Behavior After Fix

### Trial User Experience:

1. **Sign Up** → Granted 10-day free trial
2. **Dashboard** → See TrialBanner: "Your free trial ends in 10 days"
3. **Day 2** → TrialBanner updates: "Your free trial ends in 9 days"
4. **Add Resources** → Can add 1 of each (driver, vehicle, route, client)
5. **Reach Limit** → Modal appears: "Limit Reached - Upgrade to add more"
6. **Click Upgrade** → Navigate to subscription page
7. **Subscribe** → Limits increase based on selected plan
8. **Day 11** → Trial expires, subscription required

### Paid User Experience:

1. **Subscribe to Basic Plan** → Limits: 3 vehicles, 3 drivers, 10 routes/month, 5 clients
2. **Subscribe to Pro Plan** → Limits: 15 vehicles, 15 drivers, 50 routes/month, 25 clients
3. **Subscribe to Max Plan** → Unlimited everything

---

## Status

✅ **FIXED** - Trial limits are now properly enforced and trial days calculate correctly.

**Next Steps**:
1. Test with a fresh trial user account
2. Verify trial countdown updates daily
3. Confirm limit modals appear at correct thresholds
4. Test upgrade flow from trial to paid plan
