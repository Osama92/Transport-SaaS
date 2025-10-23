# Driver Wallet Test Mode

## 🚀 Current Status: TEST MODE ACTIVE

The driver wallet system is currently running in **TEST MODE** to bypass CORS restrictions and allow immediate testing of all features.

## ⚠️ Why Test Mode?

**CORS Issue**: Termii SMS API does not allow direct browser-based API calls. When we tried to call their API from the frontend, we got:

```
Access to XMLHttpRequest at 'https://api.ng.termii.com/api/sms/otp/send'
has been blocked by CORS policy
```

**Solution**: Test mode allows you to test the complete wallet flow without needing a backend server immediately.

## 🔐 Test Mode Credentials

### Test OTP Code
```
123456
```

Use this code for ALL OTP verifications during testing.

### Test Driver Phone Numbers
From your Firestore database:

**John Doe**
- Phone: `07031167360`
- Alternative formats will be tried automatically:
  - `+2347031167360`
  - `2347031167360`
  - `07031167360`

## 📱 Complete Testing Flow

### Phase 1: Login Testing

1. **Navigate to Driver Wallet**
   ```
   http://192.168.35.243:3001/driver-wallet
   ```

2. **Enter Phone Number**
   - Use: `07031167360` (or any driver phone from your database)
   - System will try multiple format variations automatically

3. **Request OTP**
   - Click "Send OTP"
   - Console will show: `⚠️ TERMII TEST MODE ACTIVE`
   - Message will display: `✅ TEST MODE: OTP sent successfully. Use code: 123456`

4. **Enter OTP**
   - Use code: `123456`
   - Click "Verify & Login"
   - Console will show verification logs
   - Should successfully log in to wallet dashboard

### Phase 2: Wallet Display Testing

After successful login, verify:

1. **Wallet Card**
   - ✅ Displays driver name
   - ✅ Shows current balance (₦0.00 initially)
   - ✅ Shows "Fund Wallet" button
   - ✅ Shows virtual account details (bank name, account number, account name)

2. **Virtual Account Info**
   - ✅ Account number is visible
   - ✅ Bank name shown
   - ✅ Account name matches format: "TransportCo - [Driver Name]"

### Phase 3: Transaction History Testing

1. **Empty State**
   - ✅ Shows "No transactions yet" when wallet is empty
   - ✅ Displays helpful message

2. **Create Test Transaction** (via Partner Dashboard)
   - Go to Partner Dashboard → Drivers
   - Select John Doe → "Manage Wallet"
   - Add a test transaction (credit or debit)
   - Return to driver wallet
   - ✅ Transaction appears in history
   - ✅ Shows correct amount, type, date, status

### Phase 4: Withdrawal Testing

1. **Open Withdrawal Modal**
   - Click "Withdraw Funds" button
   - ✅ Modal opens with form

2. **Test Validation**
   - Try withdrawing more than balance
   - ✅ Should show error: "Insufficient balance"
   - Try amount below minimum (₦100)
   - ✅ Should show error: "Minimum withdrawal is ₦100"

3. **Valid Withdrawal Request**
   - Fund wallet first (via Partner Dashboard)
   - Enter valid amount
   - Enter bank details
   - Submit request
   - ✅ Should create withdrawal transaction (pending)
   - ✅ Balance should update immediately
   - ✅ Transaction shows in history as "Pending"

### Phase 5: Real-time Updates Testing

1. **Keep Driver Wallet Open**
2. **In Partner Dashboard** (different browser tab):
   - Credit John Doe's wallet with ₦1,000
3. **Check Driver Wallet**
   - ✅ Balance should update automatically
   - ✅ New transaction appears in history
   - (Firestore real-time listener working)

### Phase 6: Mobile Responsiveness

Test on mobile device or narrow browser:
1. Navigate to `http://192.168.35.243:3001/driver-wallet` on mobile
2. ✅ Login form responsive
3. ✅ Wallet card readable
4. ✅ Transaction list scrollable
5. ✅ All buttons accessible

## 📊 Console Logs to Watch

During testing, watch browser console for:

```javascript
// OTP Sending
⚠️ TERMII TEST MODE ACTIVE ⚠️
📱 Phone: 2347031167360
🔐 Test OTP: 123456
ℹ️  For production: Deploy Termii calls to Firebase Functions to avoid CORS

// OTP Verification
⚠️ TERMII TEST MODE: Verifying OTP
📱 Phone: 2347031167360
🔐 Entered OTP: 123456
✅ Expected OTP: 123456
✅ TEST MODE: OTP verification successful

// Driver Login
[LOGIN] Searching for driver with phone: {...}
[LOGIN] Try 1 - Formatted (+234...): 1 results
[LOGIN] Driver found: [driver-id]
```

## 🔧 How to Disable Test Mode (For Production)

When you're ready to deploy with real Termii integration:

1. **Option A: Firebase Functions Backend** (Recommended)
   ```typescript
   // In services/termii/termiiService.ts
   const USE_TEST_MODE = false; // Change to false

   // Deploy Firebase Functions to handle Termii API calls
   // Functions bypass CORS restrictions
   ```

2. **Option B: Node.js Backend**
   ```typescript
   // Create Express/Fastify backend
   // Proxy Termii API calls through backend
   // Update termiiService.ts to call your backend instead
   ```

3. **For Now**: Keep test mode enabled for complete system testing

## ✅ What Works in Test Mode

- ✅ Phone number validation
- ✅ OTP sending simulation
- ✅ OTP verification
- ✅ Driver authentication
- ✅ Wallet balance display
- ✅ Virtual account display
- ✅ Transaction history (real Firestore data)
- ✅ Withdrawal validation
- ✅ Real-time balance updates
- ✅ Transaction creation
- ✅ All UI components
- ✅ Mobile responsiveness

## 🚫 What Doesn't Work in Test Mode

- ❌ Real SMS sending (Termii API)
- ❌ Random OTP generation (always 123456)
- ❌ OTP expiry after timeout (still validated)

## 🎯 Testing Checklist

Use this checklist to verify all features:

### Login & Authentication
- [ ] Can enter phone number in multiple formats
- [ ] "Send OTP" button works
- [ ] Receives test OTP message
- [ ] Can enter OTP code
- [ ] OTP verification succeeds with 123456
- [ ] OTP verification fails with wrong code
- [ ] Successfully logs into wallet dashboard

### Wallet Display
- [ ] Driver name shown correctly
- [ ] Current balance displays
- [ ] Virtual account number visible
- [ ] Bank name shown
- [ ] Account name correct format
- [ ] "Fund Wallet" button visible
- [ ] "Withdraw Funds" button visible

### Transaction History
- [ ] Empty state shows when no transactions
- [ ] Transactions load from Firestore
- [ ] Credit transactions show with green badge
- [ ] Debit transactions show with red badge
- [ ] Pending transactions show with yellow badge
- [ ] Date formatting correct
- [ ] Amount formatting correct (₦)

### Withdrawal Flow
- [ ] Withdrawal modal opens
- [ ] Form validation works (minimum, maximum)
- [ ] Insufficient balance error shows
- [ ] Valid withdrawal creates transaction
- [ ] Balance updates after withdrawal
- [ ] Transaction appears in history
- [ ] Transaction status is "Pending"

### Real-time Updates
- [ ] Balance updates when credit added (Partner Dashboard)
- [ ] New transactions appear automatically
- [ ] No page refresh needed

### Mobile Experience
- [ ] Login form works on mobile
- [ ] Wallet card readable on small screen
- [ ] Transaction list scrollable
- [ ] Buttons easy to tap
- [ ] No horizontal scrolling

## 🎉 Ready to Test!

The system is now ready for complete end-to-end testing. Use the test OTP `123456` for all login attempts.

Access the driver wallet portal at:
```
http://192.168.35.243:3001/driver-wallet
```

Test with any driver phone number from your Firestore database. The system will automatically try multiple phone format variations.

## 📝 Report Issues

If you encounter any issues during testing:

1. **Check browser console** for error messages
2. **Note the exact step** where the issue occurred
3. **Check Firestore** to verify data was saved correctly
4. **Take screenshots** if UI issues
5. **Share console logs** for debugging

---

**Note**: This test mode is specifically designed to allow comprehensive testing without backend infrastructure. For production deployment with real SMS sending, you'll need to move Termii API calls to Firebase Functions or a backend server.
