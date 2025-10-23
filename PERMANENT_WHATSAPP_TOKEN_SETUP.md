# How to Create a Permanent WhatsApp Access Token

## Problem
The temporary access token from Meta expires every 24 hours, requiring daily updates.

## Solution
Create a **System User Token** that never expires.

---

## Step-by-Step Guide

### Step 1: Access Business Settings

1. Go to: **https://business.facebook.com/settings/**
2. Ensure you're in the correct Business Manager account

### Step 2: Create System User

1. In left sidebar → **Users** section → **System users**
2. Click **"Add"** button (top right)
3. Fill in:
   - **Name:** `Transport SaaS WhatsApp API`
   - **Role:** `Admin`
4. Click **"Create system user"**

### Step 3: Assign WhatsApp App Permissions

1. Click on the system user you just created
2. Click **"Add Assets"**
3. Select **"Apps"**
4. Find your WhatsApp app → Check the box
5. Permissions: Select **"Manage app"** (or "Full control")
6. Click **"Save Changes"**

### Step 4: Assign WhatsApp Business Account

1. Click **"Add Assets"** again
2. Select **"WhatsApp Accounts"**
3. Find your WhatsApp Business Account → Check the box
4. Toggle **"Manage WhatsApp account"** to ON
5. Click **"Save Changes"**

### Step 5: Generate Permanent Token

1. On the System User page, click **"Generate New Token"**
2. **Select your app** from dropdown
3. **Token expiration:** Select **"Never"** (default for system users)
4. **Permissions:** Check these boxes:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
   - ✅ `business_management` (optional, for account info)
5. Click **"Generate Token"**
6. **IMPORTANT:** Copy the token immediately! You won't see it again.

### Step 6: Update `.env` File

Replace your temporary token with the new permanent one:

```env
# Old (expires in 24 hours):
# VITE_WHATSAPP_ACCESS_TOKEN=EAFcsZBL8Lxu0...

# New (never expires):
VITE_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 7: Restart Development Server

```bash
npm run dev
```

---

## Verification

Test that your new token works:

### Option 1: Assign a Route
1. Go to your dashboard
2. Assign a driver to a route
3. Check if WhatsApp notification is sent

### Option 2: Test with Curl

```bash
curl -X GET "https://graph.facebook.com/v18.0/me?access_token=YOUR_NEW_TOKEN"
```

**Expected response:**
```json
{
  "id": "123456789",
  "name": "Transport SaaS WhatsApp API"
}
```

---

## Important Notes

### Token Security
- **Never commit** your token to version control (Git)
- Keep `.env` file in `.gitignore`
- Store production token in secure environment variables (Vercel, Netlify, etc.)

### Token Management
- System User tokens **never expire** by default
- You can revoke tokens anytime from Business Settings → System Users
- Regenerate tokens if compromised

### Best Practices
1. **Development:** Use temporary token (24hr) for quick testing
2. **Staging/Production:** Use System User token (permanent)
3. **Multiple environments:** Create separate system users per environment

---

## Troubleshooting

### Token Still Expires
- Verify you selected **"Never"** for expiration
- Check that you created a **System User**, not a regular user
- System User tokens have no expiration by default

### Permissions Error
Make sure you granted these permissions:
- `whatsapp_business_management`
- `whatsapp_business_messaging`

Go back to System Users → Your user → Assets → Apps → Re-check permissions

### Can't See System Users Option
- You need **Admin** access to the Business Manager
- Ask the Business Manager admin to grant you access

### Token Doesn't Work
Test with curl:
```bash
curl -X GET "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID?access_token=YOUR_TOKEN"
```

Should return your phone number details.

---

## Alternative: App Token (Not Recommended)

You can also use an **App Access Token**, but it's less secure:

1. Go to: https://developers.facebook.com/tools/accesstoken/
2. Select your app
3. Copy the token

**Note:** This is less secure and not recommended for production.

---

## When to Regenerate Token

Regenerate your System User token if:
- Token is accidentally exposed (e.g., committed to public Git repo)
- Suspicious activity detected
- Team member with access leaves
- Regular security audit (every 6-12 months)

---

## Quick Reference

| Token Type | Expires | Use Case |
|------------|---------|----------|
| Temporary (Dev) | 24 hours | Quick testing |
| System User | Never | Production |
| App Token | Never | Less secure alternative |

**Recommended:** System User Token for all production deployments.

---

## Need Help?

- **Meta Documentation:** https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-users
- **Business Manager:** https://business.facebook.com/settings/system-users
- **Support:** https://developers.facebook.com/support/bugs/

---

**Done!** Your WhatsApp integration will now work permanently without daily token updates. 🎉
