# WhatsApp API Troubleshooting Guide

## Error: "API access blocked" (400 Bad Request)

This error means Meta's WhatsApp API is rejecting your request. Here's how to fix it:

### Step 1: Verify Your Access Token

Your access token might be invalid, expired, or have wrong permissions.

#### Get a Valid Access Token:

1. Go to https://developers.facebook.com/apps/
2. Select your app
3. Go to **WhatsApp > API Setup**
4. Click **Generate Access Token** (System User Token recommended for production)
5. Copy the token (starts with `EAA...`)

#### Update your `.env`:

```env
VITE_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxx  # Replace with YOUR token
```

### Step 2: Verify Your Phone Number ID

The Phone Number ID must match the WhatsApp Business phone number in your Meta account.

#### Get Your Phone Number ID:

1. Go to https://developers.facebook.com/apps/
2. Select your app
3. Go to **WhatsApp > API Setup**
4. Look for **Phone number ID** (usually a long number like `123456789012345`)
5. Copy it

#### Update your `.env`:

```env
VITE_WHATSAPP_PHONE_NUMBER_ID=123456789012345  # Replace with YOUR ID
```

### Step 3: Verify Business Verification Status

Meta requires business verification before you can send messages.

#### Check Verification:

1. Go to https://business.facebook.com/settings/info
2. Look for **Business Verification Status**
3. If not verified, click **Start Verification**
4. Submit required documents (business registration, tax ID, etc.)

**Note:** This can take 2-4 weeks for approval.

### Step 4: Check Template Approval Status

Templates must be **APPROVED** before you can use them.

#### Verify Template Status:

1. Go to https://business.facebook.com/wa/manage/message-templates/
2. Find `driver_assigned` template
3. Status should be **APPROVED** (green checkmark)

If status is **PENDING** or **REJECTED**:
- Wait for approval (24-48 hours)
- If rejected, edit and resubmit

### Step 5: Check Phone Number Registration

Your WhatsApp Business phone number must be registered with Meta.

#### Verify Phone Number:

1. Go to https://developers.facebook.com/apps/
2. Select your app
3. Go to **WhatsApp > API Setup**
4. Look for **From** phone number
5. Ensure it's registered and verified

### Step 6: Restart Server After Changes

**IMPORTANT:** After updating `.env`, restart your dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

Environment variables are only loaded at startup!

## Complete `.env` Setup

Your `.env` file should look like this:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123

# WhatsApp Business API (Meta)
VITE_WHATSAPP_ACCESS_TOKEN=EAA...your_actual_token_here
VITE_WHATSAPP_PHONE_NUMBER_ID=123456789012345
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=transport_saas_verify_2024
```

## Testing the Fix

### Method 1: Check Console for Detailed Error

After fixing, assign a route and check browser console for detailed error info:

```javascript
WhatsApp API Error: {
  status: 400,
  error: { message: "API access blocked", code: 190 },
  phoneNumberId: "123456789012345",
  to: "234801234567"
}
```

### Method 2: Test Token Manually

Test your access token with curl:

```bash
curl -X GET "https://graph.facebook.com/v18.0/me?access_token=YOUR_ACCESS_TOKEN"
```

Valid token response:
```json
{
  "id": "123456789",
  "name": "Your Business Name"
}
```

Invalid token response:
```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

### Method 3: Test Phone Number ID

```bash
curl -X GET "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID?access_token=YOUR_ACCESS_TOKEN"
```

Valid response:
```json
{
  "verified_name": "Your Business",
  "display_phone_number": "+1 555-0123",
  "id": "123456789012345"
}
```

## Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 190 | Invalid access token | Generate new token from Meta dashboard |
| 400 | API access blocked | Check business verification status |
| 131000 | Template not found | Verify template name matches Meta exactly |
| 131005 | Template not approved | Wait for template approval or use different template |
| 131026 | Message undeliverable | Phone number not on WhatsApp or blocked you |
| 131047 | Re-engagement message | User must message you first (24hr window expired) |

## Development vs Production Tokens

### Test/Development Access Token

- **Expires:** 24 hours
- **How to get:** WhatsApp > API Setup > "Temporary access token"
- **Use for:** Testing only

### Production System User Token

- **Expires:** Never (but can be revoked)
- **How to get:**
  1. Business Settings > System Users
  2. Create System User
  3. Assign WhatsApp permissions
  4. Generate token
- **Use for:** Production deployment

**Recommendation:** Use System User Token even for development to avoid daily token regeneration.

## Still Getting Errors?

### Check Meta Status Page

https://developers.facebook.com/status/

WhatsApp API might be experiencing downtime.

### Review WhatsApp Business Platform Limits

Free Tier:
- 1,000 conversations/month
- 80 messages/minute
- 250 messages/day (per phone number)

Your limits: https://business.facebook.com/wa/manage/home/

### Enable Debug Mode

Add this to your `.env` for verbose logging:

```env
VITE_WHATSAPP_DEBUG=true
```

Then check console for full request/response details.

### Contact Meta Support

If nothing works:
1. Go to https://developers.facebook.com/support/bugs/
2. Report issue with:
   - Your App ID
   - Phone Number ID
   - Full error message
   - Screenshot of error

## Quick Checklist

Before assigning routes, verify:

- [ ] `.env` file exists in project root
- [ ] `VITE_WHATSAPP_ACCESS_TOKEN` is set (starts with `EAA`)
- [ ] `VITE_WHATSAPP_PHONE_NUMBER_ID` is set (long number)
- [ ] Dev server restarted after `.env` changes
- [ ] Business verified on Meta (for production)
- [ ] `driver_assigned` template approved
- [ ] Phone number registered with WhatsApp Business
- [ ] Driver has valid phone number in database

## Working Without WhatsApp (Temporary)

If you want to test route assignments without WhatsApp working:

The code already handles this gracefully! WhatsApp failures won't block route assignments. You'll just see console warnings.

To completely disable WhatsApp notifications during testing, comment out the WhatsApp call in `PartnerDashboard.tsx`:

```typescript
// Temporarily disable WhatsApp for testing
/*
if (driver.phone && driver.portalAccess?.whatsappNotifications !== false) {
    // ... WhatsApp code
}
*/
```

## Getting Help

1. **Check this guide first**
2. **Check browser console** for detailed errors
3. **Test credentials** with curl commands above
4. **Meta Documentation:** https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
5. **Meta Support:** https://developers.facebook.com/support/

---

**TIP:** Most "API access blocked" errors are caused by invalid/expired tokens or unverified business accounts. Start with Step 1 and Step 3 above.
