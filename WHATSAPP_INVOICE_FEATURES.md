# WhatsApp Invoice Features - Complete Guide

## New Features Added ✨

### 1. **Invoice Template Selection** 🎨
Create invoices with different visual templates directly from WhatsApp.

**Available Templates:**
- **Classic** - Traditional invoice layout (default)
- **Modern** - Contemporary design with gradients
- **Minimal** - Clean & simple layout
- **Professional** - Corporate-style design

### 2. **VAT Control** 💵
Choose how VAT is applied to your invoices.

**VAT Modes:**
- **VAT Exclusive** (default) - Tax added on top of subtotal
- **VAT Inclusive** - Tax already included in the price
- **Custom VAT Rate** - Specify your own rate (default: 7.5% Nigeria)

### 3. **Invoice Preview** 👀
See a detailed text preview of your invoice before sending.

### 4. **Invoice Sending** 📧
Mark invoices as sent and track their status.

---

## Command Examples

### Basic Invoice (Default: Classic Template, VAT Exclusive 7.5%)
```
Create invoice for Dangote Cement, 50 bags cement at 5000 naira each
```

**Response:**
```
✅ Invoice Created Successfully!

📄 Invoice #: INV-202510-0001
👤 Client: Dangote Cement
🎨 Template: Classic

💰 Amount Breakdown:
Subtotal: ₦250,000.00
VAT (7.5% Exclusive): ₦18,750.00
Total: ₦268,750.00

📅 Due: Nov 19, 2025
📊 Status: Draft
```

---

### Invoice with Modern Template
```
Create invoice modern template for ABC Ltd, 100 units product at 1000 each
```

**Response:**
```
✅ Invoice Created Successfully!

📄 Invoice #: INV-202510-0002
👤 Client: ABC Ltd
🎨 Template: Modern

💰 Amount Breakdown:
Subtotal: ₦100,000.00
VAT (7.5% Exclusive): ₦7,500.00
Total: ₦107,500.00
```

---

### Invoice with Professional Template
```
Create professional invoice for Tech Solutions, 5 servers at 50000
```

---

### Invoice with VAT Inclusive
```
Create invoice with VAT inclusive for Wholesale Ltd, 200 items at 500
```

**VAT Calculation:**
- Total (inclusive): ₦100,000.00
- VAT extracted: ₦6,976.74 (7.5% of base)
- Subtotal: ₦93,023.26

**Response:**
```
✅ Invoice Created Successfully!

📄 Invoice #: INV-202510-0003
👤 Client: Wholesale Ltd
🎨 Template: Classic

💰 Amount Breakdown:
Subtotal: ₦93,023.26
VAT (7.5% Inclusive): ₦6,976.74
Total: ₦100,000.00
```

---

### Invoice with Custom VAT Rate
```
Create invoice with 5% VAT for Export Client, 10 units at 10000
```

**Response:**
```
💰 Amount Breakdown:
Subtotal: ₦100,000.00
VAT (5.0% Exclusive): ₦5,000.00
Total: ₦105,000.00
```

---

### Combine Template + VAT Options
```
Create minimal template invoice with VAT inclusive for Retail Store, 50 products at 2000
```

**Response:**
```
🎨 Template: Minimal
VAT (7.5% Inclusive): ₦6,976.74
```

---

## Preview Invoice

After creating an invoice, preview it:

```
preview INV-202510-0001
```

**Response:**
```
📋 INVOICE PREVIEW
━━━━━━━━━━━━━━━━━━━━

📄 INV-202510-0001
🎨 Template: Classic
📝 Status: Draft

FROM:
Glyde Systems Ltd
123 Transport Avenue, Lagos
📧 billing@glydesystems.com
📞 +234 801 234 5678

TO:
Dangote Cement
45 Industrial Road, Ibadan
📧 accounts@dangote.com
📞 +234 802 345 6789

DATES:
Issued: Oct 20, 2025
Due: Nov 19, 2025

ITEMS:
━━━━━━━━━━━━━━━━━━━━
1. Bags of Cement
   50 × ₦5,000.00 = ₦250,000.00
━━━━━━━━━━━━━━━━━━━━

AMOUNT BREAKDOWN:
Subtotal: ₦250,000.00
VAT (7.5% Exclusive): ₦18,750.00
━━━━━━━━━━━━━━━━━━━━
TOTAL: ₦268,750.00

PAYMENT DETAILS:
Method: Bank Transfer
Account Name: Glyde Systems Ltd
Account Number: 0123456789
Bank: GTBank
Code: 058

NOTES:
Payment due within 30 days

━━━━━━━━━━━━━━━━━━━━
💡 To see the full PDF design, visit your dashboard.

Next Steps:
• Type "send INV-202510-0001" to email to client
• Type "edit invoice" to make changes
• The actual invoice will use the "classic" template with your logo
```

---

## Send Invoice

```
send INV-202510-0001
```

**Response:**
```
✅ Invoice INV-202510-0001 marked as "Sent"!

📧 To send the PDF via email:
1. Go to your dashboard
2. Open the invoice
3. Click "Email Invoice"

Or set up automatic email sending in Settings > Integrations.

💡 We're working on direct email sending from WhatsApp!
```

---

## List All Invoices

```
list invoices
```

**Response:**
```
📄 Your Invoices (15)

1. ✅ INV-202510-0001
   Client: Dangote Cement
   Amount: ₦268,750.00
   Status: Paid
   Template: Classic

2. 📧 INV-202510-0002
   Client: ABC Ltd
   Amount: ₦107,500.00
   Status: Sent
   Template: Modern

3. 📝 INV-202510-0003
   Client: Wholesale Ltd
   Amount: ₦100,000.00
   Status: Draft
   Template: Minimal
```

---

## Advanced Examples

### Multi-Item Invoice with Template
```
Create modern invoice for Tech Corp:
- 10 laptops at 150000
- 5 monitors at 50000
- 20 keyboards at 5000
```

### Invoice with Notes
```
Create professional invoice for VIP Client, 1 service package at 500000, add note: "Payment terms: 50% upfront, 50% on completion"
```

### No VAT Invoice (0% VAT)
```
Create invoice with 0% VAT for Tax Exempt Client, 100 items at 1000
```

---

## Template Visual Differences

When you view invoices in your **dashboard**, each template has distinct styling:

### Classic Template 📋
- Traditional border layout
- Company logo at top
- Clean table for items
- Professional font (Helvetica/Arial)
- Black & white color scheme

### Modern Template ✨
- Contemporary gradient header
- Larger, bold invoice number
- Color-coded status badges
- Modern sans-serif fonts
- Accent colors (blues/purples)

### Minimal Template 📄
- Maximum white space
- Thin dividing lines
- Subtle typography
- Focus on content clarity
- Grey-scale palette

### Professional Template 💼
- Corporate letterhead style
- Formal layout
- Structured sections
- Business-appropriate colors
- Classic serif fonts for body

---

## VAT Calculation Examples

### 7.5% VAT Exclusive (Default)
```
Subtotal: ₦100,000.00
VAT: ₦7,500.00
Total: ₦107,500.00
```

### 7.5% VAT Inclusive
```
Total: ₦100,000.00
VAT extracted: ₦6,976.74
Subtotal: ₦93,023.26
```

**Formula:**
- Exclusive: `VAT = Subtotal × Rate`
- Inclusive: `VAT = Total × (Rate / (100 + Rate))`

---

## WhatsApp AI Recognition

The AI understands variations like:

**Template Selection:**
- "modern template"
- "use professional design"
- "minimal invoice"
- "classic style"

**VAT Options:**
- "with VAT inclusive"
- "VAT included in price"
- "add VAT on top" (exclusive)
- "5% tax rate"
- "no VAT" (0%)

**Combined:**
- "modern template with VAT inclusive"
- "professional design, 5% VAT"
- "minimal invoice, VAT already included"

---

## Integration with Dashboard

### How Templates Work
1. **WhatsApp**: Specify template when creating invoice
2. **Firestore**: Invoice saved with `template` field
3. **Dashboard**: Invoice renders using selected template
4. **PDF Generation**: Uses template styling for export

### Template Field in Firestore
```typescript
{
  invoiceNumber: "INV-202510-0001",
  template: "modern",  // classic | modern | minimal | professional
  vatRate: 7.5,
  vatInclusive: false,  // true | false
  // ... other fields
}
```

### Viewing in Dashboard
1. Go to **Invoices** screen
2. Click on any invoice
3. See it rendered with the selected template
4. Export to PDF maintains template design

---

## Troubleshooting

### "Template not recognized"
**Issue**: AI didn't understand template request
**Solution**: Use explicit keywords:
- ✅ "modern template"
- ✅ "professional invoice"
- ❌ "fancy design" (too vague)

### VAT calculation seems wrong
**Issue**: Confusion between inclusive/exclusive
**Solution**: Always specify:
- ✅ "with VAT inclusive"
- ✅ "VAT exclusive" or "add VAT on top"

### Preview not showing
**Issue**: Invoice number not found
**Solution**: Check invoice number:
```
list invoices  # Get correct invoice number
preview INV-202510-0001  # Use exact number
```

---

## Complete Command Reference

### Invoice Creation
```
create invoice for [Client], [Items] at [Price]
create invoice [template] for [Client], [Items] at [Price]
create invoice with VAT [inclusive|exclusive] for [Client]
create invoice [template] with [VAT option] for [Client]
```

### Invoice Management
```
preview invoice [INV-NUMBER]
preview [INV-NUMBER]
send invoice [INV-NUMBER]
send [INV-NUMBER]
list invoices
show all invoices
```

### Help
```
help
menu
```

---

## Files Changed

### Backend (Cloud Functions)
1. **types.ts** - Added template, vatInclusive, vatRate to InvoiceCreationEntities
2. **commandHandlers.ts** - Updated invoice creation with VAT logic and template support
3. **invoiceHandlers.ts** - New file with preview and send handlers
4. **messageProcessor.ts** - Added PREVIEW_INVOICE and SEND_INVOICE intents
5. **aiService.ts** - Updated AI prompts to recognize templates and VAT options

### Features Added
- ✅ Template selection (classic, modern, minimal, professional)
- ✅ VAT inclusive/exclusive calculation
- ✅ Custom VAT rates
- ✅ Invoice preview (detailed text format)
- ✅ Invoice sending (marks as sent)
- ✅ Enhanced success messages
- ✅ Updated help menu

---

## Next Steps (Future Enhancements)

### 1. PDF Generation from WhatsApp
- Generate actual PDF in Cloud Functions
- Send PDF as WhatsApp document attachment
- Use template styling in PDF

### 2. Direct Email Sending
- Integrate with SendGrid/Mailgun
- Send invoice PDF directly from WhatsApp
- Track email delivery status

### 3. Invoice Editing
```
edit invoice INV-202510-0001, change total to 300000
edit invoice INV-202510-0001, add item: delivery fee 5000
```

### 4. Custom Templates
- Allow users to create custom templates in dashboard
- Reference custom template from WhatsApp: "my custom template"

### 5. Multi-Currency Support
```
create invoice in USD for International Client
```

---

## Testing Checklist

### Basic Functionality
- [ ] Create invoice with default settings
- [ ] Create invoice with classic template
- [ ] Create invoice with modern template
- [ ] Create invoice with minimal template
- [ ] Create invoice with professional template

### VAT Testing
- [ ] Create invoice VAT exclusive (default)
- [ ] Create invoice VAT inclusive
- [ ] Create invoice with custom VAT rate (5%)
- [ ] Create invoice with 0% VAT

### Combined Features
- [ ] Modern template + VAT inclusive
- [ ] Professional template + 5% VAT
- [ ] Minimal template + VAT exclusive

### Preview & Send
- [ ] Preview invoice after creation
- [ ] Preview existing invoice
- [ ] Send invoice to client
- [ ] List all invoices

### Dashboard Verification
- [ ] Invoice appears with correct template
- [ ] VAT calculated correctly
- [ ] All fields populated
- [ ] PDF export works with template

---

## Support

**Documentation**: [WHATSAPP_FIXES.md](./WHATSAPP_FIXES.md)
**Deployment**: [DEPLOY_WHATSAPP_FIXES.md](./DEPLOY_WHATSAPP_FIXES.md)

**Questions?** Type "HELP" in WhatsApp to see the full command menu!
