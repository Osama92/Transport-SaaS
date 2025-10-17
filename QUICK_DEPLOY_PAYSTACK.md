# ⚡ Quick Deploy - Paystack Live

## 5-Minute Deployment

Open PowerShell **as Administrator**:

```powershell
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Navigate to project
cd "c:\Users\Admin\Downloads\Transport SaaS"

# 4. Install dependencies
cd functions
npm install
npm run build
cd ..

# 5. Configure Paystack
firebase functions:config:set paystack.secret="sk_live_YOUR_SECRET_KEY_HERE"

# 6. Deploy
firebase deploy --only functions
```

## Save These URLs

After deployment, you'll get:

```
✔ functions[paystackWebhook]
  https://us-central1-glyde-platform.cloudfunctions.net/paystackWebhook
```

**Copy this URL!** You need it for Paystack webhook.

## Configure Paystack (2 minutes)

1. Go to: https://dashboard.paystack.com/settings/webhooks
2. Add webhook URL (from above)
3. Select events: `charge.success`, `transfer.success`, `transfer.failed`, `transfer.reversed`
4. Save

## Test (3 minutes)

```bash
# 1. Login as driver
http://192.168.35.243:3001/driver-wallet
Phone: 07031167360
OTP: 123456

# 2. Check virtual account created
# Should show: Account number, Bank name

# 3. Transfer ₦100 to virtual account
# Use any banking app

# 4. Wait 30-60 seconds
# Balance should update automatically

# 5. Test withdrawal of ₦50
# Click "Withdraw Funds"
# Enter your bank details
# Wait 60-120 seconds
# Check your bank account
```

## ✅ Done!

Your live Paystack wallet is now active!

---

**Full Documentation**: See [PAYSTACK_LIVE_DEPLOYMENT_GUIDE.md](PAYSTACK_LIVE_DEPLOYMENT_GUIDE.md)
