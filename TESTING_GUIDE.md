# 🧪 Driver Wallet System - Complete Testing Guide

## 🌐 Access URLs

**Server Running:** http://192.168.35.243:3001

### Available Portals:
1. **Admin Portal (Partner):** http://192.168.35.243:3001
2. **Old Driver Portal:** http://192.168.35.243:3001/driver-portal
3. **NEW Wallet Portal:** http://192.168.35.243:3001/driver-wallet ⭐

## ✅ Test Plan - Step by Step

### Phase 1: Create Test Driver (5 min)

1. **Login as Partner Admin**
   ```
   URL: http://192.168.35.243:3001
   Email: (your partner email)
   Password: password123
   ```

2. **Navigate to Team Management**
   - Click "Team Management" in sidebar
   - Click "Add Driver" button

3. **Fill Driver Details**
   ```
   Full Name: Test Driver
   Phone: 08012345678  ← IMPORTANT!
   License Number: TEST123
   NIN: (optional)
   Base Salary: 500000
   Bank Details: (optional for now)
   ```

4. **Submit and Verify**
   - Click "Add Driver"
   - Should see success message
   - **Check Browser Console** for wallet initialization logs:
     ```
     [WALLET] Initializing Paystack wallet for driver DRV-xxxxx...
     [WALLET] Created Paystack customer...
     [WALLET] Created virtual account...
     [WALLET] Wallet initialization complete
     ```

5. **Check Firestore**
   - Open Firebase Console → Firestore
   - Find driver document (DRV-xxxxx)
   - Verify fields:
     ```javascript
     {
       phone: "+2348012345678",  ✅ Formatted
       walletBalance: 0,          ✅ Initialized
       walletCurrency: "NGN",     ✅ Set
       phoneVerified: false,      ✅ Not verified yet
       portalAccess: {
         enabled: true,
         whatsappNotifications: true
       },
       transactionLimits: {
         dailyWithdrawalLimit: 50000,
         singleTransactionLimit: 20000,
         monthlyWithdrawalLimit: 500000
       }
     }
     ```

---

### Phase 2: Test Phone Login (3 min)

1. **Open New Wallet Portal**
   ```
   URL: http://192.168.35.243:3001/driver-wallet
   ```

2. **Enter Phone Number**
   - Should see beautiful gradient login screen
   - Enter: `08012345678`
   - Click "Continue"

3. **Check SMS (or use test OTP)**
   - **With Termii API configured:** Check phone for SMS
   - **Test Mode:** Console will show: "Test mode: OTP is 123456"
   - **Browser Console:** Look for:
     ```
     Initializing payment with config: {...}
     ```

4. **Enter OTP**
   - Enter the 6-digit code (or `123456` for test mode)
   - Should auto-focus between digits
   - Try pasting: Copy `123456` and paste in first box

5. **Verify Login Success**
   - Should redirect to dashboard
   - **Check Console:** No errors
   - **Check localStorage:** `driverSession` key exists

---

### Phase 3: Test Wallet Display (2 min)

1. **Verify Dashboard Elements**
   ```
   ✅ Header with driver name
   ✅ Logout button
   ✅ Wallet card (gradient purple/pink)
   ✅ Balance showing ₦0
   ✅ "Show" button for virtual account
   ✅ Stats grid (4 cards)
   ✅ Quick Actions section
   ✅ Recent Activity area
   ```

2. **Test Virtual Account Display**
   - Click "Show" on wallet card
   - Should expand to show:
     ```
     Account Number: (if Paystack created it)
     Bank Name: Wema Bank
     Copy button
     Info message
     ```
   - Click copy button
   - Should see checkmark (copied!)

3. **Test Quick Actions**
   - **Withdraw button:** Should be disabled (₦0 balance)
   - **History button:** Should be clickable
   - **Support & Settings:** Should be clickable

---

### Phase 4: Test Transaction History (2 min)

1. **Open Transaction History**
   - Click "History" in wallet card OR quick actions
   - Should open modal

2. **Verify Empty State**
   ```
   ✅ Modal header "Transaction History"
   ✅ Filter tabs: All, Money In, Money Out
   ✅ Empty state with icon
   ✅ Message: "No transactions yet"
   ✅ Close button works
   ```

3. **Test Filters**
   - Click "Money In" tab
   - Click "Money Out" tab
   - Click "All" tab
   - All should show empty state

---

### Phase 5: Test Withdrawal (Manual Balance Credit) (5 min)

1. **Manually Credit Wallet in Firestore**
   - Go to Firebase Console → Firestore
   - Find your driver document
   - Edit `walletBalance` field
   - Change from `0` to `10000`
   - Save

2. **Refresh Driver Dashboard**
   - Press F5 or reload page
   - Login again if needed
   - Balance should show: **₦10,000**

3. **Test Withdrawal Button**
   - Should now be ENABLED
   - Click "Withdraw" button
   - Modal should open

4. **Test Amount Entry**
   - Enter amount: `5000`
   - Click quick amount: `₦5,000`
   - Enter amount: `100` (below minimum)
   - Should show error: "Minimum ₦100"

5. **Test Validation**
   - Enter: `60000` (exceeds daily limit)
   - Click Continue
   - Should show: "Exceeds daily limit..."
   - Enter: `5000` (valid)
   - Click Continue

6. **Test Confirmation Screen**
   ```
   ✅ Shows amount: ₦5,000
   ✅ Shows bank details (if set)
   ✅ Shows warning message
   ✅ Back button works
   ✅ Confirm button exists
   ```

7. **Test Withdrawal Process**
   - Click "Confirm Withdrawal"
   - Should show "Processing..." screen
   - **Expected:** Will fail if Paystack not fully configured
   - **Console:** Check for Paystack API errors
   - This is OK in test mode!

---

### Phase 6: Test Transaction Creation (3 min)

1. **Manually Create Transaction**
   - Go to Firebase Console → Firestore
   - Create new document in `walletTransactions` collection
   - Use this data:
     ```javascript
     {
       driverId: "DRV-xxxxx",  // Your driver ID
       organizationId: "your-org-id",
       type: "credit",
       amount: 10000,
       currency: "NGN",
       balanceBefore: 0,
       balanceAfter: 10000,
       status: "success",
       reference: "TXN_TEST_001",
       description: "Test wallet funding",
       paymentMethod: "paystack",
       createdAt: (current timestamp),
       updatedAt: (current timestamp)
     }
     ```

2. **Refresh & View History**
   - Go back to driver dashboard
   - Click "History"
   - Should see your transaction!

3. **Verify Transaction Display**
   ```
   ✅ Green arrow icon (credit)
   ✅ Amount: +₦10,000 (green)
   ✅ Description
   ✅ Date/time
   ✅ Status badge: "success"
   ✅ Balance shown
   ✅ Reference number
   ```

4. **Test Filters Again**
   - Click "Money In" → Should show transaction
   - Click "Money Out" → Should be empty
   - Click "All" → Should show transaction

---

### Phase 7: Verify Integration (2 min)

1. **Check Phone Validation**
   - Logout from driver portal
   - Try login with: `0801234567` (10 digits)
   - Should format to: `+2348012345678`
   - Try: `+2348012345678` (already formatted)
   - Should work!

2. **Check OTP Resend**
   - Login again
   - Click "Didn't receive code? Resend"
   - Should see alert: "OTP has been resent"
   - In test mode, console shows new pinId

3. **Check Session Persistence**
   - Login successfully
   - Close tab
   - Open: http://192.168.35.243:3001/driver-wallet
   - Should go straight to dashboard (session saved!)

4. **Check Logout**
   - Click "Logout" button
   - Should return to login screen
   - Try accessing dashboard directly
   - Should redirect to login

---

## 🐛 Common Issues & Fixes

### Issue: "Phone number validation failed"
**Fix:** Ensure format is Nigerian: 0801234567 or +2348012345678

### Issue: "OTP not sending"
**Solution:** Use test OTP: `123456` (when Termii not configured)

### Issue: "Wallet not created"
**Check:**
1. Browser console for [WALLET] logs
2. Firestore for driver document
3. Paystack test API keys in .env

### Issue: "Virtual account not showing"
**Reason:** Paystack test mode may not create real DVAs
**Solution:** Check `paystack.virtualAccountNumber` in Firestore

### Issue: "Withdrawal fails"
**Expected:** Will fail without bank details or in test mode
**Check:**
1. Driver has bank info
2. Paystack recipientCode exists
3. Console for specific error

### Issue: "Transaction history empty"
**Fix:** Manually create transaction in Firestore (see Phase 6)

---

## ✅ Test Checklist

### Authentication ✓
- [ ] Phone number validation works
- [ ] OTP sent successfully
- [ ] OTP verification works
- [ ] Test OTP (123456) works
- [ ] Session persists after refresh
- [ ] Logout works properly

### Wallet Display ✓
- [ ] Balance shows correctly
- [ ] Virtual account displays (if created)
- [ ] Copy account number works
- [ ] Transaction limits visible
- [ ] Stats grid displays
- [ ] Quick actions work

### Transaction History ✓
- [ ] Modal opens/closes
- [ ] Filters work (All/In/Out)
- [ ] Transactions display correctly
- [ ] Status badges show
- [ ] Empty state shows when no txns

### Withdrawal Flow ✓
- [ ] Button disabled at ₦0
- [ ] Button enabled with balance
- [ ] Amount validation works
- [ ] Limit checking works
- [ ] Preset amounts work
- [ ] Confirmation screen shows
- [ ] Back button works

### Integration ✓
- [ ] Driver creation adds wallet
- [ ] Phone formatted correctly
- [ ] Firestore structure correct
- [ ] Console shows no errors
- [ ] HMR updates work

---

## 📊 Expected Results Summary

### When Everything Works:

1. **Driver Creation:**
   ```
   ✅ Driver created in Firestore
   ✅ Phone formatted: +234XXXXXXXXXX
   ✅ Wallet initialized: ₦0
   ✅ Transaction limits set
   ✅ [WALLET] logs in console
   ✅ (Paystack customer created if API configured)
   ```

2. **Phone Login:**
   ```
   ✅ Login screen loads
   ✅ Phone validation passes
   ✅ OTP sent (or test mode activated)
   ✅ OTP verification succeeds
   ✅ Dashboard loads with driver data
   ```

3. **Wallet Display:**
   ```
   ✅ Balance: ₦0 (or credited amount)
   ✅ Virtual account details (if Paystack configured)
   ✅ Transaction limits shown
   ✅ Quick actions functional
   ✅ Stats display correctly
   ```

4. **Transaction History:**
   ```
   ✅ Opens smoothly
   ✅ Shows transactions (if any)
   ✅ Filters work correctly
   ✅ Empty state looks good
   ✅ Can close modal
   ```

5. **Withdrawal:**
   ```
   ✅ Validation works
   ✅ Limits enforced
   ✅ Confirmation screen shows
   ✅ (Transfer fails gracefully in test mode)
   ✅ Error messages clear
   ```

---

## 🚀 Next Steps After Testing

1. **If all tests pass:**
   - System is ready for Paystack verification
   - Can onboard real drivers
   - Need webhook setup for auto-crediting

2. **If issues found:**
   - Check browser console
   - Check Firestore data
   - Check .env configuration
   - Review error messages

3. **For Production:**
   - Complete Paystack verification
   - Get live API keys
   - Set up webhook endpoint
   - Enable bank verification
   - Add KYC flow

---

## 📝 Test Results Template

Copy and fill this out:

```
## Test Results - [Date]

### Phase 1: Driver Creation
- Phone validation: ✅/❌
- Wallet initialization: ✅/❌
- Firestore data: ✅/❌
- Console logs: ✅/❌

### Phase 2: Phone Login
- Login screen: ✅/❌
- Phone entry: ✅/❌
- OTP sending: ✅/❌
- OTP verification: ✅/❌
- Dashboard access: ✅/❌

### Phase 3: Wallet Display
- Balance display: ✅/❌
- Virtual account: ✅/❌
- Stats grid: ✅/❌
- Quick actions: ✅/❌

### Phase 4: Transaction History
- Modal opens: ✅/❌
- Filters work: ✅/❌
- Empty state: ✅/❌

### Phase 5: Withdrawal
- Button states: ✅/❌
- Amount validation: ✅/❌
- Limit checking: ✅/❌
- Confirmation: ✅/❌

### Phase 6: Transactions
- Manual creation: ✅/❌
- Display: ✅/❌
- Details: ✅/❌

### Phase 7: Integration
- Session persist: ✅/❌
- Logout: ✅/❌
- Format handling: ✅/❌

### Issues Found:
1.
2.
3.

### Notes:
-
-
-
```

---

**Ready to test? Start with Phase 1! 🚀**

Access the wallet portal at: **http://192.168.35.243:3001/driver-wallet**
