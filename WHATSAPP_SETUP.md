# WhatsApp Business API Integration Guide

## Cost Analysis - Best Options for Nigeria

### 1. ✅ **WhatsApp Cloud API (Meta) - RECOMMENDED**
- **Cost:** FREE for first 1000 conversations/month
- **Then:** $0.005 USD per conversation (Nigeria)
- **Best for:** Startups, SMEs
- **Setup:** 30 minutes
- **No monthly fees**

### 2. Twilio WhatsApp
- **Cost:** $0.005 (receive) + $0.024 (send) per message
- **Monthly:** $150+ for active usage
- **Best for:** Large enterprises

### 3. Ultra.io (Nigeria-focused)
- **Cost:** $0.005 per message
- **Bulk:** $0.003 for 10,000+ messages
- **Best for:** High volume Nigerian businesses

## Quick Setup - WhatsApp Cloud API (FREE Tier)

### Step 1: Create Meta Business Account (5 minutes)

1. Go to: https://business.facebook.com
2. Click "Create Account"
3. Enter business details
4. Verify your business email

### Step 2: Setup WhatsApp Business App (10 minutes)

1. Go to: https://developers.facebook.com
2. Click "My Apps" → "Create App"
3. Select "Business" type
4. Choose "WhatsApp" product
5. Name your app: "Transport SaaS"

### Step 3: Get Your Credentials (5 minutes)

1. In your app dashboard, go to "WhatsApp" → "API Setup"
2. You'll get:
   - **Phone Number ID**: `123456789012345`
   - **WhatsApp Business Account ID**: `987654321098765`
   - **Temporary Access Token**: `EAABg3...` (valid for 24 hours)

### Step 4: Get Permanent Token (5 minutes)

1. Go to "System Users" in Business Settings
2. Create a system user
3. Generate permanent token with these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`

### Step 5: Add to .env File

```env
# WhatsApp Configuration
VITE_WHATSAPP_ACCESS_TOKEN=EAABg3hZCm... (your permanent token)
VITE_WHATSAPP_PHONE_NUMBER_ID=123456789012345
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=transport_saas_verify_2024
```

### Step 6: Add Test Phone Number

1. In WhatsApp dashboard → "Phone numbers"
2. Add recipient phone number for testing
3. Enter verification code sent to that phone

## Message Templates (Required for Business-Initiated Messages)

### Create Templates in Meta Business Suite:

1. Go to WhatsApp Manager → Message Templates
2. Create these templates:

#### Order Created Template
```
Hello {{1}},

Your order #{{2}} has been created successfully!

📍 Pickup: {{3}}
📍 Delivery: {{4}}

We'll assign a driver shortly.

Thank you for choosing us!
```

#### Driver Assigned Template
```
Good news {{1}}!

Your driver is on the way:
👤 Driver: {{2}}
📞 Contact: {{3}}
🚗 Vehicle: {{4}}
⏰ ETA: {{5}}

Track your delivery in real-time!
```

#### Payment Reminder Template
```
Hi {{1}},

This is a reminder for Invoice #{{2}}:
💰 Amount: ₦{{3}}
📅 Due Date: {{4}}

Please make payment to avoid service interruption.

Thank you!
```

## Testing the Integration

### Test from Settings Page:

1. Go to Settings → General
2. Enter your WhatsApp number (with country code)
3. Check "Subscribe to WhatsApp notifications"
4. Click Save

### Test Notification Flow:

```javascript
// In browser console (for testing)
import { createNotification } from './services/firestore/notifications';

await createNotification({
    userId: 'current-user-id',
    organizationId: 'org-id',
    type: 'order',
    title: 'Test Order Created',
    message: 'This is a test notification',
    sendWhatsApp: true,
    whatsAppPhone: '2348012345678'
});
```

## Cost Breakdown for Nigeria

### Conversation-Based Pricing (WhatsApp Cloud API):

- **User-Initiated:** Customer messages you first
  - Free for 24 hours to respond
  - $0.005 per conversation after free tier

- **Business-Initiated:** You message customer first
  - Requires approved template
  - $0.024 per conversation after free tier

### Monthly Cost Examples:

| Users | Messages/Month | User-Initiated | Business-Initiated | Total Cost |
|-------|---------------|---------------|-------------------|------------|
| 50    | 500           | Free          | Free              | $0         |
| 100   | 1,000         | Free          | Free              | $0         |
| 500   | 5,000         | $20           | $96               | $116       |
| 1,000 | 10,000        | $45           | $216              | $261       |

## Webhook Setup (For Receiving Messages)

### Local Development (ngrok):

```bash
# Install ngrok
npm install -g ngrok

# Run your app
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# You'll get: https://abc123.ngrok.io
```

### Configure Webhook in Meta:

1. Go to WhatsApp → Configuration → Webhooks
2. Callback URL: `https://your-domain.com/api/whatsapp/webhook`
3. Verify Token: `transport_saas_verify_2024`
4. Subscribe to fields:
   - `messages`
   - `message_status`

### Production Webhook Handler:

Create `api/whatsapp/webhook.ts`:

```typescript
export async function POST(request: Request) {
    const body = await request.json();

    // Handle incoming messages
    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; // Phone number
        const text = message.text?.body;

        // Process message
        await handleIncomingMessage(from, text);
    }

    return new Response('OK', { status: 200 });
}

export async function GET(request: Request) {
    // Webhook verification
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === 'transport_saas_verify_2024') {
        return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
}
```

## Common Issues & Solutions

### Issue: "Access token expired"
**Solution:** Generate permanent token (Step 4)

### Issue: "Template not approved"
**Solution:** Submit templates for review (24-48 hours)

### Issue: "Phone number not verified"
**Solution:** Add number in test numbers first

### Issue: "Rate limit exceeded"
**Solution:** Implement queuing (already in our service)

## Best Practices

1. **Always use templates** for business-initiated messages
2. **Respond within 24 hours** to customer messages (free window)
3. **Include opt-out** instructions
4. **Store message IDs** for tracking
5. **Implement retry logic** for failed messages
6. **Use webhooks** for two-way communication

## Alternative: Quick Start with Twilio (Sandbox)

If Meta setup is complex, use Twilio Sandbox:

1. Sign up: https://www.twilio.com
2. Get sandbox number: `whatsapp:+14155238886`
3. Join sandbox: Send "join <code>" to the number
4. Update `.env`:
```env
VITE_TWILIO_ACCOUNT_SID=your_account_sid
VITE_TWILIO_AUTH_TOKEN=your_auth_token
VITE_TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## Integration Features

### What's Implemented:

✅ Send text messages
✅ Send template messages
✅ Send location (driver tracking)
✅ Send documents (invoices, POD)
✅ Rate limiting
✅ Bulk messaging
✅ Nigerian phone formatting

### Notification Types:

- New order/shipment
- Driver assigned
- Route started/completed
- Payment reminders
- Maintenance alerts
- Delivery updates
- Invoice notifications

## Testing Without Setup

To test notifications without WhatsApp setup:

1. The system will log messages to console
2. In-app notifications will still work
3. Check browser console for WhatsApp message content

## Support

- Meta Documentation: https://developers.facebook.com/docs/whatsapp
- API Status: https://status.whatsapp.com
- Community Forum: https://developers.facebook.com/community/forums