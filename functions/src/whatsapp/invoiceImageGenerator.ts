/**
 * Invoice Image Generator for WhatsApp
 * Generates invoice preview images using HTML templates
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const getDb = () => admin.firestore();

/**
 * Generate HTML for invoice template
 * This mirrors the React templates but uses plain HTML/CSS
 */
function generateInvoiceHTML(invoice: any): string {
  // Calculate amounts with VAT
  // Support both field name formats: quantity/unitPrice (new) and units/price (old)
  const subtotalAmount = invoice.items.reduce((sum: number, item: any) =>
    sum + (item.quantity || item.units || 0) * (item.unitPrice || item.price || 0), 0
  );

  const vatRate = invoice.vatRate || 0;
  const vatInclusive = invoice.vatInclusive || false;

  let subtotal = subtotalAmount;
  let vatAmount = 0;
  let totalAmount = subtotalAmount;

  if (vatRate > 0) {
    if (vatInclusive) {
      vatAmount = (subtotalAmount * vatRate) / (100 + vatRate);
      subtotal = subtotalAmount - vatAmount;
      totalAmount = subtotalAmount;
    } else {
      vatAmount = (subtotalAmount * vatRate) / 100;
      subtotal = subtotalAmount;
      totalAmount = subtotalAmount + vatAmount;
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const template = invoice.template || 'classic';

  // Generate items HTML
  // Support both field name formats: quantity/unitPrice (new) and units/price (old)
  const itemsHTML = invoice.items.map((item: any, index: number) => {
    const qty = item.quantity || item.units || 0;
    const price = item.unitPrice || item.price || 0;
    const itemTotal = qty * price;
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 16px; text-align: left;">${item.description || ''}</td>
        <td style="padding: 12px 16px; text-align: right;">${qty}</td>
        <td style="padding: 12px 16px; text-align: right;">${formatCurrency(price)}</td>
        <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${formatCurrency(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  // Classic Template HTML
  if (template === 'classic') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: white;
      padding: 40px;
    }
    .invoice-container {
      width: 794px;
      min-height: 1123px;
      background: white;
      padding: 60px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      border-bottom: 3px solid #1f2937;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 48px;
      font-weight: bold;
      color: #1f2937;
    }
    .header .invoice-number {
      color: #6b7280;
      margin-top: 8px;
      font-size: 18px;
    }
    .company-logo {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
    }
    .company-logo img {
      max-height: 60px;
      max-width: 200px;
      object-fit: contain;
    }
    .dates {
      text-align: right;
      margin-bottom: 30px;
    }
    .dates .label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .dates .value {
      font-weight: 600;
      color: #1f2937;
      margin-top: 4px;
      margin-bottom: 12px;
    }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #e5e7eb;
    }
    .address-block .label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .address-block .name {
      font-weight: bold;
      color: #1f2937;
      font-size: 18px;
      margin-bottom: 4px;
    }
    .address-block .details {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.6;
    }
    .to-address {
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background-color: #f3f4f6;
    }
    th {
      padding: 12px 16px;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    th.text-left { text-align: left; }
    th.text-right { text-align: right; }
    .totals {
      margin-left: auto;
      width: 50%;
      margin-top: 20px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 16px;
      font-size: 14px;
    }
    .totals-row.subtotal {
      color: #4b5563;
    }
    .totals-row.vat {
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 12px;
    }
    .totals-row.total {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      padding-top: 12px;
      background-color: #f9fafb;
    }
    .payment-details {
      margin-top: 40px;
      padding: 20px;
      background-color: #f9fafb;
      border-radius: 8px;
    }
    .payment-details h3 {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .payment-details .info {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.8;
    }
    .notes {
      margin-top: 30px;
      padding: 20px;
      border-left: 4px solid #3b82f6;
      background-color: #eff6ff;
    }
    .notes h3 {
      font-size: 14px;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .notes p {
      font-size: 14px;
      color: #1e3a8a;
      line-height: 1.6;
    }
    .signature-section {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
      text-align: right;
    }
    .signature-section img {
      max-height: 80px;
      max-width: 250px;
      object-fit: contain;
      display: inline-block;
    }
    .signature-section .label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div>
        <h1>INVOICE</h1>
        <div class="invoice-number">#${invoice.invoiceNumber || 'INV-XXXX'}</div>
      </div>
      <div class="company-logo">
        ${invoice.from?.logoUrl ? `<img src="${invoice.from.logoUrl}" alt="${invoice.from?.name || 'Company'} Logo" />` : invoice.from?.name || 'Your Company'}
      </div>
    </div>

    <!-- Dates -->
    <div class="dates">
      <div class="label">Issue Date</div>
      <div class="value">${invoice.issuedDate || ''}</div>
      <div class="label">Due Date</div>
      <div class="value">${invoice.dueDate || ''}</div>
    </div>

    <!-- Addresses -->
    <div class="addresses">
      <div class="address-block">
        <div class="label">From</div>
        <div class="name">${invoice.from?.name || 'Your Company'}</div>
        <div class="details">
          ${invoice.from?.address || ''}<br>
          ${invoice.from?.email || ''}<br>
          ${invoice.from?.phone || ''}
        </div>
      </div>
      <div class="address-block to-address">
        <div class="label">Bill To</div>
        <div class="name">${invoice.to?.name || invoice.clientName || 'Client'}</div>
        <div class="details">
          ${invoice.to?.address || ''}<br>
          ${invoice.to?.email || ''}<br>
          ${invoice.to?.phone || ''}
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th class="text-left">Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-row subtotal">
        <span>Subtotal:</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      ${vatRate > 0 ? `
      <div class="totals-row vat">
        <span>VAT (${vatRate}% ${vatInclusive ? 'Inclusive' : 'Exclusive'}):</span>
        <span>${formatCurrency(vatAmount)}</span>
      </div>
      ` : ''}
      <div class="totals-row total">
        <span>TOTAL:</span>
        <span>${formatCurrency(totalAmount)}</span>
      </div>
    </div>

    <!-- Payment Details -->
    ${invoice.paymentDetails ? `
    <div class="payment-details">
      <h3>Payment Details</h3>
      <div class="info">
        <strong>Method:</strong> ${invoice.paymentDetails.method || ''}<br>
        ${invoice.paymentDetails.accountName ? `<strong>Account Name:</strong> ${invoice.paymentDetails.accountName}<br>` : ''}
        ${invoice.paymentDetails.accountNumber ? `<strong>Account Number:</strong> ${invoice.paymentDetails.accountNumber}<br>` : ''}
        ${invoice.paymentDetails.bankName ? `<strong>Bank:</strong> ${invoice.paymentDetails.bankName}<br>` : ''}
        ${invoice.paymentDetails.code ? `<strong>Code:</strong> ${invoice.paymentDetails.code}` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Notes -->
    ${invoice.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${invoice.notes}</p>
    </div>
    ` : ''}

    <!-- Signature -->
    ${invoice.from?.signatureUrl ? `
    <div class="signature-section">
      <img src="${invoice.from.signatureUrl}" alt="Authorized Signature" />
      <div class="label">Authorized Signature</div>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `;
  }

  // Modern Template HTML
  if (template === 'modern') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
    }
    .invoice-container {
      width: 794px;
      min-height: 1123px;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 60px;
      color: white;
    }
    .header h1 {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .header .invoice-number {
      font-size: 20px;
      opacity: 0.9;
    }
    .content {
      padding: 60px;
    }
    .dates {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .date-item .label {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }
    .date-item .value {
      font-weight: 700;
      color: #667eea;
      font-size: 16px;
    }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .address-block {
      flex: 1;
    }
    .address-block .label {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }
    .address-block .name {
      font-weight: 700;
      color: #1f2937;
      font-size: 18px;
      margin-bottom: 6px;
    }
    .address-block .details {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.7;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      border-radius: 8px;
      overflow: hidden;
    }
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    th {
      padding: 14px 16px;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tbody tr {
      border-bottom: 1px solid #f3f4f6;
    }
    td {
      padding: 14px 16px;
      color: #4b5563;
    }
    .totals {
      margin-left: auto;
      width: 50%;
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 15px;
    }
    .totals-row.total {
      font-size: 24px;
      font-weight: 800;
      color: #667eea;
      padding-top: 12px;
      border-top: 2px solid #e5e7eb;
      margin-top: 8px;
    }
    .payment-details {
      margin-top: 40px;
      padding: 24px;
      background: linear-gradient(135deg, #f0f4ff 0%, #f5f3ff 100%);
      border-radius: 8px;
      border: 2px solid #e0e7ff;
    }
    .payment-details h3 {
      font-size: 14px;
      font-weight: 700;
      color: #5b21b6;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .payment-details .info {
      font-size: 14px;
      color: #4c1d95;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <h1>INVOICE</h1>
      <div class="invoice-number">#${invoice.invoiceNumber || 'INV-XXXX'}</div>
    </div>
    <div class="content">
      <div class="dates">
        <div class="date-item">
          <div class="label">Issue Date</div>
          <div class="value">${invoice.issuedDate || ''}</div>
        </div>
        <div class="date-item">
          <div class="label">Due Date</div>
          <div class="value">${invoice.dueDate || ''}</div>
        </div>
      </div>
      <div class="addresses">
        <div class="address-block">
          <div class="label">From</div>
          <div class="name">${invoice.from?.name || 'Your Company'}</div>
          <div class="details">
            ${invoice.from?.address || ''}<br>
            ${invoice.from?.email || ''}<br>
            ${invoice.from?.phone || ''}
          </div>
        </div>
        <div class="address-block">
          <div class="label">Bill To</div>
          <div class="name">${invoice.to?.name || invoice.clientName || 'Client'}</div>
          <div class="details">
            ${invoice.to?.address || ''}<br>
            ${invoice.to?.email || ''}<br>
            ${invoice.to?.phone || ''}
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Description</th>
            <th style="text-align: right;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        ${vatRate > 0 ? `
        <div class="totals-row">
          <span>VAT (${vatRate}%):</span>
          <span>${formatCurrency(vatAmount)}</span>
        </div>
        ` : ''}
        <div class="totals-row total">
          <span>TOTAL:</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>
      </div>
      ${invoice.paymentDetails ? `
      <div class="payment-details">
        <h3>Payment Details</h3>
        <div class="info">
          <strong>Method:</strong> ${invoice.paymentDetails.method || ''}<br>
          ${invoice.paymentDetails.accountName ? `<strong>Account Name:</strong> ${invoice.paymentDetails.accountName}<br>` : ''}
          ${invoice.paymentDetails.accountNumber ? `<strong>Account Number:</strong> ${invoice.paymentDetails.accountNumber}<br>` : ''}
          ${invoice.paymentDetails.bankName ? `<strong>Bank:</strong> ${invoice.paymentDetails.bankName}<br>` : ''}
        </div>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
    `;
  }

  // Minimal Template HTML
  if (template === 'minimal') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      background: white;
      padding: 40px;
    }
    .invoice-container {
      width: 794px;
      min-height: 1123px;
      padding: 80px;
    }
    .header {
      margin-bottom: 60px;
      border-bottom: 1px solid #000;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 400;
      color: #000;
      letter-spacing: 0.3em;
      margin-bottom: 10px;
    }
    .header .invoice-number {
      font-size: 14px;
      color: #666;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin-bottom: 12px;
    }
    .section-content {
      font-size: 14px;
      color: #000;
      line-height: 1.8;
    }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 60px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 40px 0;
    }
    thead {
      border-bottom: 1px solid #000;
    }
    th {
      padding: 12px 0;
      font-weight: 400;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #000;
    }
    td {
      padding: 16px 0;
      font-size: 13px;
      color: #333;
      border-bottom: 1px solid #e5e5e5;
    }
    .totals {
      margin-left: auto;
      width: 40%;
      margin-top: 40px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
      color: #000;
    }
    .totals-row.total {
      font-size: 18px;
      font-weight: 600;
      border-top: 2px solid #000;
      padding-top: 16px;
      margin-top: 10px;
    }
    .payment-section {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #e5e5e5;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <h1>INVOICE</h1>
      <div class="invoice-number">${invoice.invoiceNumber || 'INV-XXXX'}</div>
    </div>
    <div class="section">
      <div class="section-title">Issue Date</div>
      <div class="section-content">${invoice.issuedDate || ''}</div>
    </div>
    <div class="section">
      <div class="section-title">Due Date</div>
      <div class="section-content">${invoice.dueDate || ''}</div>
    </div>
    <div class="addresses">
      <div class="section">
        <div class="section-title">From</div>
        <div class="section-content">
          <strong>${invoice.from?.name || 'Your Company'}</strong><br>
          ${invoice.from?.address || ''}<br>
          ${invoice.from?.email || ''}<br>
          ${invoice.from?.phone || ''}
        </div>
      </div>
      <div class="section">
        <div class="section-title">Bill To</div>
        <div class="section-content">
          <strong>${invoice.to?.name || invoice.clientName || 'Client'}</strong><br>
          ${invoice.to?.address || ''}<br>
          ${invoice.to?.email || ''}<br>
          ${invoice.to?.phone || ''}
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="text-align: left;">Description</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      ${vatRate > 0 ? `
      <div class="totals-row">
        <span>VAT ${vatRate}%</span>
        <span>${formatCurrency(vatAmount)}</span>
      </div>
      ` : ''}
      <div class="totals-row total">
        <span>Total</span>
        <span>${formatCurrency(totalAmount)}</span>
      </div>
    </div>
    ${invoice.paymentDetails ? `
    <div class="payment-section">
      <div class="section-title">Payment Details</div>
      <div class="section-content">
        ${invoice.paymentDetails.method || ''}<br>
        ${invoice.paymentDetails.accountName || ''}<br>
        ${invoice.paymentDetails.accountNumber || ''}<br>
        ${invoice.paymentDetails.bankName || ''}
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `;
  }

  // Professional Template HTML
  if (template === 'professional') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #f5f5f0;
      padding: 40px;
    }
    .invoice-container {
      width: 794px;
      min-height: 1123px;
      background: white;
      padding: 60px;
      border: 8px solid #2c3e50;
    }
    .letterhead {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px double #2c3e50;
    }
    .letterhead .company-name {
      font-size: 32px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
      letter-spacing: 0.1em;
    }
    .letterhead .company-details {
      font-size: 12px;
      color: #5a6c7d;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 36px;
      font-weight: bold;
      color: #2c3e50;
      letter-spacing: 0.2em;
      margin-bottom: 12px;
    }
    .header .invoice-number {
      font-size: 16px;
      color: #7f8c8d;
      letter-spacing: 0.1em;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .info-box {
      flex: 1;
      padding: 20px;
      background: #f8f9fa;
      border-left: 4px solid #2c3e50;
      margin-right: 20px;
    }
    .info-box:last-child {
      margin-right: 0;
    }
    .info-box .title {
      font-size: 11px;
      color: #5a6c7d;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .info-box .content {
      font-size: 14px;
      color: #2c3e50;
      line-height: 1.8;
    }
    .info-box .content strong {
      display: block;
      font-size: 16px;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 40px 0;
    }
    thead {
      background: #2c3e50;
      color: white;
    }
    th {
      padding: 14px 12px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    tbody tr {
      border-bottom: 1px solid #e9ecef;
    }
    td {
      padding: 14px 12px;
      font-size: 14px;
      color: #2c3e50;
    }
    .summary {
      margin-left: auto;
      width: 45%;
      background: #f8f9fa;
      padding: 24px;
      border: 2px solid #e9ecef;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 15px;
      color: #2c3e50;
    }
    .summary-row.total {
      font-size: 22px;
      font-weight: bold;
      padding-top: 16px;
      margin-top: 12px;
      border-top: 3px double #2c3e50;
    }
    .footer {
      margin-top: 60px;
      text-align: center;
      padding-top: 30px;
      border-top: 3px double #2c3e50;
      font-size: 12px;
      color: #7f8c8d;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="letterhead">
      <div class="company-name">${invoice.from?.name || 'YOUR COMPANY'}</div>
      <div class="company-details">
        ${invoice.from?.address || ''} • ${invoice.from?.phone || ''} • ${invoice.from?.email || ''}
      </div>
    </div>
    <div class="header">
      <h1>INVOICE</h1>
      <div class="invoice-number">${invoice.invoiceNumber || 'INV-XXXX'}</div>
    </div>
    <div class="info-grid">
      <div class="info-box">
        <div class="title">Date Information</div>
        <div class="content">
          <strong>Issue Date</strong>
          ${invoice.issuedDate || ''}<br><br>
          <strong>Due Date</strong>
          ${invoice.dueDate || ''}
        </div>
      </div>
      <div class="info-box">
        <div class="title">Bill To</div>
        <div class="content">
          <strong>${invoice.to?.name || invoice.clientName || 'Client'}</strong>
          ${invoice.to?.address || ''}<br>
          ${invoice.to?.email || ''}<br>
          ${invoice.to?.phone || ''}
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="text-align: left;">Description</th>
          <th style="text-align: right;">Quantity</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    <div class="summary">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      ${vatRate > 0 ? `
      <div class="summary-row">
        <span>VAT (${vatRate}%):</span>
        <span>${formatCurrency(vatAmount)}</span>
      </div>
      ` : ''}
      <div class="summary-row total">
        <span>TOTAL DUE:</span>
        <span>${formatCurrency(totalAmount)}</span>
      </div>
    </div>
    ${invoice.paymentDetails ? `
    <div class="info-box" style="margin-top: 40px; margin-right: 0;">
      <div class="title">Payment Information</div>
      <div class="content">
        <strong>${invoice.paymentDetails.method || 'Bank Transfer'}</strong>
        ${invoice.paymentDetails.accountName ? `Account Name: ${invoice.paymentDetails.accountName}<br>` : ''}
        ${invoice.paymentDetails.accountNumber ? `Account Number: ${invoice.paymentDetails.accountNumber}<br>` : ''}
        ${invoice.paymentDetails.bankName ? `Bank: ${invoice.paymentDetails.bankName}` : ''}
      </div>
    </div>
    ` : ''}
    <div class="footer">
      Thank you for your business
    </div>
  </div>
</body>
</html>
    `;
  }

  // Default to classic if template not recognized
  return generateInvoiceHTML({ ...invoice, template: 'classic' });
}

/**
 * Generate invoice preview image URL
 * Using a serverless HTML-to-image service or Puppeteer
 */
export async function generateInvoiceImage(invoiceId: string): Promise<string | null> {
  try {
    // Fetch invoice from Firestore
    const invoiceDoc = await getDb().collection('invoices').doc(invoiceId).get();

    if (!invoiceDoc.exists) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceDoc.data();

    // Generate HTML
    const html = generateInvoiceHTML(invoice);

    // Option 1: Use a third-party HTML-to-Image API (recommended for Firebase Functions)
    // Examples: HTMLCSStoImage.com, ApiFlash.com, Urlbox.io
    // These services convert HTML to images via API

    // For now, we'll return a placeholder approach
    // You'll need to implement one of these options:

    functions.logger.info('Invoice HTML generated', { invoiceId, htmlLength: html.length });

    // TODO: Implement actual image generation using one of:
    // 1. HTMLCSStoImage API
    // 2. Puppeteer (requires Firebase Functions 2nd gen with larger memory)
    // 3. Firebase Storage with pre-rendered template

    return null; // Placeholder
  } catch (error: any) {
    functions.logger.error('Error generating invoice image', {
      error: error.message,
      invoiceId
    });
    return null;
  }
}

export { generateInvoiceHTML };
