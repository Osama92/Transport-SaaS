/**
 * WhatsApp Command Handlers
 * Handles specific business operations triggered by user commands
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { InvoiceCreationEntities, ClientAdditionEntities } from './types';
import { Intent } from './types';
import { sendWhatsAppMessage } from './webhook';
import { storeError, addToConversationHistory, updateConversationState } from './conversationManager';

// Export new handlers
export { handleListClients, handleListDrivers, handleListInvoices, handleListTransactions } from './newHandlers';
export { handlePreviewInvoice, handleSendInvoice } from './invoiceHandlers';

// Lazy initialization - only access Firestore when functions are called
const getDb = () => admin.firestore();

/**
 * Handle invoice creation via WhatsApp
 */
export async function handleCreateInvoice(
  whatsappUser: any,
  entities: InvoiceCreationEntities,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId, userId } = whatsappUser;

    // Validate required data
    if (!entities.clientName || !entities.items || entities.items.length === 0) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: 'To create an invoice, I need:\n\n✅ Client name\n✅ Items/services\n✅ Amount\n\nExample: "Create invoice for ABC Ltd, 50 bags cement at ₦5000 each"'
      });
      return;
    }

    // Search for existing client or ask to create new one
    const clientSnapshot = await getDb()
      .collection('clients')
      .where('organizationId', '==', organizationId)
      .where('name', '>=', entities.clientName)
      .where('name', '<=', entities.clientName + '\uf8ff')
      .limit(1)
      .get();

    let clientId: string;
    let clientName: string;

    if (!clientSnapshot.empty) {
      // Client exists
      const clientDoc = clientSnapshot.docs[0];
      clientId = clientDoc.id;
      clientName = clientDoc.data().name;
    } else {
      // Ask to create client
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `Client "${entities.clientName}" not found in your records.\n\nWould you like to add them?\n\nReply:\n✅ YES - Add client\n❌ NO - Cancel invoice`
      });

      // Store pending action in conversation state
      await getDb().collection('whatsappConversations').doc(whatsappNumber).set({
        userId,
        organizationId,
        pendingAction: 'confirm_add_client_for_invoice',
        pendingData: entities,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return;
    }

    // Get client details for invoice
    const clientDoc = await getDb().collection('clients').doc(clientId).get();
    const clientData = clientDoc.data();

    // Calculate totals with VAT
    let subtotal = entities.totalAmount || 0;
    if (!subtotal && entities.items) {
      subtotal = entities.items.reduce((sum, item) => {
        const itemTotal = (item.unitPrice || 0) * item.quantity;
        return sum + itemTotal;
      }, 0);
    }

    // VAT calculation (use custom rate if provided, otherwise Nigeria standard 7.5%)
    const vatRate = entities.vatRate || 7.5;
    const vatInclusive = entities.vatInclusive !== undefined ? entities.vatInclusive : false;

    let vatAmount = 0;
    let totalAmount = 0;

    if (vatInclusive) {
      // VAT is already included in subtotal - extract it
      totalAmount = subtotal;
      vatAmount = (subtotal * vatRate) / (100 + vatRate);
      subtotal = totalAmount - vatAmount;
    } else {
      // VAT added on top of subtotal
      vatAmount = (subtotal * vatRate) / 100;
      totalAmount = subtotal + vatAmount;
    }

    // Get current date for invoice
    const now = new Date();
    const issuedDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const dueDate = entities.dueDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // Get organization details for "from" section
    const orgDoc = await getDb().collection('organizations').doc(organizationId).get();
    const orgData = orgDoc.data();

    // Create invoice with all required fields
    const invoiceRef = await getDb().collection('invoices').add({
      organizationId,
      clientId,
      clientName: clientData?.name || clientName,
      clientEmail: clientData?.email || '',
      clientAddress: clientData?.address || '',
      invoiceNumber: await generateInvoiceNumber(organizationId),
      project: 'WhatsApp Order',
      issuedDate,
      dueDate,
      // From details (organization)
      from: {
        name: orgData?.companyName || orgData?.name || 'Your Company',
        address: orgData?.address || '',
        email: orgData?.email || '',
        phone: orgData?.phone || '',
        logoUrl: orgData?.logoUrl || ''
      },
      // To details (client)
      to: {
        name: clientData?.name || clientName,
        address: clientData?.address || '',
        email: clientData?.email || '',
        phone: clientData?.phone || ''
      },
      // Items with proper format
      items: entities.items.map((item, index) => ({
        id: index + 1,
        description: item.description,
        units: item.quantity,
        price: item.unitPrice || 0
      })),
      // Financial details
      subtotal,
      vatRate,
      vatInclusive, // User's preference
      tax: vatAmount,
      total: totalAmount,
      currency: 'NGN',
      // Payment details
      paymentDetails: {
        method: orgData?.paymentDetails?.method || 'Bank Transfer',
        accountName: orgData?.paymentDetails?.accountName || orgData?.companyName || '',
        accountNumber: orgData?.paymentDetails?.accountNumber || '',
        code: orgData?.paymentDetails?.code || '',
        bankName: orgData?.paymentDetails?.bankName || ''
      },
      // Status and metadata
      status: 'Draft',
      template: entities.template || 'classic', // Use requested template or default to classic
      notes: entities.notes || 'Created via WhatsApp',
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdVia: 'whatsapp'
    });

    // Get the created invoice data
    const invoice = (await invoiceRef.get()).data();
    const templateName = (entities.template || 'classic').charAt(0).toUpperCase() + (entities.template || 'classic').slice(1);
    const vatMode = vatInclusive ? 'Inclusive' : 'Exclusive';

    // Send brief success message
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `✅ *Invoice Created!*\n\n📄 Invoice #: ${invoice?.invoiceNumber}\n👤 Client: ${clientName}\n🎨 Template: ${templateName}\n💰 Total: ₦${totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n👀 Generating preview...`
    });

    functions.logger.info('Invoice created via WhatsApp', {
      invoiceId: invoiceRef.id,
      organizationId,
      amount: totalAmount
    });

    // Immediately generate and show preview
    try {
      const { handlePreviewInvoice } = await import('./invoiceHandlers');

      // Show preview (this will send the image)
      await handlePreviewInvoice(
        organizationId,
        invoice?.invoiceNumber,
        whatsappNumber,
        phoneNumberId
      );

      // After preview, ask for confirmation
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `📋 *Does this invoice look good?*\n\n✅ Reply "Yes" or "Looks good" to confirm\n📧 Reply "Send" to send it to client immediately\n✏️ Reply "Edit" or describe changes to make corrections\n❌ Reply "Cancel" to discard\n\n💡 *Quick options:*\n• "yes" → Confirm invoice\n• "send" → Send to ${clientName}\n• "edit total 300000" → Change total amount\n• "edit client name to XYZ" → Update client details`
      });

      // Store conversation state to await confirmation
      await updateConversationState(whatsappNumber, {
        awaitingConfirmation: true,
        awaitingInput: 'invoice_confirmation',
        lastInvoiceNumber: invoice?.invoiceNumber,
        lastClientName: clientName,
        conversationData: {
          invoiceId: invoiceRef.id,
          invoiceNumber: invoice?.invoiceNumber,
          pendingAction: 'confirm_or_edit'
        }
      });

    } catch (previewError: any) {
      functions.logger.error('Preview generation failed after invoice creation', {
        error: previewError.message,
        invoiceId: invoiceRef.id
      });

      // Fallback: Show text details if preview fails
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `⚠️ Preview generation failed, but invoice was created.\n\n💰 *Amount Breakdown:*\nSubtotal: ₦${subtotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nVAT (${vatRate}% ${vatMode}): ₦${vatAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n*Total: ₦${totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n\n📅 Due: ${dueDate}\n\nType "preview" to try again, or "send" to send to client.`
      });

      // Still store context for follow-ups
      await updateConversationState(whatsappNumber, {
        lastInvoiceNumber: invoice?.invoiceNumber,
        lastClientName: clientName
      });
    }

    // Add to conversation history
    await addToConversationHistory(
      whatsappNumber,
      'assistant',
      `Invoice ${invoice?.invoiceNumber} created with preview`,
      Intent.CREATE_INVOICE
    );

  } catch (error: any) {
    functions.logger.error('Invoice creation error', { error: error.message, stack: error.stack });

    // Store error for retry context
    const errorMessage = error.message.includes('Client')
      ? 'Client not found. Please add the client first or check the name.'
      : error.message.includes('Organization')
      ? 'Organization details missing. Please complete your profile setup.'
      : 'Something went wrong while creating the invoice.';

    await storeError(whatsappNumber, errorMessage, Intent.CREATE_INVOICE);

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `Oops! Something went wrong. 😅\n\n${errorMessage}\n\n💡 *Want to try again?* Just type "try again" or tell me what you'd like to do.\n\nOr type "HELP" for guidance.`
    });

    await addToConversationHistory(
      whatsappNumber,
      'assistant',
      `Error creating invoice: ${errorMessage}`,
      Intent.CREATE_INVOICE
    );
  }
}

/**
 * Handle client addition via WhatsApp
 */
export async function handleAddClient(
  whatsappUser: any,
  entities: ClientAdditionEntities,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId, userId } = whatsappUser;

    // Validate required data
    if (!entities.name) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: 'To add a client, I need at least their name.\n\nExample: "Add client John Doe, email john@example.com, phone 08012345678"'
      });
      return;
    }

    // Check if client already exists
    const existingClient = await getDb()
      .collection('clients')
      .where('organizationId', '==', organizationId)
      .where('name', '==', entities.name)
      .limit(1)
      .get();

    if (!existingClient.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `Client "${entities.name}" already exists in your records.\n\nWould you like to update their information instead?`
      });
      return;
    }

    // Create client
    const clientRef = await getDb().collection('clients').add({
      organizationId,
      name: entities.name,
      companyName: entities.companyName || entities.name,
      email: entities.email || '',
      phone: entities.phone || '',
      address: entities.address || '',
      type: 'business',
      status: 'active',
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdVia: 'whatsapp'
    });

    // Send success message
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `✅ *Client Added!*\n\nName: ${entities.name}\n${entities.email ? `Email: ${entities.email}\n` : ''}${entities.phone ? `Phone: ${entities.phone}\n` : ''}${entities.address ? `Address: ${entities.address}\n` : ''}\nYou can now create invoices for this client!`
    });

    functions.logger.info('Client added via WhatsApp', {
      clientId: clientRef.id,
      organizationId,
      clientName: entities.name
    });

    await addToConversationHistory(
      whatsappNumber,
      'assistant',
      `Client ${entities.name} added successfully`,
      Intent.ADD_CLIENT
    );

  } catch (error: any) {
    functions.logger.error('Client addition error', { error: error.message });

    const errorMessage = error.message.includes('already exists')
      ? `Client "${entities.name}" already exists in your records.`
      : 'Something went wrong while adding the client.';

    await storeError(whatsappNumber, errorMessage, Intent.ADD_CLIENT);

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `Oops! 😅\n\n${errorMessage}\n\n💡 *Try again?* Type "try again" or give me different client details.\n\nOr type "list clients" to see all your clients.`
    });

    await addToConversationHistory(
      whatsappNumber,
      'assistant',
      `Error adding client: ${errorMessage}`,
      Intent.ADD_CLIENT
    );
  }
}

/**
 * Handle balance query
 */
export async function handleBalanceQuery(
  whatsappUser: any,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId } = whatsappUser;

    // Fetch organization wallet balance
    const orgDoc = await getDb().collection('organizations').doc(organizationId).get();

    if (!orgDoc.exists) {
      throw new Error('Organization not found');
    }

    const orgData = orgDoc.data();
    const walletBalance = orgData?.walletBalance || 0;

    // Fetch recent transactions
    const txnSnapshot = await getDb()
      .collection('walletTransactions')
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    let recentTxns = '';
    if (!txnSnapshot.empty) {
      recentTxns = '\n\n📋 *Recent Transactions:*\n';
      txnSnapshot.docs.forEach((doc, index) => {
        const txn = doc.data();
        const symbol = txn.type === 'credit' ? '➕' : '➖';
        const date = new Date(txn.createdAt).toLocaleDateString('en-NG');
        recentTxns += `${index + 1}. ${symbol} ₦${txn.amount.toLocaleString()} - ${txn.description} (${date})\n`;
      });
    }

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `💰 *Wallet Balance*\n\nCurrent Balance: *₦${walletBalance.toLocaleString()}*\n\nLast updated: ${new Date().toLocaleString('en-NG')}${recentTxns}\n\nType "transactions" to see full history.`
    });

    await addToConversationHistory(
      whatsappNumber,
      'assistant',
      `Wallet balance: ₦${walletBalance.toLocaleString()}`,
      Intent.VIEW_BALANCE
    );

  } catch (error: any) {
    functions.logger.error('Balance query error', { error: error.message });

    const errorMessage = error.message.includes('Organization')
      ? 'Could not find your organization. Please complete your profile setup.'
      : 'Could not fetch your wallet balance.';

    await storeError(whatsappNumber, errorMessage, Intent.VIEW_BALANCE);

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `Oops! 😅\n\n${errorMessage}\n\n💡 *Try again?* Type "try again" or "balance" to retry.\n\nOr type "HELP" for other options.`
    });

    await addToConversationHistory(
      whatsappNumber,
      'assistant',
      `Error fetching balance: ${errorMessage}`,
      Intent.VIEW_BALANCE
    );
  }
}

/**
 * Generate sequential invoice number
 */
async function generateInvoiceNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Count invoices for this organization this month
  const invoicesSnapshot = await getDb()
    .collection('invoices')
    .where('organizationId', '==', organizationId)
    .where('invoiceNumber', '>=', `INV-${year}${month}`)
    .where('invoiceNumber', '<', `INV-${year}${month}\uf8ff`)
    .get();

  const sequence = String(invoicesSnapshot.size + 1).padStart(4, '0');
  return `INV-${year}${month}${sequence}`;
}

/**
 * Handle list routes - Show all routes with status filter
 */
export async function handleListRoutes(
  whatsappUser: any,
  entities: any,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId } = whatsappUser;

    // Build query with optional status filter
    let query = getDb()
      .collection('routes')
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(10);

    // Apply status filter if specified
    if (entities.status) {
      const statusMap: Record<string, string> = {
        'active': 'In Progress',
        'in progress': 'In Progress',
        'pending': 'Pending',
        'completed': 'Completed'
      };
      const status = statusMap[entities.status.toLowerCase()] || entities.status;
      query = query.where('status', '==', status) as any;
    }

    const routesSnapshot = await query.get();

    if (routesSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: entities.status
          ? `No ${entities.status} routes found. 📭\n\nType "list all routes" to see everything.`
          : `You never create any route yet o! 📭\n\nType "create route" to start a new delivery.`
      });
      return;
    }

    // Format routes list with Nigerian flair
    let message = `🚚 *Your Routes* (${routesSnapshot.size})\n\n`;

    let index = 0;
    routesSnapshot.forEach((doc) => {
      index++;
      const route = doc.data();
      const statusEmoji = route.status === 'Completed' ? '✅' :
                         route.status === 'In Progress' ? '🚛' : '⏳';

      message += `${index}. ${statusEmoji} *${route.origin} → ${route.destination}*\n`;
      message += `   📍 Status: ${route.status}\n`;
      message += `   📊 Progress: ${route.progress || 0}%\n`;

      if (route.driverName) {
        message += `   👤 Driver: ${route.driverName}\n`;
      }
      if (route.vehiclePlate) {
        message += `   🚗 Vehicle: ${route.vehiclePlate}\n`;
      }
      if (route.distance) {
        message += `   📏 Distance: ${route.distance}km\n`;
      }
      message += `   🆔 ID: ${doc.id}\n\n`;
    });

    // Add helpful tip
    if (routesSnapshot.size === 10) {
      message += `\n💡 _Showing first 10 routes. For specific route details, type "show route [ID]"_`;
    } else {
      message += `\n💡 _Type "show route [ID]" for details_`;
    }

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: message
    });

    functions.logger.info('Routes listed via WhatsApp', {
      organizationId,
      count: routesSnapshot.size,
      filter: entities.status || 'all'
    });
  } catch (error: any) {
    functions.logger.error('List routes error', { error: error.message });
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `Ah! Something go wrong o. 😅\n\nPlease try again or contact support if problem persist.`
    });
  }
}
