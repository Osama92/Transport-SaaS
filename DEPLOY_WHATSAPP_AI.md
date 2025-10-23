# Deploy WhatsApp AI - Quick Guide

## ✅ Environment Variables Set

Your API keys are now configured in `functions/.env`:
- ✅ OpenAI API Key
- ✅ WhatsApp Access Token
- ✅ WhatsApp Phone Number ID
- ✅ Paystack Secret Key

---

## 🚀 Deploy Now

Run these commands:

```bash
cd "/home/sir_dan_carter/Desktop/Project Files/Transport-SaaS/functions"

# Install dependencies (if not already installed)
npm install

# Build TypeScript
npm run build

# Deploy the WhatsApp webhook function
firebase deploy --only functions:whatsappWebhook
```

---

## 🧪 Test After Deployment

### Test 1: Help Command
Send WhatsApp message to your business number:
```
HELP
```

Expected: Full help menu with AI features

### Test 2: Create Invoice
```
Create invoice for Dangote Ltd, 50 bags cement at ₦5000 each
```

Expected:
```
✅ Invoice Created!
Invoice #: INV-202501001
Client: Dangote Ltd
Total: ₦250,000
...
```

### Test 3: Add Client
```
Add client Oando PLC, email info@oando.com, phone 08012345678
```

Expected:
```
✅ Client Added!
Name: Oando PLC
Email: info@oando.com
...
```

### Test 4: Check Balance
```
What's my wallet balance?
```

Expected:
```
💰 Wallet Balance
Current Balance: ₦1,000
...
```

### Test 5: Voice Note (Any Nigerian Language)
Send a voice note saying:
```
"Create invoice for ABC company, cement 20 bags, five thousand naira each"
```

Expected:
```
🎤 Voice note transcribed:
"Create invoice for ABC company, cement 20 bags, five thousand naira each"

Processing your request...

✅ Invoice Created!
...
```

---

## 📊 Monitor Logs

Watch real-time logs:
```bash
firebase functions:log --only whatsappWebhook --follow
```

You'll see:
- Incoming messages
- AI intent recognition
- Entity extraction
- Database operations
- Success/error messages

---

## 🔍 Troubleshooting

### If deployment fails:

**Check Node.js version:**
```bash
node --version  # Should be v18 or higher
```

**If you get TypeScript errors:**
```bash
cd functions
npm install
npm run build
```

**If webhook doesn't respond:**
1. Check Firebase logs: `firebase functions:log`
2. Verify webhook URL in Meta Dashboard
3. Check WhatsApp token is valid
4. Ensure webhook verify token matches: `transport_saas_verify_2024`

### If AI doesn't work:

**Check OpenAI API key:**
```bash
# Test the key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY"
```

Should return list of available models.

---

## 📱 User Registration

Before users can create invoices, they need to link their WhatsApp to their account:

**Option 1: Manual Registration**
1. User sends their email to WhatsApp bot
2. Bot finds their account
3. Links WhatsApp number to user ID

**Option 2: Auto-Registration (Recommended)**
Users who already signed up on the web app can:
1. Send any message to WhatsApp bot
2. Bot asks for email verification
3. User sends email
4. Bot links account

---

## 🎯 What Happens Next

After deployment:

1. **Users can:**
   - Create invoices via chat
   - Add clients via chat
   - Check wallet balance
   - View transactions
   - Send voice notes in any Nigerian language

2. **You can:**
   - Monitor usage in Firebase logs
   - See all invoices/clients in dashboard
   - Track AI performance metrics

3. **Next features to add:**
   - Driver management via WhatsApp
   - Shipment tracking
   - Payment processing
   - Reports and analytics

---

## 💰 Cost Monitoring

**Current setup costs:**
- WhatsApp: FREE (first 1000 conversations/month)
- OpenAI Whisper: $0.006/minute of audio
- OpenAI GPT-4 Mini: ~$0.15 per 100K tokens

**Expected monthly cost for 100 active users:** ~$20

Monitor usage:
- OpenAI: https://platform.openai.com/usage
- WhatsApp: Meta Business Dashboard

---

## ✅ You're Ready!

All configurations are set. Just deploy and test!

```bash
cd functions && npm run build && firebase deploy --only functions:whatsappWebhook
```

Good luck! 🚀
