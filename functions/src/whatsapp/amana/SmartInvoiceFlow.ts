/**
 * Amana - Smart Invoice Creation Flow
 * Checks prerequisites, validates data, and guides user through complete invoice creation
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Invoice Prerequisites from Organization
 */
export interface InvoicePrerequisites {
  hasCompanyLogo: boolean;
  companyLogoUrl?: string;
  hasAccountDetails: boolean;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  hasSignature: boolean;
  signatureUrl?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
}

/**
 * Invoice Creation State
 */
export interface InvoiceCreationState {
  step: 'prerequisites' | 'client_check' | 'client_creation' | 'client_contact' | 'client_email' | 'client_phone' | 'client_address' | 'client_tax' | 'items' | 'confirm' | 'preview' | 'send';
  prerequisites: InvoicePrerequisites;
  language: 'en' | 'pidgin' | 'ha' | 'ig' | 'yo';  // User's language preference
  clientName?: string;
  clientId?: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientTaxId?: string;  // TIN number
  clientRcNumber?: string;  // CAC/RC number
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    unit?: string;
  }>;
  template?: 'classic' | 'modern' | 'minimal' | 'professional';
  vatInclusive?: boolean;
  vatRate?: number;
  dueDate?: string;
  notes?: string;
  proceedWithoutSignature?: boolean;
  invoiceNumber?: string;
}

/**
 * Check organization's invoice prerequisites
 */
export async function checkInvoicePrerequisites(
  organizationId: string
): Promise<{
  ready: boolean;
  missing: string[];
  prerequisites: InvoicePrerequisites;
}> {
  try {
    const orgDoc = await db.collection('organizations').doc(organizationId).get();

    if (!orgDoc.exists) {
      return {
        ready: false,
        missing: ['Organization not found'],
        prerequisites: {
          hasCompanyLogo: false,
          hasAccountDetails: false,
          hasSignature: false
        }
      };
    }

    const org = orgDoc.data()!;
    const missing: string[] = [];

    const prerequisites: InvoicePrerequisites = {
      hasCompanyLogo: !!org.logoUrl,
      companyLogoUrl: org.logoUrl,
      hasAccountDetails: !!(org.accountName && org.accountNumber),
      accountName: org.accountName,
      accountNumber: org.accountNumber,
      bankName: org.bankName,
      hasSignature: !!org.signatureUrl,
      signatureUrl: org.signatureUrl,
      companyName: org.name || org.companyName,
      companyEmail: org.email || org.companyEmail,
      companyPhone: org.phone || org.companyPhone,
      companyAddress: org.address || org.companyAddress
    };

    // Check what's missing
    if (!prerequisites.hasCompanyLogo) {
      missing.push('Company logo');
    }

    if (!prerequisites.hasAccountDetails) {
      missing.push('Bank account details (account name & number)');
    }

    if (!prerequisites.hasSignature) {
      missing.push('Digital signature (optional)');
    }

    return {
      ready: prerequisites.hasCompanyLogo && prerequisites.hasAccountDetails,
      missing,
      prerequisites
    };

  } catch (error: any) {
    functions.logger.error('Error checking invoice prerequisites', { error: error.message });
    return {
      ready: false,
      missing: ['Error checking prerequisites'],
      prerequisites: {
        hasCompanyLogo: false,
        hasAccountDetails: false,
        hasSignature: false
      }
    };
  }
}

/**
 * Check if client exists by name or create new
 */
export async function checkOrCreateClient(
  organizationId: string,
  clientName: string,
  clientEmail?: string,
  clientPhone?: string,
  clientAddress?: string
): Promise<{
  exists: boolean;
  clientId: string;
  client: any;
  message: string;
}> {
  try {
    // Search for existing client by name
    const clientsSnapshot = await db.collection('clients')
      .where('organizationId', '==', organizationId)
      .where('name', '==', clientName)
      .limit(1)
      .get();

    if (!clientsSnapshot.empty) {
      const clientDoc = clientsSnapshot.docs[0];
      const client = clientDoc.data();

      return {
        exists: true,
        clientId: clientDoc.id,
        client,
        message: `Found existing client: ${client.name}`
      };
    }

    // Client doesn't exist - create new one
    const newClientData = {
      organizationId,
      name: clientName,
      email: clientEmail || '',
      phone: clientPhone || '',
      address: clientAddress || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const newClientRef = await db.collection('clients').add(newClientData);

    return {
      exists: false,
      clientId: newClientRef.id,
      client: { ...newClientData, id: newClientRef.id },
      message: `Created new client: ${clientName}`
    };

  } catch (error: any) {
    functions.logger.error('Error checking/creating client', { error: error.message });
    throw error;
  }
}

/**
 * Generate next invoice number
 */
export async function generateInvoiceNumber(organizationId: string): Promise<string> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0);

    const invoicesSnapshot = await db.collection('invoices')
      .where('organizationId', '==', organizationId)
      .where('issuedDate', '>=', startOfMonth.toISOString())
      .where('issuedDate', '<=', endOfMonth.toISOString())
      .get();

    const nextNumber = String(invoicesSnapshot.size + 1).padStart(4, '0');

    return `INV-${year}${month}-${nextNumber}`;

  } catch (error: any) {
    functions.logger.error('Error generating invoice number', { error: error.message });
    // Fallback
    return `INV-${Date.now()}`;
  }
}

/**
 * Create invoice in Firestore
 */
export async function createInvoice(
  organizationId: string,
  state: InvoiceCreationState,
  userId: string
): Promise<{
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}> {
  try {
    const prerequisites = state.prerequisites;

    // Calculate totals
    const items = state.items.map(item => ({
      ...item,
      amount: item.quantity * item.unitPrice
    }));

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

    let tax = 0;
    let total = subtotal;

    if (state.vatRate) {
      if (state.vatInclusive) {
        // VAT is included in the price
        tax = (subtotal / (1 + state.vatRate / 100)) * (state.vatRate / 100);
      } else {
        // VAT is added on top
        tax = (subtotal * state.vatRate) / 100;
        total = subtotal + tax;
      }
    }

    const invoiceNumber = await generateInvoiceNumber(organizationId);
    const now = new Date();

    // Default due date: 30 days from now
    const dueDate = state.dueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const invoiceData = {
      organizationId,
      clientId: state.clientId,
      clientName: state.clientName,
      clientEmail: state.clientEmail,
      clientAddress: state.clientAddress,
      invoiceNumber,
      project: state.notes || 'Transport Services',
      issuedDate: now.toISOString(),
      dueDate,
      from: {
        name: prerequisites.companyName || 'Your Company',
        address: prerequisites.companyAddress || '',
        email: prerequisites.companyEmail || '',
        phone: prerequisites.companyPhone || '',
        logoUrl: prerequisites.companyLogoUrl
      },
      to: {
        name: state.clientName || '',
        address: state.clientAddress || '',
        email: state.clientEmail || '',
        phone: state.clientPhone || ''
      },
      items,
      subtotal,
      tax,
      total,
      notes: state.notes || '',
      paymentDetails: {
        method: 'Bank Transfer',
        accountName: prerequisites.accountName || '',
        accountNumber: prerequisites.accountNumber || '',
        bankName: prerequisites.bankName || ''
      },
      signatureUrl: state.proceedWithoutSignature ? undefined : prerequisites.signatureUrl,
      companyLogoUrl: prerequisites.companyLogoUrl,
      vatRate: state.vatRate,
      vatInclusive: state.vatInclusive,
      template: state.template || 'modern',
      status: 'Draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userId
    };

    const invoiceRef = await db.collection('invoices').add(invoiceData);

    functions.logger.info('Invoice created successfully', {
      invoiceId: invoiceRef.id,
      invoiceNumber,
      client: state.clientName
    });

    return {
      success: true,
      invoiceId: invoiceRef.id,
      invoiceNumber
    };

  } catch (error: any) {
    functions.logger.error('Error creating invoice', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate conversational response for each step
 */
export function generateStepResponse(
  step: InvoiceCreationState['step'],
  state: InvoiceCreationState
): string {
  switch (step) {
    case 'prerequisites':
      const missing = [];
      if (!state.prerequisites.hasCompanyLogo) missing.push('company logo');
      if (!state.prerequisites.hasAccountDetails) missing.push('bank account details');
      if (!state.prerequisites.hasSignature) missing.push('digital signature (optional)');

      if (missing.length === 0) {
        return `✅ Your invoice settings are ready!\n\nLet's create an invoice. Who is the client?`;
      }

      return `⚠️ Before we create invoices, you need to set up:\n\n${missing.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\nPlease add these in your dashboard settings first. Type "help" if you need guidance.`;

    case 'client_check':
      return `Got it! Checking if "${state.clientName}" is already in your client list...`;

    case 'client_creation':
      return `I don't see "${state.clientName}" in your clients.\n\nLet me get their details:\n\n📧 What's their email address?\n\n💡 _Or type "skip" if you don't have it yet_`;

    case 'items':
      if (state.items.length === 0) {
        return `Perfect! Now, what items or services are on this invoice?\n\n💡 *Example:*\n"50 bags of cement at 6000 naira each"\n"Transport service from Lagos to Abuja, 250000"\n\n_You can add multiple items - just send them one by one!_`;
      } else {
        return `✅ Item added!\n\n📦 *Current items (${state.items.length}):*\n${state.items.map((item, i) => `${i + 1}. ${item.description} - ${item.quantity} @ ₦${item.unitPrice.toLocaleString()} = ₦${(item.quantity * item.unitPrice).toLocaleString()}`).join('\n')}\n\n*Add another item or type "done" to continue*`;
      }

    case 'confirm':
      const subtotal = state.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      let tax = 0;
      let total = subtotal;

      if (state.vatRate) {
        if (state.vatInclusive) {
          tax = (subtotal / (1 + state.vatRate / 100)) * (state.vatRate / 100);
        } else {
          tax = (subtotal * state.vatRate) / 100;
          total = subtotal + tax;
        }
      }

      return `📋 *Invoice Summary*\n\n👤 Client: ${state.clientName}\n${state.clientEmail ? `📧 Email: ${state.clientEmail}\n` : ''}${state.clientPhone ? `📱 Phone: ${state.clientPhone}\n` : ''}\n📦 Items: ${state.items.length}\n💰 Subtotal: ₦${subtotal.toLocaleString()}\n${state.vatRate ? `🧾 VAT (${state.vatRate}%): ₦${tax.toLocaleString()}\n` : ''}💵 *Total: ₦${total.toLocaleString()}*\n\n*Confirm?*\n\n✅ Yes - Create invoice\n👀 Preview - See how it looks\n✏️ Edit - Make changes\n❌ Cancel`;

    case 'preview':
      return `📄 *Invoice Preview Generated!*\n\nCheck the invoice above to see how it will look.\n\n*What next?*\n\n✅ Send - Email/WhatsApp to client\n✏️ Edit - Make changes\n✅ Confirm - Save as draft`;

    case 'send':
      return `📧 *How would you like to send this invoice?*\n\n1️⃣ Email to ${state.clientEmail || 'client'}\n2️⃣ WhatsApp to client\n3️⃣ Both email & WhatsApp\n4️⃣ Just save as draft\n\n_Type the number or method_`;

    default:
      return `Let's create an invoice! Who is the client?`;
  }
}
