/**
 * WhatsApp Invoice Handlers
 * Handles invoice preview and sending via WhatsApp
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendWhatsAppMessage } from './webhook';
import { generateInvoiceHTML } from './invoiceImageGenerator';
import { updateConversationState } from './conversationManager';

const getDb = () => admin.firestore();

/**
 * Handle invoice preview request
 * Generates invoice image preview using HTMLCSStoImage API
 *
 * Can be called two ways:
 * 1. handlePreviewInvoice(organizationId, invoiceNumber, whatsappNumber, phoneNumberId) - direct call
 * 2. handlePreviewInvoice(whatsappUser, entities, phoneNumberId, whatsappNumber) - AI service call
 */
export async function handlePreviewInvoice(
  organizationIdOrUser: string | any,
  invoiceNumberOrEntities: string | any,
  whatsappNumberOrPhoneId: string,
  phoneNumberIdOrWhatsappNumber: string
): Promise<void> {
  // Determine which signature was used (OUTSIDE try-catch so variables are accessible in catch)
  let organizationId: string;
  let invoiceNumber: string;
  let whatsappNumber: string;
  let phoneNumberId: string;

  if (typeof organizationIdOrUser === 'string') {
    // Direct call: (organizationId, invoiceNumber, whatsappNumber, phoneNumberId)
    organizationId = organizationIdOrUser;
    invoiceNumber = invoiceNumberOrEntities;
    whatsappNumber = whatsappNumberOrPhoneId;
    phoneNumberId = phoneNumberIdOrWhatsappNumber;
  } else {
    // AI service call: (whatsappUser, entities, phoneNumberId, whatsappNumber)
    const whatsappUser = organizationIdOrUser;
    const entities = invoiceNumberOrEntities;
    organizationId = whatsappUser.organizationId;
    invoiceNumber = entities.invoiceNumber;
    phoneNumberId = whatsappNumberOrPhoneId;
    whatsappNumber = phoneNumberIdOrWhatsappNumber;
  }

  try {

    if (!invoiceNumber) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: 'Please specify which invoice to preview.\n\nExample: "preview INV-202510-0001"'
      });
      return;
    }

    // Send "generating" message immediately
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: '👀 Generating invoice preview... ⏳\n\nThis may take a few seconds...'
    });

    // Find invoice by number
    const invoicesSnapshot = await getDb()
      .collection('invoices')
      .where('organizationId', '==', organizationId)
      .where('invoiceNumber', '==', invoiceNumber)
      .limit(1)
      .get();

    if (invoicesSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `Invoice "${invoiceNumber}" not found.\n\nType "list invoices" to see all your invoices.`
      });
      return;
    }

    const invoiceDoc = invoicesSnapshot.docs[0];
    const invoice = invoiceDoc.data();

    // Generate HTML for invoice
    const html = generateInvoiceHTML(invoice);

    // Get HTMLCSStoImage credentials
    const HCTI_USER_ID = process.env.HCTI_USER_ID || functions.config().hcti?.user_id;
    const HCTI_API_KEY = process.env.HCTI_API_KEY || functions.config().hcti?.api_key;

    if (!HCTI_USER_ID || !HCTI_API_KEY) {
      functions.logger.error('HTMLCSStoImage credentials not configured');
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: 'Sorry, invoice preview is not configured. Please contact support.'
      });
      return;
    }

    // Generate image using HTMLCSStoImage API
    const authString = Buffer.from(`${HCTI_USER_ID}:${HCTI_API_KEY}`).toString('base64');

    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html,
        viewport_width: 794,
        viewport_height: 1123,
        device_scale: 2 // High DPI for better quality
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      functions.logger.error('HTMLCSStoImage API error', { error: errorData });
      throw new Error(`Image generation failed: ${JSON.stringify(errorData)}`);
    }

    const imageData = await response.json();

    // Send invoice image via WhatsApp
    const templateName = (invoice.template || 'classic').charAt(0).toUpperCase() + (invoice.template || 'classic').slice(1);
    const vatMode = invoice.vatInclusive ? 'Inclusive' : 'Exclusive';

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'image',
      image: {
        link: imageData.url,
        caption: `📄 *Invoice ${invoice.invoiceNumber}*\n\n🎨 Template: ${templateName}\n📊 Status: ${invoice.status}\n💰 Total: ₦${(invoice.total || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n📝 VAT: ${invoice.vatRate || 7.5}% ${vatMode}\n\n*Next Steps:*\n• Type "send ${invoice.invoiceNumber}" to email to client\n• Visit dashboard for full details`
      }
    });

    functions.logger.info('Invoice preview sent via WhatsApp', {
      invoiceId: invoiceDoc.id,
      invoiceNumber,
      organizationId
    });

    // Store invoice number for contextual follow-ups
    await updateConversationState(whatsappNumber, {
      lastInvoiceNumber: invoice.invoiceNumber,
      lastClientName: invoice.to?.name || invoice.clientName
    });

  } catch (error: any) {
    functions.logger.error('Invoice preview error', { error: error.message, stack: error.stack });
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: 'Sorry, I encountered an error generating the invoice preview. Please try again.'
    });
  }
}

/**
 * Handle sending invoice to client
 * TODO: Integrate with email service or PDF generation
 */
export async function handleSendInvoice(
  whatsappUser: any,
  entities: any,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId } = whatsappUser;
    const invoiceNumber = entities.invoiceNumber;

    if (!invoiceNumber) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: 'Please specify which invoice to send.\n\nExample: "send INV-202510-0001"'
      });
      return;
    }

    // Find invoice by number
    const invoicesSnapshot = await getDb()
      .collection('invoices')
      .where('organizationId', '==', organizationId)
      .where('invoiceNumber', '==', invoiceNumber)
      .limit(1)
      .get();

    if (invoicesSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `Invoice "${invoiceNumber}" not found.\n\nType "list invoices" to see all your invoices.`
      });
      return;
    }

    const invoiceDoc = invoicesSnapshot.docs[0];
    const invoice = invoiceDoc.data();

    // Check if client has email
    if (!invoice.to?.email && !invoice.clientEmail) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `Cannot send invoice: Client "${invoice.clientName}" doesn't have an email address.\n\nPlease add their email first, or send the invoice manually from the dashboard.`
      });
      return;
    }

    // Update invoice status to "Sent"
    await getDb().collection('invoices').doc(invoiceDoc.id).update({
      status: 'Sent',
      sentDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // TODO: Trigger email sending Cloud Function or Webhook
    // For now, just mark as sent and notify user to send from dashboard

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `✅ Invoice ${invoiceNumber} marked as "Sent"!\n\n📧 To send the PDF via email:\n1. Go to your dashboard\n2. Open the invoice\n3. Click "Email Invoice"\n\nOr set up automatic email sending in Settings > Integrations.\n\n💡 We're working on direct email sending from WhatsApp!`
    });

    functions.logger.info('Invoice marked as sent via WhatsApp', {
      invoiceId: invoiceDoc.id,
      invoiceNumber,
      organizationId
    });

  } catch (error: any) {
    functions.logger.error('Send invoice error', { error: error.message, stack: error.stack });
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: 'Sorry, I encountered an error sending the invoice. Please try again or send it from the dashboard.'
    });
  }
}
