/**
 * Amana - Invoice Intelligence
 * Smart invoice tracking, expense management, and profitability analysis
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Invoice with calculated fields
 */
export interface IntelligentInvoice {
  invoiceNumber: string;
  clientName: string;
  total: number;
  status: 'Draft' | 'Sent' | 'Paid';
  dueDate: string;
  createdAt: string;
  expenses: number;  // Total expenses added to this invoice
  expectedBalance: number;  // Total - Expenses = Profit
  profitMargin: number;  // (expectedBalance / total) * 100
  daysOverdue?: number;
  isProfitable: boolean;  // expectedBalance > 0
}

/**
 * Check invoice status with intelligent insights
 */
export async function checkInvoiceStatus(
  organizationId: string,
  invoiceNumber: string
): Promise<{
  found: boolean;
  invoice?: IntelligentInvoice;
  insights: string[];
  suggestions: string[];
}> {
  try {
    // Find invoice
    const invoicesSnapshot = await db.collection('invoices')
      .where('organizationId', '==', organizationId)
      .where('invoiceNumber', '==', invoiceNumber)
      .limit(1)
      .get();

    if (invoicesSnapshot.empty) {
      return {
        found: false,
        insights: [`Invoice ${invoiceNumber} no dey for your records`],
        suggestions: ['Check the invoice number', 'Type "list invoices" to see all']
      };
    }

    const invoiceDoc = invoicesSnapshot.docs[0];
    const invoiceData = invoiceDoc.data();

    // Calculate expenses for this invoice
    const expensesSnapshot = await db.collection('expenses')
      .where('organizationId', '==', organizationId)
      .where('invoiceId', '==', invoiceDoc.id)
      .get();

    const totalExpenses = expensesSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    const expectedBalance = (invoiceData.total || 0) - totalExpenses;
    const profitMargin = invoiceData.total > 0 ? (expectedBalance / invoiceData.total) * 100 : 0;

    // Check if overdue
    let daysOverdue = undefined;
    const now = new Date();
    const dueDate = invoiceData.dueDate ? new Date(invoiceData.dueDate) : null;

    if (dueDate && dueDate < now && invoiceData.status !== 'Paid') {
      daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const invoice: IntelligentInvoice = {
      invoiceNumber: invoiceData.invoiceNumber,
      clientName: invoiceData.clientName || 'Unknown',
      total: invoiceData.total || 0,
      status: invoiceData.status || 'Draft',
      dueDate: invoiceData.dueDate,
      createdAt: invoiceData.createdAt,
      expenses: totalExpenses,
      expectedBalance,
      profitMargin,
      daysOverdue,
      isProfitable: expectedBalance > 0
    };

    // Generate insights
    const insights: string[] = [];
    const suggestions: string[] = [];

    // Status insights
    if (invoice.status === 'Draft') {
      insights.push('📝 Invoice still dey draft mode');
      suggestions.push('Send am to client: "send invoice ' + invoiceNumber + '"');
    } else if (invoice.status === 'Sent') {
      insights.push('📧 Invoice don send to client');
      if (daysOverdue) {
        insights.push(`⚠️ ${daysOverdue} days overdue!`);
        suggestions.push('Follow up with client');
        suggestions.push('Send reminder: "remind client about ' + invoiceNumber + '"');
      } else {
        insights.push('⏳ Dey wait for payment');
      }
    } else if (invoice.status === 'Paid') {
      insights.push('✅ Payment received!');
    }

    // Profitability insights
    if (totalExpenses > 0) {
      insights.push(`💰 Total expenses: ₦${totalExpenses.toLocaleString()}`);
      insights.push(`📊 Expected profit: ₦${expectedBalance.toLocaleString()} (${profitMargin.toFixed(1)}%)`);

      if (!invoice.isProfitable) {
        insights.push(`⚠️ WARNING: Expenses pass invoice amount! You go lose ₦${Math.abs(expectedBalance).toLocaleString()}`);
        suggestions.push('Review expenses for this job');
        suggestions.push('Consider increasing invoice amount');
      } else if (profitMargin < 20) {
        insights.push(`📉 Low profit margin (${profitMargin.toFixed(1)}%)`);
        suggestions.push('Try reduce expenses or increase price next time');
      } else if (profitMargin > 50) {
        insights.push(`🎉 Great profit margin (${profitMargin.toFixed(1)}%)!`);
      }
    }

    return {
      found: true,
      invoice,
      insights,
      suggestions
    };

  } catch (error: any) {
    functions.logger.error('Error checking invoice status', { error: error.message });

    return {
      found: false,
      insights: ['Error checking invoice status'],
      suggestions: ['Try again later']
    };
  }
}

/**
 * Add expense to invoice
 */
export async function addExpenseToInvoice(
  organizationId: string,
  invoiceNumber: string,
  expenseData: {
    description: string;
    amount: number;
    category?: string;
    date?: string;
  },
  userId: string
): Promise<{
  success: boolean;
  expenseId?: string;
  updatedInvoice?: IntelligentInvoice;
  message: string;
}> {
  try {
    // Find invoice
    const invoicesSnapshot = await db.collection('invoices')
      .where('organizationId', '==', organizationId)
      .where('invoiceNumber', '==', invoiceNumber)
      .limit(1)
      .get();

    if (invoicesSnapshot.empty) {
      return {
        success: false,
        message: `Invoice ${invoiceNumber} no dey`
      };
    }

    const invoiceDoc = invoicesSnapshot.docs[0];

    // Create expense record
    const expenseRef = await db.collection('expenses').add({
      organizationId,
      invoiceId: invoiceDoc.id,
      invoiceNumber,
      description: expenseData.description,
      amount: expenseData.amount,
      category: expenseData.category || 'General',
      date: expenseData.date || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userId
    });

    // Recalculate invoice profitability
    const statusResult = await checkInvoiceStatus(organizationId, invoiceNumber);

    let message = `✅ Expense added to invoice ${invoiceNumber}!\n\n`;
    message += `💰 Expense: ₦${expenseData.amount.toLocaleString()}\n`;

    if (statusResult.found && statusResult.invoice) {
      const inv = statusResult.invoice;
      message += `📊 Total expenses: ₦${inv.expenses.toLocaleString()}\n`;
      message += `💵 Expected profit: ₦${inv.expectedBalance.toLocaleString()} (${inv.profitMargin.toFixed(1)}%)\n`;

      if (!inv.isProfitable) {
        message += `\n⚠️ WARNING: Expenses don pass invoice amount!`;
      }
    }

    return {
      success: true,
      expenseId: expenseRef.id,
      updatedInvoice: statusResult.invoice,
      message
    };

  } catch (error: any) {
    functions.logger.error('Error adding expense to invoice', { error: error.message });

    return {
      success: false,
      message: 'Error adding expense. Try again.'
    };
  }
}

/**
 * Get invoice balance (Total - Expenses)
 */
export async function getInvoiceBalance(
  organizationId: string,
  invoiceNumber: string
): Promise<{
  found: boolean;
  invoiceTotal?: number;
  totalExpenses?: number;
  expectedBalance?: number;
  profitMargin?: number;
  message: string;
}> {
  try {
    const statusResult = await checkInvoiceStatus(organizationId, invoiceNumber);

    if (!statusResult.found || !statusResult.invoice) {
      return {
        found: false,
        message: `Invoice ${invoiceNumber} no dey`
      };
    }

    const inv = statusResult.invoice;

    let message = `📊 *Invoice ${invoiceNumber} Balance*\n\n`;
    message += `👤 Client: ${inv.clientName}\n`;
    message += `💵 Invoice Total: ₦${inv.total.toLocaleString()}\n`;
    message += `💰 Total Expenses: ₦${inv.expenses.toLocaleString()}\n`;
    message += `➖➖➖➖➖➖➖➖\n`;
    message += `📈 Expected Profit: ₦${inv.expectedBalance.toLocaleString()}\n`;
    message += `📊 Profit Margin: ${inv.profitMargin.toFixed(1)}%\n\n`;

    if (!inv.isProfitable) {
      message += `⚠️ Loss: ₦${Math.abs(inv.expectedBalance).toLocaleString()}`;
    } else if (inv.profitMargin < 20) {
      message += `📉 Low margin - consider optimizing costs`;
    } else {
      message += `✅ Healthy profit margin!`;
    }

    return {
      found: true,
      invoiceTotal: inv.total,
      totalExpenses: inv.expenses,
      expectedBalance: inv.expectedBalance,
      profitMargin: inv.profitMargin,
      message
    };

  } catch (error: any) {
    functions.logger.error('Error getting invoice balance', { error: error.message });

    return {
      found: false,
      message: 'Error checking balance. Try again.'
    };
  }
}

/**
 * List expenses for an invoice
 */
export async function listInvoiceExpenses(
  organizationId: string,
  invoiceNumber: string
): Promise<{
  found: boolean;
  expenses: Array<{
    description: string;
    amount: number;
    category: string;
    date: string;
  }>;
  totalExpenses: number;
  message: string;
}> {
  try {
    // Find invoice
    const invoicesSnapshot = await db.collection('invoices')
      .where('organizationId', '==', organizationId)
      .where('invoiceNumber', '==', invoiceNumber)
      .limit(1)
      .get();

    if (invoicesSnapshot.empty) {
      return {
        found: false,
        expenses: [],
        totalExpenses: 0,
        message: `Invoice ${invoiceNumber} no dey`
      };
    }

    const invoiceDoc = invoicesSnapshot.docs[0];

    // Get expenses
    const expensesSnapshot = await db.collection('expenses')
      .where('organizationId', '==', organizationId)
      .where('invoiceId', '==', invoiceDoc.id)
      .orderBy('createdAt', 'desc')
      .get();

    const expenses: any[] = [];
    let totalExpenses = 0;

    expensesSnapshot.docs.forEach(doc => {
      const expense = doc.data();
      expenses.push({
        description: expense.description,
        amount: expense.amount,
        category: expense.category || 'General',
        date: expense.date
      });
      totalExpenses += expense.amount;
    });

    let message = `💰 *Expenses for Invoice ${invoiceNumber}*\n\n`;

    if (expenses.length === 0) {
      message += `No expenses yet for this invoice.`;
    } else {
      expenses.forEach((exp, i) => {
        message += `${i + 1}. ${exp.description}\n`;
        message += `   ₦${exp.amount.toLocaleString()} (${exp.category})\n\n`;
      });

      message += `➖➖➖➖➖➖➖➖\n`;
      message += `📊 Total: ₦${totalExpenses.toLocaleString()}`;
    }

    return {
      found: true,
      expenses,
      totalExpenses,
      message
    };

  } catch (error: any) {
    functions.logger.error('Error listing invoice expenses', { error: error.message });

    return {
      found: false,
      expenses: [],
      totalExpenses: 0,
      message: 'Error fetching expenses. Try again.'
    };
  }
}
