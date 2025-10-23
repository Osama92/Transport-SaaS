import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { Invoice, InvoiceLineItem } from '../../types';
import { uploadInvoiceLogo, uploadInvoiceSignature } from './storage';

const INVOICES_COLLECTION = 'invoices';

/**
 * Get all invoices for an organization
 */
export const getInvoicesByOrganization = async (organizationId: string): Promise<Invoice[]> => {
    try {
        const invoicesRef = collection(db, INVOICES_COLLECTION);
        const q = query(
            invoicesRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const invoices: Invoice[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                invoiceDate: data.invoiceDate instanceof Timestamp
                    ? data.invoiceDate.toDate().toISOString()
                    : data.invoiceDate,
                dueDate: data.dueDate instanceof Timestamp
                    ? data.dueDate.toDate().toISOString()
                    : data.dueDate,
                paidDate: data.paidDate instanceof Timestamp
                    ? data.paidDate.toDate().toISOString()
                    : data.paidDate,
                createdAt: data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp
                    ? data.updatedAt.toDate().toISOString()
                    : data.updatedAt,
            } as Invoice;
        });

        return invoices;
    } catch (error) {
        console.error('Error getting invoices:', error);
        throw new Error('Failed to fetch invoices');
    }
};

/**
 * Get a single invoice by ID
 */
export const getInvoiceById = async (invoiceId: string): Promise<Invoice | null> => {
    try {
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (!invoiceSnap.exists()) {
            return null;
        }

        const data = invoiceSnap.data();
        return {
            id: invoiceSnap.id,
            ...data,
            invoiceDate: data.invoiceDate instanceof Timestamp
                ? data.invoiceDate.toDate().toISOString()
                : data.invoiceDate,
            dueDate: data.dueDate instanceof Timestamp
                ? data.dueDate.toDate().toISOString()
                : data.dueDate,
            paidDate: data.paidDate instanceof Timestamp
                ? data.paidDate.toDate().toISOString()
                : data.paidDate,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt,
        } as Invoice;
    } catch (error) {
        console.error('Error getting invoice:', error);
        throw new Error('Failed to fetch invoice');
    }
};

/**
 * Generate invoice number
 */
const generateInvoiceNumber = async (organizationId: string): Promise<string> => {
    try {
        const invoicesRef = collection(db, INVOICES_COLLECTION);
        const q = query(
            invoicesRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const count = querySnapshot.size + 1;

        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
    } catch (error) {
        console.error('Error generating invoice number:', error);
        // Fallback to timestamp-based number
        return `INV-${Date.now()}`;
    }
};

/**
 * Create a new invoice
 */
export const createInvoice = async (
    organizationId: string,
    invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string
): Promise<string> => {
    try {
        const invoicesRef = collection(db, INVOICES_COLLECTION);
        const invoiceNumber = await generateInvoiceNumber(organizationId);

        // Helper function to check if a string is a base64 data URL
        const isBase64DataUrl = (url: string | null | undefined): boolean => {
            return !!url && url.startsWith('data:');
        };

        // Upload logo to Firebase Storage if it's a base64 data URL
        let companyLogoUrl = invoiceData.companyLogoUrl || null;
        if (companyLogoUrl && isBase64DataUrl(companyLogoUrl)) {
            try {
                companyLogoUrl = await uploadInvoiceLogo(companyLogoUrl, organizationId);
            } catch (error) {
                console.error('Failed to upload logo, saving without it:', error);
                companyLogoUrl = null;
            }
        }

        // Upload signature to Firebase Storage if it's a base64 data URL
        let signatureUrl = invoiceData.signatureUrl || null;
        if (signatureUrl && isBase64DataUrl(signatureUrl)) {
            try {
                signatureUrl = await uploadInvoiceSignature(signatureUrl, organizationId);
            } catch (error) {
                console.error('Failed to upload signature, saving without it:', error);
                signatureUrl = null;
            }
        }

        const newInvoice: any = {
            organizationId,
            invoiceNumber,
            clientName: invoiceData.clientName || invoiceData.to?.name || '',
            clientEmail: invoiceData.clientEmail || invoiceData.to?.email || '',
            clientAddress: invoiceData.clientAddress || invoiceData.to?.address || '',
            status: invoiceData.status || 'Draft',
            invoiceDate: invoiceData.invoiceDate || serverTimestamp(),
            dueDate: invoiceData.dueDate || null,
            paidDate: invoiceData.paidDate || null,
            lineItems: invoiceData.lineItems || [],
            subtotal: invoiceData.subtotal || 0,
            taxRate: invoiceData.taxRate || 0,
            taxAmount: invoiceData.taxAmount || 0,
            total: invoiceData.total || 0,
            amountPaid: invoiceData.amountPaid || 0,
            balance: invoiceData.balance || invoiceData.total || 0,
            notes: invoiceData.notes || '',
            paymentTerms: invoiceData.paymentTerms || 'Net 30',
            routeIds: invoiceData.routeIds || [],
            pdfUrl: invoiceData.pdfUrl || null,
            from: invoiceData.from || {},
            to: invoiceData.to || {},
            items: invoiceData.items || [],
            paymentDetails: invoiceData.paymentDetails || {},
            vatRate: invoiceData.vatRate || 0,
            vatInclusive: invoiceData.vatInclusive || false,
            companyLogoUrl: companyLogoUrl,
            signatureUrl: signatureUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        };

        // Only add clientId if it exists
        if (invoiceData.clientId) {
            newInvoice.clientId = invoiceData.clientId;
        }

        const docRef = await addDoc(invoicesRef, newInvoice);
        return docRef.id;
    } catch (error) {
        console.error('Error creating invoice:', error);
        throw new Error('Failed to create invoice');
    }
};

/**
 * Update an existing invoice
 */
export const updateInvoice = async (
    invoiceId: string,
    updates: Partial<Omit<Invoice, 'id' | 'organizationId' | 'invoiceNumber' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);

        // Helper function to check if a string is a base64 data URL
        const isBase64DataUrl = (url: string | null | undefined): boolean => {
            return !!url && url.startsWith('data:');
        };

        const updateData: any = {
            ...updates,
            updatedAt: serverTimestamp(),
        };

        // Get the invoice to access organizationId
        const invoiceDoc = await getDoc(invoiceRef);
        if (!invoiceDoc.exists()) {
            throw new Error('Invoice not found');
        }
        const organizationId = invoiceDoc.data().organizationId;

        // Upload logo to Firebase Storage if it's a base64 data URL
        if (updateData.companyLogoUrl && isBase64DataUrl(updateData.companyLogoUrl)) {
            try {
                updateData.companyLogoUrl = await uploadInvoiceLogo(updateData.companyLogoUrl, organizationId);
            } catch (error) {
                console.error('Failed to upload logo, keeping existing:', error);
                delete updateData.companyLogoUrl; // Don't update if upload fails
            }
        }

        // Upload signature to Firebase Storage if it's a base64 data URL
        if (updateData.signatureUrl && isBase64DataUrl(updateData.signatureUrl)) {
            try {
                updateData.signatureUrl = await uploadInvoiceSignature(updateData.signatureUrl, organizationId);
            } catch (error) {
                console.error('Failed to upload signature, keeping existing:', error);
                delete updateData.signatureUrl; // Don't update if upload fails
            }
        }

        await updateDoc(invoiceRef, updateData);
    } catch (error) {
        console.error('Error updating invoice:', error);
        throw new Error('Failed to update invoice');
    }
};

/**
 * Delete an invoice
 */
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
    try {
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
        await deleteDoc(invoiceRef);
    } catch (error) {
        console.error('Error deleting invoice:', error);
        throw new Error('Failed to delete invoice');
    }
};

/**
 * Update invoice status
 */
export const updateInvoiceStatus = async (
    invoiceId: string,
    status: Invoice['status']
): Promise<void> => {
    try {
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
        const updateData: any = {
            status,
            updatedAt: serverTimestamp(),
        };

        // If marking as paid, set paid date
        if (status === 'Paid') {
            updateData.paidDate = serverTimestamp();

            // Update balance to 0
            const invoice = await getInvoiceById(invoiceId);
            if (invoice) {
                updateData.amountPaid = invoice.total;
                updateData.balance = 0;
            }
        }

        await updateDoc(invoiceRef, updateData);
    } catch (error) {
        console.error('Error updating invoice status:', error);
        throw new Error('Failed to update invoice status');
    }
};

/**
 * Record payment for an invoice
 */
export const recordInvoicePayment = async (
    invoiceId: string,
    paymentAmount: number
): Promise<void> => {
    try {
        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const newAmountPaid = (invoice.amountPaid || 0) + paymentAmount;
        const newBalance = invoice.total - newAmountPaid;

        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
        const updateData: any = {
            amountPaid: newAmountPaid,
            balance: newBalance,
            updatedAt: serverTimestamp(),
        };

        // Update status based on payment
        if (newBalance <= 0) {
            updateData.status = 'Paid';
            updateData.paidDate = serverTimestamp();
        } else if (newAmountPaid > 0) {
            updateData.status = 'Partially Paid';
        }

        await updateDoc(invoiceRef, updateData);
    } catch (error) {
        console.error('Error recording payment:', error);
        throw new Error('Failed to record payment');
    }
};

/**
 * Get invoices by status
 */
export const getInvoicesByStatus = async (
    organizationId: string,
    status: Invoice['status']
): Promise<Invoice[]> => {
    try {
        const invoicesRef = collection(db, INVOICES_COLLECTION);
        const q = query(
            invoicesRef,
            where('organizationId', '==', organizationId),
            where('status', '==', status),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const invoices: Invoice[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                invoiceDate: data.invoiceDate instanceof Timestamp
                    ? data.invoiceDate.toDate().toISOString()
                    : data.invoiceDate,
                dueDate: data.dueDate instanceof Timestamp
                    ? data.dueDate.toDate().toISOString()
                    : data.dueDate,
                paidDate: data.paidDate instanceof Timestamp
                    ? data.paidDate.toDate().toISOString()
                    : data.paidDate,
                createdAt: data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp
                    ? data.updatedAt.toDate().toISOString()
                    : data.updatedAt,
            } as Invoice;
        });

        return invoices;
    } catch (error) {
        console.error('Error getting invoices by status:', error);
        throw new Error('Failed to fetch invoices by status');
    }
};

/**
 * Get invoices by client
 */
export const getInvoicesByClient = async (
    organizationId: string,
    clientId: string
): Promise<Invoice[]> => {
    try {
        const invoicesRef = collection(db, INVOICES_COLLECTION);
        const q = query(
            invoicesRef,
            where('organizationId', '==', organizationId),
            where('clientId', '==', clientId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const invoices: Invoice[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                invoiceDate: data.invoiceDate instanceof Timestamp
                    ? data.invoiceDate.toDate().toISOString()
                    : data.invoiceDate,
                dueDate: data.dueDate instanceof Timestamp
                    ? data.dueDate.toDate().toISOString()
                    : data.dueDate,
                paidDate: data.paidDate instanceof Timestamp
                    ? data.paidDate.toDate().toISOString()
                    : data.paidDate,
                createdAt: data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp
                    ? data.updatedAt.toDate().toISOString()
                    : data.updatedAt,
            } as Invoice;
        });

        return invoices;
    } catch (error) {
        console.error('Error getting invoices by client:', error);
        throw new Error('Failed to fetch invoices by client');
    }
};

/**
 * Get overdue invoices
 */
export const getOverdueInvoices = async (organizationId: string): Promise<Invoice[]> => {
    try {
        const invoicesRef = collection(db, INVOICES_COLLECTION);
        const today = Timestamp.fromDate(new Date());

        const q = query(
            invoicesRef,
            where('organizationId', '==', organizationId),
            where('status', 'in', ['Sent', 'Partially Paid']),
            where('dueDate', '<', today),
            orderBy('dueDate', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const invoices: Invoice[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                invoiceDate: data.invoiceDate instanceof Timestamp
                    ? data.invoiceDate.toDate().toISOString()
                    : data.invoiceDate,
                dueDate: data.dueDate instanceof Timestamp
                    ? data.dueDate.toDate().toISOString()
                    : data.dueDate,
                paidDate: data.paidDate instanceof Timestamp
                    ? data.paidDate.toDate().toISOString()
                    : data.paidDate,
                createdAt: data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp
                    ? data.updatedAt.toDate().toISOString()
                    : data.updatedAt,
            } as Invoice;
        });

        return invoices;
    } catch (error) {
        console.error('Error getting overdue invoices:', error);
        throw new Error('Failed to fetch overdue invoices');
    }
};

/**
 * Link routes to an invoice
 */
export const linkRoutesToInvoice = async (
    invoiceId: string,
    routeIds: string[]
): Promise<void> => {
    try {
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
        await updateDoc(invoiceRef, {
            routeIds,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error linking routes to invoice:', error);
        throw new Error('Failed to link routes to invoice');
    }
};

/**
 * Update PDF URL for an invoice
 */
export const updateInvoicePdfUrl = async (
    invoiceId: string,
    pdfUrl: string
): Promise<void> => {
    try {
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
        await updateDoc(invoiceRef, {
            pdfUrl,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating invoice PDF URL:', error);
        throw new Error('Failed to update invoice PDF URL');
    }
};

/**
 * Calculate invoice totals from line items
 */
export const calculateInvoiceTotals = (
    lineItems: InvoiceLineItem[],
    taxRate: number = 0
): { subtotal: number; taxAmount: number; total: number } => {
    const subtotal = lineItems.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
    }, 0);

    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
    };
};

/**
 * Create invoice from routes
 */
export const createInvoiceFromRoutes = async (
    organizationId: string,
    clientId: string,
    clientName: string,
    routeIds: string[],
    taxRate: number,
    userId: string
): Promise<string> => {
    try {
        // This is a helper function that would typically fetch route details
        // and create line items from them
        // For now, we'll create a basic invoice structure

        const lineItems: InvoiceLineItem[] = routeIds.map((routeId, index) => ({
            description: `Route Service #${index + 1}`,
            quantity: 1,
            unitPrice: 0, // Would be fetched from route data
            amount: 0,
        }));

        const totals = calculateInvoiceTotals(lineItems, taxRate);

        const invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
            organizationId,
            clientId,
            clientName,
            clientEmail: '',
            clientAddress: '',
            status: 'Draft',
            invoiceDate: new Date().toISOString(),
            dueDate: null,
            paidDate: null,
            lineItems,
            subtotal: totals.subtotal,
            taxRate,
            taxAmount: totals.taxAmount,
            total: totals.total,
            amountPaid: 0,
            balance: totals.total,
            notes: '',
            paymentTerms: 'Net 30',
            routeIds,
            pdfUrl: null,
        };

        return await createInvoice(organizationId, invoiceData, userId);
    } catch (error) {
        console.error('Error creating invoice from routes:', error);
        throw new Error('Failed to create invoice from routes');
    }
};

/**
 * Get total revenue from paid invoices
 */
export const getTotalRevenue = async (organizationId: string): Promise<number> => {
    try {
        const paidInvoices = await getInvoicesByStatus(organizationId, 'Paid');
        return paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    } catch (error) {
        console.error('Error calculating total revenue:', error);
        return 0;
    }
};

/**
 * Get total outstanding balance
 */
export const getTotalOutstanding = async (organizationId: string): Promise<number> => {
    try {
        const allInvoices = await getInvoicesByOrganization(organizationId);
        return allInvoices
            .filter(invoice => invoice.status !== 'Paid' && invoice.status !== 'Cancelled')
            .reduce((sum, invoice) => sum + invoice.balance, 0);
    } catch (error) {
        console.error('Error calculating total outstanding:', error);
        return 0;
    }
};
