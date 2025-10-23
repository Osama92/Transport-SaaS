# WhatsApp AI Integration - Setup Guide
## Transport SaaS - Step-by-Step Implementation

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Meta Business Account
- ✅ Facebook Developer Account
- ✅ Phone number for WhatsApp Business (not currently using WhatsApp)
- ✅ Firebase project with Cloud Functions enabled
- ✅ OpenAI API key (for Whisper + GPT-4)
- ✅ Valid SSL certificate (Firebase provides this automatically)

---

## 🚀 Phase 1: Meta WhatsApp Business API Setup

### Step 1: Create Meta Business Account

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Click **"Create Account"**
3. Enter your business details:
   - Business name: Transport SaaS
   - Your name
   - Business email
4. Click **"Submit"**

### Step 2: Set Up WhatsApp Business

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Fill in app details:
   - **App Name**: Transport SaaS WhatsApp Bot
   - **App Contact Email**: Your email
   - **Business Account**: Select your Meta Business Account
5. Click **"Create App"**

### Step 3: Add WhatsApp Product

1. In your app dashboard, scroll to **"Add Products to Your App"**
2. Find **"WhatsApp"** and click **"Set up"**
3. You'll be redirected to WhatsApp setup page

### Step 4: Get Test Phone Number

Meta provides a test number for free (1000 messages/month):

1. In **WhatsApp > Getting Started** page
2. Under **"Send and receive messages"**, you'll see:
   - **Phone Number ID**: Copy this (e.g., `109876543210987`)
   - **WhatsApp Business Account ID**: Copy this too
3. Click **"Add phone number"** to add your test recipients

### Step 5: Generate Access Token

1. In **WhatsApp > Getting Started**
2. Under **"Temporary access token"**:
   - Click **"Generate token"**
   - Copy the token (starts with `EAAG...`)
   - This token expires in 24 hours (we'll get permanent one later)

3. For permanent token:
   - Go to **Settings** → **Basic**
   - Scroll to **"App Secret"** and reveal it
   - Go to **WhatsApp** → **Configuration**
   - Under **"Permanent Token"**, click **"Generate"**
   - Copy and save this token securely

---

## ⚙️ Phase 2: Firebase Configuration

### Step 1: Set Environment Variables

In your Firebase project, set WhatsApp credentials:

```bash
firebase functions:config:set whatsapp.token="YOUR_PERMANENT_TOKEN"
firebase functions:config:set whatsapp.verify_token="transport_saas_verify_token_2025"
firebase functions:config:set whatsapp.phone_number_id="YOUR_PHONE_NUMBER_ID"
```

Or create `.env` file in `functions/` directory:

```env
WHATSAPP_TOKEN=YOUR_PERMANENT_TOKEN
WHATSAPP_VERIFY_TOKEN=transport_saas_verify_token_2025
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

### Step 2: Deploy Cloud Function

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:whatsappWebhook
```

After deployment, you'll get a URL like:
```
https://us-central1-YOUR_PROJECT.cloudfunctions.net/whatsappWebhook
```

Copy this URL - you'll need it for webhook setup.

---

## 🔗 Phase 3: Configure Webhook

### Step 1: Set Webhook URL

1. Go to Meta Developers → Your App → **WhatsApp** → **Configuration**
2. Find **"Webhook"** section
3. Click **"Edit"**
4. Enter:
   - **Callback URL**: Your Cloud Function URL
   - **Verify Token**: `transport_saas_verify_token_2025` (must match exactly)
5. Click **"Verify and Save"**

If verification fails:
- Check the verify token matches
- Ensure Cloud Function is deployed
- Check Firebase logs: `firebase functions:log`

### Step 2: Subscribe to Webhook Fields

After verification, subscribe to these webhook fields:
- ✅ **messages** (incoming messages)
- ✅ **message_status** (delivery status)

Click **"Subscribe"** and you're done!

---

## 🧪 Phase 4: Test the Integration

### Test 1: Send Message to WhatsApp

1. In Meta Developers → WhatsApp → **API Setup**
2. Under **"Send and receive messages"**
3. Add your personal WhatsApp number:
   - Click **"Add phone number"**
   - Enter your WhatsApp number with country code (e.g., +2348012345678)
   - You'll receive a code on WhatsApp
   - Enter the code to verify
4. Send a test message from your phone to the test number
5. You should receive a reply!

### Test 2: Check Logs

```bash
firebase functions:log --only whatsappWebhook
```

You should see:
```
WhatsApp webhook received
Processing WhatsApp message
Message sent
```

### Test 3: Try Commands

Send these messages to test:
- **"HELP"** - Get help menu
- **"BALANCE"** - Check wallet balance
- **"MENU"** - See available commands

---

## 📚 Helpful Resources

- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [WhatsApp Business API Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)

---

**Ready to start?** Let's begin with Phase 1 - setting up your Meta Business Account!
