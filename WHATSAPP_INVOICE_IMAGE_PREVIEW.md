# WhatsApp Invoice Image Preview - Implementation Guide

## Problem

Currently, invoice preview in WhatsApp shows **text only**. We want to show the **actual invoice design** as an image (like the preview in the web dashboard).

## Solution Overview

Generate invoice preview images from HTML templates and send them as WhatsApp images.

---

## Implementation Options

### Option 1: HTML CSS to Image API (Recommended ✅)

**Service**: https://htmlcsstoimage.com
**Cost**: Free tier: 50 images/month, Paid: $9/month (2,000 images)

**Pros:**
- No Puppeteer/Chrome needed
- Fast and reliable
- Simple API
- Free tier for testing

**Implementation:**

```typescript
// functions/src/whatsapp/invoiceImageGenerator.ts

async function generateInvoiceImageURL(invoice: any): Promise<string> {
  const html = generateInvoiceHTML(invoice); // Our HTML template

  const response = await fetch('https://hcti.io/v1/image', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(
        `${process.env.HCTI_USER_ID}:${process.env.HCTI_API_KEY}`
      ).toString('base64'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      html,
      css: '', // Optional: external CSS
      google_fonts: 'Roboto',
      viewport_width: 794, // A4 width in pixels
      viewport_height: 1123 // A4 height in pixels
    })
  });

  const data = await response.json();
  return data.url; // Returns image URL
}
```

---

### Option 2: Puppeteer (Cloud Functions 2nd Gen)

**Requires:**
- Firebase Functions 2nd gen
- Increased memory (1GB+)
- Longer timeout

**Pros:**
- Full control
- No external dependencies
- No API costs

**Cons:**
- Slower cold starts
- Higher memory usage
- More complex setup

**Implementation:**

```bash
cd functions
npm install puppeteer
```

```typescript
import puppeteer from 'puppeteer';

async function generateInvoiceImage(invoice: any): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123 });
  await page.setContent(generateInvoiceHTML(invoice));

  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: true
  });

  await browser.close();
  return screenshot;
}
```

**functions/package.json:**
```json
{
  "engines": {
    "node": "18"
  },
  "main": "lib/index.js",
  "dependencies": {
    "puppeteer": "^21.0.0"
  }
}
```

---

### Option 3: Firebase Storage + Pre-rendered Templates

**Approach:**
1. Generate invoice as HTML in frontend
2. Use `html2canvas` to capture screenshot
3. Upload to Firebase Storage
4. Return download URL

**Pros:**
- No Cloud Functions overhead
- Uses existing frontend code

**Cons:**
- User must wait for upload
- Requires frontend trigger

---

## Recommended: Option 1 (HTML CSS to Image API)

### Setup Steps

#### 1. Sign up for HTMLCSStoImage

1. Go to https://htmlcsstoimage.com
2. Sign up (free tier)
3. Get your **User ID** and **API Key**

#### 2. Add to Firebase Config

```bash
firebase functions:config:set hcti.user_id="YOUR_USER_ID"
firebase functions:config:set hcti.api_key="YOUR_API_KEY"
```

Or in `.env`:
```
HCTI_USER_ID=your_user_id_here
HCTI_API_KEY=your_api_key_here
```

#### 3. Update Invoice Handler

```typescript
// functions/src/whatsapp/invoiceHandlers.ts

import { generateInvoiceHTML } from './invoiceImageGenerator';

export async function handlePreviewInvoice(
  whatsappUser: any,
  entities: any,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId } = whatsappUser;
    const invoiceNumber = entities.invoiceNumber;

    // Find invoice
    const invoicesSnapshot = await getDb()
      .collection('invoices')
      .where('organizationId', '==', organizationId)
      .where('invoiceNumber', '==', invoiceNumber)
      .limit(1)
      .get();

    if (invoicesSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `Invoice "${invoiceNumber}" not found.`
      });
      return;
    }

    const invoice = invoicesSnapshot.docs[0].data();

    // Generate invoice HTML
    const html = generateInvoiceHTML(invoice);

    // Generate image using HTML CSS to Image API
    const HCTI_USER_ID = process.env.HCTI_USER_ID || functions.config().hcti?.user_id;
    const HCTI_API_KEY = process.env.HCTI_API_KEY || functions.config().hcti?.api_key;

    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${HCTI_USER_ID}:${HCTI_API_KEY}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html,
        viewport_width: 794,
        viewport_height: 1123,
        device_scale: 2 // High DPI for better quality
      })
    });

    const imageData = await response.json();

    if (!response.ok) {
      throw new Error(`Image generation failed: ${JSON.stringify(imageData)}`);
    }

    // Send invoice image via WhatsApp
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'image',
      image: {
        link: imageData.url,
        caption: `📄 Invoice ${invoiceNumber}\n\nTemplate: ${invoice.template || 'Classic'}\nTotal: ₦${(invoice.total || 0).toLocaleString('en-NG')}`
      }
    });

    functions.logger.info('Invoice preview image sent', {
      invoiceNumber,
      imageUrl: imageData.url
    });

  } catch (error: any) {
    functions.logger.error('Invoice preview error', { error: error.message });
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: 'Sorry, I encountered an error generating the invoice preview. Please try again.'
    });
  }
}
```

#### 4. Update WhatsApp Message Sender

```typescript
// functions/src/whatsapp/webhook.ts

export async function sendWhatsAppMessage(
  to: string,
  phoneNumberId: string,
  response: { type: string; text?: string; image?: any; [key: string]: any }
): Promise<void> {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
    };

    // Build message payload based on type
    if (response.type === 'text') {
      payload.type = 'text';
      payload.text = { body: response.text };
    } else if (response.type === 'image') {
      payload.type = 'image';
      payload.image = {
        link: response.image.link,
        caption: response.image.caption || ''
      };
    } else if (response.type === 'document') {
      payload.type = 'document';
      payload.document = {
        link: response.url,
        filename: response.filename,
        caption: response.caption
      };
    }
    // ... rest of types

    const result = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // ... rest of function
  }
}
```

---

## Testing

### Test 1: Generate Invoice Preview

```
User: Create invoice for Test Client, 10 items at 5000

Bot: ✅ Invoice Created!
...
Type "preview INV-202510-0001" to see the invoice

---

User: preview INV-202510-0001

Bot: 👀 Generating invoice preview... ⏳

[Sends beautiful invoice image showing:
- Classic template design
- Company logo
- Client details
- Items table
- VAT breakdown
- Payment details]

Bot: 📄 Invoice INV-202510-0001

Template: Classic
Total: ₦53,750.00
```

### Test 2: Different Templates

```
User: Create modern invoice for ABC Ltd, 50 cement at 5000

Bot: ✅ Invoice Created!
🎨 Template: Modern
...

User: preview INV-202510-0002

Bot: [Sends modern template image with gradients and contemporary design]
```

---

## Cost Estimates

### HTMLCSStoImage.com Pricing

| Tier | Images/Month | Price |
|------|--------------|-------|
| Free | 50 | $0 |
| Starter | 2,000 | $9/month |
| Pro | 10,000 | $29/month |
| Business | 50,000 | $99/month |

### Usage Estimate

- Average: 5 invoice previews/day = 150/month
- **Recommended**: Starter plan ($9/month)

### Alternative: Puppeteer

- No API costs
- **But**: Increased Cloud Functions costs
  - 1GB memory: ~$0.0000025/second
  - 5 seconds/image: ~$0.0125/image
  - 150 images/month: ~$1.88/month + base costs

**Verdict**: HTMLCSStoImage is more reliable and cost-effective.

---

## Firestore Security

Update rules to allow invoice reads:

```
// firestore.rules
match /invoices/{invoiceId} {
  allow read: if request.auth != null &&
    get(/databases/$(database)/documents/invoices/$(invoiceId)).data.organizationId ==
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId;
}
```

---

## Error Handling

### Common Issues

1. **Image URL expired**
   - HTMLCSStoImage URLs expire after 24 hours
   - Solution: Generate fresh image each time

2. **Image generation timeout**
   - Increase Cloud Functions timeout
   - Send "generating..." message first

3. **WhatsApp image size limit**
   - Max: 5MB
   - Solution: Compress or reduce viewport size

---

## Advanced Features

### 1. Cache Images in Firebase Storage

```typescript
import * as admin from 'firebase-admin';

async function getCachedInvoiceImage(invoiceId: string): Promise<string | null> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(`invoice-previews/${invoiceId}.png`);

  const [exists] = await file.exists();
  if (exists) {
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    return url;
  }

  return null;
}
```

### 2. Multiple Template Images

Support all 4 templates:
- Classic
- Modern
- Minimal
- Professional

Each with unique HTML/CSS.

### 3. PDF Generation

For sending actual PDF invoices:

```typescript
// Use jsPDF or PDFKit
import PDFDocument from 'pdfkit';

async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  const doc = new PDFDocument();
  // ... generate PDF
  return doc;
}
```

Then send as WhatsApp document:

```typescript
await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
  type: 'document',
  url: pdfUrl,
  filename: `Invoice-${invoiceNumber}.pdf`,
  caption: 'Your invoice is attached'
});
```

---

## Next Steps

1. **Sign up for HTMLCSStoImage.com** (free tier)
2. **Get API credentials**
3. **Update Cloud Functions** with new preview handler
4. **Test with real invoices**
5. **Deploy to production**

---

## Summary

**What Users Will See:**

Before:
```
User: preview INV-202510-0001

Bot: [Long text preview with ASCII formatting]
```

After:
```
User: preview INV-202510-0001

Bot: 👀 Generating invoice preview... ⏳

[Beautiful invoice image appears - exactly like dashboard preview!]

Bot: 📄 Invoice INV-202510-0001
Template: Classic
Total: ₦268,750.00
```

**Much better UX!** 🎉

---

## Files to Modify

1. **invoiceHandlers.ts** - Update `handlePreviewInvoice()`
2. **webhook.ts** - Add image message type support
3. **invoiceImageGenerator.ts** - HTML generation (already created)

Deploy and your users will get beautiful invoice previews in WhatsApp! 📸
