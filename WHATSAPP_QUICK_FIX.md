# WhatsApp "API Access Blocked" - Quick Fix

## ⚠️ Error You're Seeing:

```
WhatsApp send error: Error: API access blocked.
graph.facebook.com/v18.0/.../messages: 400
```

## ✅ Quick Fix (2 minutes):

### Step 1: Get Your Access Token

1. Go to: https://developers.facebook.com/apps/
2. Select your app → **WhatsApp** → **API Setup**
3. Click **"Temporary access token"** (copy it, starts with `EAA`)
4. Also copy the **Phone number ID** (long number below)

### Step 2: Update `.env` File

Open `.env` in your project root and add:

```env
VITE_WHATSAPP_ACCESS_TOKEN=EAA...paste_token_here
VITE_WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

### Step 3: Restart Server

```bash
# Press Ctrl+C to stop
npm run dev
```

### Step 4: Test Again

Assign a route to a driver → Check console for success/error.

---

## 🔍 Still Not Working?

### Check if business is verified:
- Go to: https://business.facebook.com/settings/info
- Look for "Business Verification Status"
- If **Not Verified** → You need to complete business verification first (takes 2-4 weeks)

### Check if template is approved:
- Go to: https://business.facebook.com/wa/manage/message-templates/
- Find `driver_assigned` template
- Status must be **APPROVED** ✅

### Need more help?
- See [WHATSAPP_TROUBLESHOOTING.md](WHATSAPP_TROUBLESHOOTING.md) for detailed guide

---

## 💡 Test Without WhatsApp (Temporary)

If you want to test route assignments without WhatsApp working, that's fine! The code already handles failures gracefully - route assignments will still work, you just won't send WhatsApp messages.

Console will show: `"Failed to send WhatsApp notification"` but route assignment completes normally.

---

## 📋 Fixed Issues:

✅ `whatsAppNotifications.sendText is not a function` - **FIXED**
✅ Better error logging for debugging - **ADDED**
✅ Template name corrected to `driver_assigned` - **FIXED**

**Next:** Just add your credentials and restart!
