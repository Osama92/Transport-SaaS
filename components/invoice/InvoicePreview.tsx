import React from 'react';
import type { Invoice } from '../../types';

interface InvoicePreviewProps {
    invoice: Invoice;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice }) => {

    const totalAmount = invoice.items.reduce((sum, item) => sum + item.units * item.price, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg h-full" id="invoice-preview">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">Invoice</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">#{invoice.id}</p>
                </div>
                {invoice.from.logoUrl ? (
                    <img src={invoice.from.logoUrl} alt="Company Logo" className="max-h-12" />
                ) : (
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{invoice.from.name || 'Your Company'}</div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-8 mb-8">
                <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{invoice.project || 'Project Name'}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Issued Date</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{invoice.issuedDate}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Due Date</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{invoice.dueDate}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b dark:border-slate-700">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">From</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100 mt-1">{invoice.from.name || 'Your Name'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.from.address || 'Your Address'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.from.email || 'your.email@example.com'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.from.phone || '(123) 456-7890'}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">To</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100 mt-1">{invoice.to.name || 'Client Name'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.to.address || 'Client Address'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.to.email || 'client.email@example.com'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.to.phone || '(987) 654-3210'}</p>
                </div>
            </div>

            <div className="flow-root">
                <table className="w-full text-sm">
                    <thead className="text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="text-left font-normal pb-2">Description</th>
                            <th className="text-right font-normal pb-2">Units</th>
                            <th className="text-right font-normal pb-2">Price</th>
                            <th className="text-right font-normal pb-2">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                        {invoice.items.map(item => (
                            <tr key={item.id}>
                                <td className="py-3 text-gray-800 dark:text-gray-100 font-medium">{item.description || 'Item Description'}</td>
                                <td className="text-right py-3 text-gray-600 dark:text-gray-300">{item.units}</td>
                                <td className="text-right py-3 text-gray-600 dark:text-gray-300">{formatCurrency(item.price)}</td>
                                <td className="text-right py-3 text-gray-800 dark:text-gray-100 font-medium">{formatCurrency(item.units * item.price)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3} className="text-right pt-4 font-semibold text-gray-800 dark:text-gray-100">Total Amount</td>
                            <td className="text-right pt-4 text-xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {invoice.notes && (
                 <div className="mt-8 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md text-xs text-gray-600 dark:text-gray-300">
                    <strong>Note:</strong> {invoice.notes}
                </div>
            )}

            <div className="mt-8 pt-8 border-t dark:border-slate-700">
                 <div className="grid grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Payment Method</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{invoice.paymentDetails.method || 'Not specified'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Account Name: {invoice.paymentDetails.accountName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Code: {invoice.paymentDetails.code}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Account Number: {invoice.paymentDetails.accountNumber}</p>
                    </div>
                     <div className="text-right self-end">
                        {invoice.signatureUrl && <img src={invoice.signatureUrl} alt="Signature" className="h-10 inline-block mb-2" />}
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{invoice.from.name}</p>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default InvoicePreview;