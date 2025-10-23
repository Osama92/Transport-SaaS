# Migration: Add Wallet Balance to Existing Drivers

## Issue
Existing drivers in Firestore don't have the `walletBalance` field, causing the driver portal to show ₦0.

## Quick Fix - Run in Browser Console

1. Log in to your app as a Partner user
2. Open the browser console (F12 → Console tab)
3. Copy and paste this code:

```javascript
// Import Firestore functions
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/firebaseConfig';

// Update John Doe's driver record
const driverId = 'DRV-20251010-214310-nvf2sj';
const driverRef = doc(db, 'drivers', driverId);

await updateDoc(driverRef, {
    walletBalance: 0,
    updatedAt: serverTimestamp()
});

console.log('✅ Migration complete! John Doe now has walletBalance: 0');
```

## Alternative: Run Migration Function

If you want to migrate ALL drivers in your organization at once:

1. Open browser console in your Partner Dashboard
2. Run this code (replace organizationId with your actual org ID):

```javascript
import { migrateDriversAddWalletBalance } from './services/firestore/drivers';

const organizationId = 'dhayo213@gmail.com'; // Your organization ID
await migrateDriversAddWalletBalance(organizationId);
```

## Permanent Fix

New drivers created after this update will automatically have `walletBalance: 0` initialized.

## To Test Payslips

After migration, you need to:
1. Create a payroll run for the current month
2. Process the payroll run
3. Mark it as "Paid" - this will credit the driver's wallet
4. The payslips will then appear in the driver portal

The wallet balance will update when payroll is marked as paid.
