# Deploy Invoice Image Preview - Complete Guide

## What's New? 🎉

Your WhatsApp AI now generates **actual invoice preview images** instead of text!

### Features Implemented:
1. ✅ **Image Preview Generation** - Real invoice images using HTMLCSStoImage API
2. ✅ **All 4 Templates Supported** - Classic, Modern, Minimal, Professional
3. ✅ **WhatsApp Image Sending** - Preview sent as image with caption
4. ✅ **Template Selection** - Users can choose templates when creating invoices
5. ✅ **VAT Calculation** - Inclusive/Exclusive modes with custom rates

---

## Files Modified

### 1. `functions/.env`
**Added HTMLCSStoImage credentials:**
```env
# HTMLCSStoImage API Configuration (for invoice preview images)
HCTI_USER_ID=10b70e07-20f8-4b57-a3b9-6edcce9b06a9
HCTI_API_KEY=e421db00-7bc0-4604-a5c4-afb396e79caa
```

### 2. `functions/src/whatsapp/webhook.ts`
**Added image message type support:**
```typescript
else if (response.type === 'image') {
  payload.type = 'image';
  payload.image = {
    link: response.image.link,
    caption: response.image.caption || ''
  };
}
```

### 3. `functions/src/whatsapp/invoiceHandlers.ts`
**Replaced text preview with image generation:**
- Sends "Generating..." message
- Calls `generateInvoiceHTML()` from invoiceImageGenerator
- Authenticates with HTMLCSStoImage API
- Sends actual image URL via WhatsApp

### 4. `functions/src/whatsapp/invoiceImageGenerator.ts`
**Implemented all 4 invoice templates:**
- **Classic Template** - Traditional black/white layout
- **Modern Template** - Purple gradient header, contemporary design
- **Minimal Template** - Courier font, clean monochrome style
- **Professional Template** - Georgia serif, corporate letterhead style

Each template:
- A4 dimensions (794px × 1123px)
- Fully styled with inline CSS
- Supports all invoice fields (from/to, items, VAT, payment details)
- VAT calculation (inclusive/exclusive)
- Nigerian Naira currency formatting

---

## Deployment Steps

### Step 1: Verify Environment Variables

Check that HTMLCSStoImage credentials are in `functions/.env`:

```bash
cd functions
cat .env | grep HCTI
```

**Expected Output:**
```
HCTI_USER_ID=10b70e07-20f8-4b57-a3b9-6edcce9b06a9
HCTI_API_KEY=e421db00-7bc0-4604-a5c4-afb396e79caa
```

### Step 2: Build TypeScript

```bash
cd functions
npm run build
```

**Expected Output:**
```
> build
> tsc

✓ Compilation successful (no errors)
```

**If you see errors:**
- Check that all imports are correct
- Verify no unused variables
- Run `npm install` if dependencies are missing

### Step 3: Deploy to Firebase

```bash
firebase deploy --only functions:whatsappWebhook
```

**Expected Output:**
```
=== Deploying to 'glyde-platform'...

✔  functions: Finished running predeploy script.
i  functions: preparing codebase for deployment
✔  functions: functions folder uploaded successfully
i  functions: updating Node.js 18 function whatsappWebhook(us-central1)...
✔  functions[whatsappWebhook(us-central1)] Successful update operation.

✔  Deploy complete!

Function URL: https://us-central1-glyde-platform.cloudfunctions.net/whatsappWebhook
```

**Note:** First deployment may take 3-5 minutes to provision.

---

## Testing the Feature

### Test 1: Create Invoice with Default Template

Send to WhatsApp:
```
Create invoice for Test Client, 50 cement bags at 5000 naira each
```

**Expected Flow:**
1. ✅ Instant acknowledgment (1-2 seconds)
2. ✅ Invoice created with classic template (default)
3. ✅ Success message with invoice number

**Success Message:**
```
✅ Invoice Created Successfully!

📄 Invoice #: INV-202510-XXXX
👤 Client: Test Client
🎨 Template: Classic

💰 Amount Breakdown:
Subtotal: ₦250,000.00
VAT (7.5% Exclusive): ₦18,750.00
Total: ₦268,750.00

📅 Due: Nov 19, 2025
📊 Status: Draft

What next?
1️⃣ Preview invoice (see how it looks)
2️⃣ Send to client via email
3️⃣ Create another invoice
4️⃣ View all invoices

Type "preview INV-202510-XXXX" to see the invoice
```

### Test 2: Preview Invoice (Image Generation)

Send to WhatsApp:
```
preview INV-202510-XXXX
```

(Replace XXXX with actual invoice number from previous step)

**Expected Flow:**
1. ✅ "Generating invoice preview... ⏳" message (instant)
2. ✅ HTMLCSStoImage API call (2-4 seconds)
3. ✅ **Image sent via WhatsApp** (classic template)
4. ✅ Caption with invoice details

**Image Preview:**
- Full A4-sized invoice image
- Classic black & white template
- All fields populated (from/to, items, totals, VAT)
- Professional formatting

**Caption:**
```
📄 Invoice INV-202510-XXXX

🎨 Template: Classic
📊 Status: Draft
💰 Total: ₦268,750.00
📝 VAT: 7.5% Exclusive

Next Steps:
• Type "send INV-202510-XXXX" to email to client
• Visit dashboard for full details
```

### Test 3: Create Invoice with Modern Template

```
Create modern invoice for ABC Ltd, 100 products at 1000
```

**Preview this invoice to see:**
- Purple gradient header
- Rounded corners
- Modern sans-serif fonts
- Color-coded sections

### Test 4: Create Invoice with Minimal Template

```
Create minimal invoice for XYZ Corp, 20 services at 10000
```

**Preview this invoice to see:**
- Courier monospace font
- Black and white
- Maximum white space
- Clean lines

### Test 5: Create Invoice with Professional Template

```
Create professional invoice for Elite Business, 5 consulting packages at 50000
```

**Preview this invoice to see:**
- Corporate letterhead style
- Georgia serif fonts
- Formal border
- "Thank you for your business" footer

### Test 6: VAT Inclusive with Template

```
Create modern template invoice with VAT inclusive for Retail Store, 50 items at 2000
```

**Verify:**
- Modern template style in preview image
- VAT calculation correct (inclusive mode)
- Total: ₦100,000 (VAT already included)
- Subtotal: ₦93,023.26
- VAT: ₦6,976.74

---

## Troubleshooting

### Issue: "Generating..." message but no image sent

**Possible Causes:**
1. HTMLCSStoImage API credentials invalid
2. API rate limit exceeded (free tier: 50 images/month)
3. Network timeout

**Debug Steps:**
```bash
# Check Firebase logs
firebase functions:log --only whatsappWebhook --lines 50
```

**Look for:**
```
ERROR: Failed to generate invoice image
ERROR: HTMLCSStoImage API error
```

**Solution:**
1. Verify credentials in `.env` file
2. Check HTMLCSStoImage account status: https://htmlcsstoimage.com/dashboard
3. Upgrade plan if rate limit exceeded

### Issue: Image shows but template looks broken

**Possible Causes:**
- HTML/CSS syntax error in template
- Missing invoice fields causing template to break

**Debug Steps:**
1. Check Firebase logs for HTML generation errors
2. Verify invoice has all required fields in Firestore

**Solution:**
```bash
# View logs for specific invoice
firebase functions:log --only whatsappWebhook | grep "Invoice HTML generated"
```

### Issue: TypeScript compilation errors

**Common Errors:**
```
error TS6133: 'X' is declared but its value is never read
error TS2367: This comparison appears to be unintentional
```

**Solution:**
- Remove unused imports/variables
- Check type definitions match usage
- Run `npm install` to update dependencies

### Issue: Preview shows "Invoice not found"

**Cause:** Invoice doesn't exist in Firestore

**Solution:**
1. Create invoice first before previewing
2. Check invoice number is correct (copy from success message)
3. Verify organization has invoices collection

---

## Cost Analysis

### HTMLCSStoImage Pricing

**Free Tier:**
- 50 images/month
- No credit card required
- Perfect for testing

**Paid Plans:**
- **Starter:** $19/month - 1,000 images
- **Growth:** $49/month - 5,000 images
- **Business:** $99/month - 15,000 images

**Cost Per Preview:**
- Free tier: $0 (first 50)
- Paid: ~$0.01 - $0.02 per image

**Recommendation:** Start with free tier for testing, upgrade when you hit 50 previews/month.

### Firebase Functions Cost

**With minInstances: 1** (already deployed):
- ~$5/month for warm instance
- Instant responses (no cold starts)
- Worth it for production

**Total Monthly Cost:** ~$5 (Firebase) + $0-19 (HTMLCSStoImage) = **$5-24/month**

---

## API Response Times

### Expected Performance

**Preview Command Flow:**
1. User sends "preview INV-XXX" → **0ms**
2. WhatsApp webhook receives → **100-300ms**
3. "Generating..." message sent → **500-1000ms** (user sees this)
4. Fetch invoice from Firestore → **200-500ms**
5. Generate HTML template → **50-100ms**
6. HTMLCSStoImage API call → **2000-4000ms** (main bottleneck)
7. Image URL received → **0ms**
8. Send image via WhatsApp → **500-1000ms**
9. User sees image → **Total: 3-8 seconds**

**Breakdown:**
- **User-visible wait:** 3-8 seconds
- **Perceived wait:** 1-2 seconds (sees "Generating..." message)
- **Much better than:** Previous text preview (instant but no visual)

---

## Verification Checklist

After deployment, verify:

- [ ] TypeScript compiles with no errors
- [ ] Function deployed successfully
- [ ] HTMLCSStoImage credentials set in `.env`
- [ ] Invoice creation works with all 4 templates
- [ ] Preview command sends "Generating..." message
- [ ] Image arrives within 3-8 seconds
- [ ] Image shows correct template (classic/modern/minimal/professional)
- [ ] All invoice fields visible in image (from/to, items, totals, VAT)
- [ ] Caption includes invoice details
- [ ] VAT calculation correct (inclusive/exclusive)
- [ ] Dashboard shows invoice with selected template

---

## Template Visual Guide

### Classic Template 📋
- Traditional border layout
- Black & white color scheme
- Helvetica/Arial fonts
- Professional and clean
- **Best for:** Standard invoices, formal clients

### Modern Template ✨
- Purple gradient header (#667eea → #764ba2)
- Rounded corners (16px)
- Contemporary design
- Color-coded status
- **Best for:** Tech companies, creative agencies

### Minimal Template 📄
- Courier New monospace font
- Maximum white space
- Thin dividing lines
- Grey-scale palette
- **Best for:** Freelancers, design studios

### Professional Template 💼
- Georgia serif fonts
- Corporate letterhead
- 8px border frame
- "Thank you" footer
- **Best for:** Legal firms, consultancies, formal businesses

---

## Complete Command Reference

### Invoice Creation
```
create invoice for [Client], [Items] at [Price]
create [template] invoice for [Client], [Items] at [Price]
create invoice with VAT [inclusive|exclusive] for [Client]
create [template] invoice with VAT [inclusive|exclusive] for [Client]
```

**Template Keywords:**
- `modern`, `modern template`, `use modern`
- `minimal`, `minimal template`, `use minimal`
- `professional`, `professional template`, `use professional`
- No keyword = `classic` (default)

**VAT Keywords:**
- `with VAT inclusive`, `VAT included`
- `with VAT exclusive`, `add VAT on top`
- `with 5% VAT`, `with 10% VAT` (custom rates)

### Invoice Preview
```
preview invoice [INV-NUMBER]
preview [INV-NUMBER]
show invoice [INV-NUMBER]
```

### Invoice Management
```
send invoice [INV-NUMBER]
send [INV-NUMBER]
list invoices
show all invoices
```

---

## Next Steps (Optional Enhancements)

### 1. PDF Attachment Instead of Image URL
Currently sends image URL (hosted by HTMLCSStoImage). Could download and send as attachment:
```typescript
// Download image
const imageResponse = await fetch(imageData.url);
const imageBuffer = await imageResponse.buffer();

// Upload to Firebase Storage
const bucket = admin.storage().bucket();
const file = bucket.file(`invoices/${invoice.invoiceNumber}.png`);
await file.save(imageBuffer);

// Send as WhatsApp image
const publicUrl = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
```

### 2. Direct Email Sending
Enable "send invoice" command to email PDF:
```typescript
// In handleSendInvoice()
- Mark as sent
- Generate PDF (not just image)
- Send via SendGrid/Mailgun to client email
```

### 3. Invoice Editing via WhatsApp
```
edit invoice INV-202510-0001, change total to 300000
edit invoice INV-202510-0001, add item: delivery fee 5000
```

### 4. Custom Templates
Allow users to create custom templates in dashboard:
```
create invoice using "my-custom-template"
```

### 5. Logo Upload
Add company logo to invoice templates:
- Upload logo to Firebase Storage
- Include logo URL in invoice data
- Render logo in HTML templates

---

## Support & Documentation

**Related Docs:**
- [WHATSAPP_INVOICE_FEATURES.md](./WHATSAPP_INVOICE_FEATURES.md) - Complete features guide
- [WHATSAPP_FIXES.md](./WHATSAPP_FIXES.md) - Performance fixes
- [DEPLOY_WHATSAPP_FIXES.md](./DEPLOY_WHATSAPP_FIXES.md) - General deployment

**Firebase Console:** https://console.firebase.google.com/project/glyde-platform/functions

**HTMLCSStoImage Dashboard:** https://htmlcsstoimage.com/dashboard

**Meta WhatsApp Dashboard:** https://business.facebook.com/wa/manage/phone-numbers/

**Need Help?**
```bash
# View live logs
firebase functions:log --only whatsappWebhook

# Test locally
cd functions
npm run serve
```

---

## Success Criteria ✅

After deployment, you should be able to:

1. ✅ Create invoice with any template
2. ✅ Preview invoice and receive **actual image** (not text)
3. ✅ Image shows in 3-8 seconds
4. ✅ Image matches selected template style
5. ✅ All fields visible (from/to, items, VAT, totals)
6. ✅ VAT calculated correctly (inclusive/exclusive)
7. ✅ Dashboard shows invoice with template
8. ✅ No TypeScript compilation errors
9. ✅ No Firebase function errors in logs

---

**Ready to deploy?** Run the 3 commands in the Deployment Steps section above! 🚀

**Questions?** Type "HELP" in WhatsApp to see the full command menu.
