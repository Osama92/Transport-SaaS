/**
 * Additional WhatsApp Command Handlers
 * Export these functions to commandHandlers.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendWhatsAppMessage } from './webhook';

const getDb = () => admin.firestore();

/**
 * Handle list clients - Show all clients with contact info
 */
export async function handleListClients(
  whatsappUser: any,
  entities: any,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId } = whatsappUser;

    const clientsSnapshot = await getDb()
      .collection('clients')
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(15)
      .get();

    if (clientsSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `You never add any client yet o! 📭\n\nType "add client [name], email [email], phone [phone]" to add your first client.`
      });
      return;
    }

    let message = `👥 *Your Clients* (${clientsSnapshot.size})\n\n`;

    let index = 0;
    clientsSnapshot.forEach((doc) => {
      index++;
      const client = doc.data();

      message += `${index}. *${client.name || client.companyName}*\n`;
      if (client.email) message += `   ✉️ ${client.email}\n`;
      if (client.phone) message += `   📞 ${client.phone}\n`;
      if (client.address) message += `   📍 ${client.address}\n`;
      if (client.outstandingBalance && client.outstandingBalance > 0) {
        message += `   💰 Owes: ₦${client.outstandingBalance.toLocaleString()}\n`;
      }
      message += `\n`;
    });

    message += `\n💡 _Type "show client [name]" for details_`;

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: message
    });

    functions.logger.info('Clients listed via WhatsApp', {
      organizationId,
      count: clientsSnapshot.size
    });
  } catch (error: any) {
    functions.logger.error('List clients error', { error: error.message });
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `Ah! Something go wrong o. 😅\n\nPlease try again.`
    });
  }
}

/**
 * Handle list drivers - Show all drivers with status
 */
export async function handleListDrivers(
  whatsappUser: any,
  entities: any,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId } = whatsappUser;

    const driversSnapshot = await getDb()
      .collection('drivers')
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(15)
      .get();

    if (driversSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `You never add any driver yet o! 📭\n\nAdd drivers from your dashboard first.`
      });
      return;
    }

    let message = `👥 *Your Drivers* (${driversSnapshot.size})\n\n`;

    let index = 0;
    driversSnapshot.forEach((doc) => {
      index++;
      const driver = doc.data();
      const statusEmoji = driver.status === 'On-route' ? '🚛' :
                         driver.status === 'Idle' ? '✅' : '⏸️';

      message += `${index}. ${statusEmoji} *${driver.name}*\n`;
      message += `   📍 Status: ${driver.status || 'Idle'}\n`;
      if (driver.phone) message += `   📞 ${driver.phone}\n`;
      if (driver.licenseNumber) message += `   🪪 License: ${driver.licenseNumber}\n`;
      if (driver.walletBalance !== undefined) {
        message += `   💰 Wallet: ₦${driver.walletBalance.toLocaleString()}\n`;
      }
      message += `\n`;
    });

    message += `\n💡 _Type "where is [driver name]" to track location_`;

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: message
    });

    functions.logger.info('Drivers listed via WhatsApp', {
      organizationId,
      count: driversSnapshot.size
    });
  } catch (error: any) {
    functions.logger.error('List drivers error', { error: error.message });
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `Ah! Something go wrong o. 😅\n\nPlease try again.`
    });
  }
}

/**
 * Handle list invoices - Show all invoices
 */
export async function handleListInvoices(
  whatsappUser: any,
  entities: any,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId } = whatsappUser;

    const invoicesSnapshot = await getDb()
      .collection('invoices')
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (invoicesSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `No invoices found. 📭\n\nType "create invoice for [client]" to get started.`
      });
      return;
    }

    let message = `📄 *Your Invoices* (${invoicesSnapshot.size})\n\n`;

    let index = 0;
    invoicesSnapshot.forEach((doc) => {
      index++;
      const invoice = doc.data();
      const statusEmoji = invoice.status === 'Paid' ? '✅' :
                         invoice.status === 'Sent' ? '⏳' : '📝';

      message += `${index}. ${statusEmoji} *${invoice.invoiceNumber}*\n`;
      message += `   👤 Client: ${invoice.clientName}\n`;
      message += `   💰 Amount: ₦${invoice.total.toLocaleString()}\n`;
      message += `   📍 Status: ${invoice.status}\n`;
      if (invoice.dueDate) {
        const dueDate = new Date(invoice.dueDate);
        message += `   📅 Due: ${dueDate.toLocaleDateString()}\n`;
      }
      message += `\n`;
    });

    message += `\n💡 _Type "show invoice [number]" for details_`;

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: message
    });

    functions.logger.info('Invoices listed via WhatsApp', {
      organizationId,
      count: invoicesSnapshot.size
    });
  } catch (error: any) {
    functions.logger.error('List invoices error', { error: error.message });
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `Ah! Something go wrong o. 😅\n\nPlease try again.`
    });
  }
}

/**
 * Handle list transactions - Show wallet transaction history
 */
export async function handleListTransactions(
  whatsappUser: any,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<void> {
  try {
    const { organizationId } = whatsappUser;

    const txnSnapshot = await getDb()
      .collection('walletTransactions')
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (txnSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `No transactions yet. 📭\n\nYour wallet transaction history will show here.`
      });
      return;
    }

    let message = `💳 *Recent Transactions*\n\n`;

    let index = 0;
    txnSnapshot.forEach((doc) => {
      index++;
      const txn = doc.data();
      const emoji = txn.type === 'credit' ? '💚' : '❤️';
      const sign = txn.type === 'credit' ? '+' : '-';

      message += `${index}. ${emoji} ${sign}₦${txn.amount.toLocaleString()}\n`;
      message += `   📝 ${txn.description || 'Transaction'}\n`;
      message += `   📊 Status: ${txn.status}\n`;
      if (txn.createdAt) {
        const date = txn.createdAt.toDate ? txn.createdAt.toDate() : new Date(txn.createdAt);
        message += `   📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`;
      }
      message += `\n`;
    });

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: message
    });

    functions.logger.info('Transactions listed via WhatsApp', {
      organizationId,
      count: txnSnapshot.size
    });
  } catch (error: any) {
    functions.logger.error('List transactions error', { error: error.message });
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `Ah! Something go wrong o. 😅\n\nPlease try again.`
    });
  }
}
