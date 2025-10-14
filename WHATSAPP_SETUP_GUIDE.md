# WhatsApp Integration Setup Guide

## Overview

Your Transport SaaS platform is **already integrated** with WhatsApp Business API. The `driver_assigned` template has been approved and the code is ready to send notifications when drivers are assigned to routes.

## ✅ What's Already Done

1. **WhatsApp Service** - Fully implemented in `services/whatsapp/whatsappService.ts`
2. **Template Configuration** - Defined in `services/whatsapp/config.ts`
3. **Route Assignment Integration** - Automatically sends WhatsApp notifications in `PartnerDashboard.tsx` (lines 691-710)
4. **Error Handling** - WhatsApp failures won't block route assignments
5. **Driver Preferences** - Respects driver's `whatsappNotifications` setting

## 🔧 Quick Setup (5 minutes)

### Step 1: Get Your WhatsApp Credentials

You should already have these from Meta's WhatsApp Business API:

1. **Access Token** - Your WhatsApp API access token
2. **Phone Number ID** - Your WhatsApp Business phone number ID
3. **Business Account ID** - Your WhatsApp Business Account ID

If you don't have these yet, follow the setup at: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

### Step 2: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# WhatsApp Business API Configuration
VITE_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxx
VITE_WHATSAPP_PHONE_NUMBER_ID=123456789012345
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=transport_saas_verify_2024
```

### Step 3: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 4: Test Route Assignment

1. Go to **Routes** screen
2. Create a new route (or use existing pending route)
3. Click **Assign** button on a pending route
4. Select a driver with a valid phone number
5. Select a vehicle
6. Click **Assign and Start Route**

The driver will receive a WhatsApp message like:

```
📍 New Route Assigned!

Route ID: RTE-xxx
Pickup: Lagos
Destination: Abuja
Scheduled Time: 2025-10-14 10:00 AM

Login to your portal to start the route.
```

## 📱 How It Works

When you assign a driver to a route, the system:

1. ✅ Assigns driver and vehicle to route (Firestore)
2. ✅ Updates driver status to "On-route"
3. ✅ Updates vehicle status to "On the Move"
4. ✅ Starts the route
5. ✅ Sends in-app notification
6. ✅ **Sends WhatsApp notification to driver** (if phone number exists)

### Code Location

The WhatsApp notification is sent in `PartnerDashboard.tsx`:

```typescript
// Send WhatsApp notification to driver if phone number exists and notifications enabled
if (driver.phone && driver.portalAccess?.whatsappNotifications !== false) {
    const route = routes.find(r => r.id === routeId);
    if (route) {
        try {
            const pickupTime = route.estimatedDepartureTime || 'TBD';
            await whatsAppNotifications.notifyDriverRouteAssigned(
                driver.phone,
                routeId,
                route.origin,
                route.destination,
                pickupTime
            );
            console.log('WhatsApp notification sent to driver:', driver.phone);
        } catch (whatsappError) {
            console.error('Failed to send WhatsApp notification:', whatsappError);
            // Don't fail the assignment if WhatsApp fails
        }
    }
}
```

## 🔍 Troubleshooting

### Issue: WhatsApp notification not sending

**Check these:**

1. **Environment variables set?**
   ```bash
   # In your .env file
   echo $VITE_WHATSAPP_ACCESS_TOKEN
   ```

2. **Driver has valid phone number?**
   - Phone must be in international format: `234801234567` (not `0801234567`)
   - The WhatsApp service auto-formats Nigerian numbers

3. **Driver has WhatsApp notifications enabled?**
   - Check `driver.portalAccess.whatsappNotifications` is not `false`

4. **Template approved?**
   - Verify `driver_assigned` template status in Meta Business Manager

5. **Check browser console**
   - Look for success message: `"WhatsApp notification sent to driver: 234801234567"`
   - Or error message: `"Failed to send WhatsApp notification:"`

### Issue: "Template not found" error

Your template might have a different name in Meta. Check `services/whatsapp/config.ts`:

```typescript
templates: {
  routeAssigned: {
    name: 'driver_assigned', // ← Must match Meta template name exactly
    language: 'en',
    // ...
  }
}
```

### Issue: Phone number format errors

The service automatically formats Nigerian phone numbers:

```typescript
// Input formats that work:
'08012345678'  → '234801234567'
'+2348012345678' → '234801234567'
'2348012345678'  → '234801234567'
```

For non-Nigerian numbers, use full international format without `+`:
- Kenya: `254722123456`
- Ghana: `233201234567`

## 📊 Testing Without Sending Real Messages

During development, you can:

1. **Check console logs** - Verification without sending
2. **Use test phone numbers** - Meta allows test numbers
3. **Comment out the WhatsApp call** temporarily:

```typescript
// Temporarily disable WhatsApp for testing
if (false && driver.phone && driver.portalAccess?.whatsappNotifications !== false) {
    // ...WhatsApp code
}
```

## 🚀 Production Checklist

Before going live:

- [ ] Meta Business verification completed
- [ ] Production access token configured (not test token)
- [ ] All message templates approved by Meta
- [ ] Phone numbers formatted correctly in database
- [ ] Tested with real driver phone numbers
- [ ] WhatsApp Business Profile setup (name, logo, description)
- [ ] Webhook configured for delivery status (optional)

## 📈 Rate Limits

**Meta WhatsApp Business API:**
- **Free tier:** 1,000 conversations/month
- **Per minute:** 80 messages/minute
- **Per conversation:** 24-hour window

The service handles rate limiting automatically.

## 🔗 Additional Templates

You have other notification methods ready to use:

```typescript
// Route completion
await whatsAppNotifications.notifyRouteCompleted(
  driverPhone,
  routeId,
  deliveryTime
);

// Payroll notification
await whatsAppNotifications.notifyPayrollReleased(
  driverPhone,
  payrollPeriod,
  amount
);

// General notification
await whatsAppNotifications.sendGeneralNotification(
  driverPhone,
  title,
  message
);
```

**Important:** Each template must be approved by Meta before use. Submit them at: https://business.facebook.com/wa/manage/message-templates/

## 📞 Support

- **Meta WhatsApp Docs:** https://developers.facebook.com/docs/whatsapp
- **API Status:** https://developers.facebook.com/status/
- **Business Support:** https://business.facebook.com/business/help

## Next Steps

You're all set! Just add your environment variables and start assigning routes. The WhatsApp notifications will be sent automatically.

For testing:
1. Use your own WhatsApp number as a driver
2. Assign yourself to a test route
3. Check your WhatsApp for the notification

---

**Note:** The integration uses Meta's official WhatsApp Cloud API (FREE tier). No need for Twilio or Termii for basic route notifications.
