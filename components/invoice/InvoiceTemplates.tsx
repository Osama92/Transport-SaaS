import React from 'react';
import type { Invoice } from '../../types';

export type InvoiceTemplateType = 'classic' | 'modern' | 'minimal' | 'professional' | 'pdf';

interface InvoiceTemplateProps {
    invoice: Invoice;
    template: InvoiceTemplateType;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, template }) => {
    // Calculate amounts with VAT
    const subtotalAmount = invoice.items.reduce((sum, item) => sum + item.units * item.price, 0);
    const vatRate = invoice.vatRate || 0;
    const vatInclusive = invoice.vatInclusive || false;

    let subtotal = subtotalAmount;
    let vatAmount = 0;
    let totalAmount = subtotalAmount;

    if (vatRate > 0) {
        if (vatInclusive) {
            // VAT is included in the price, so we extract it
            vatAmount = (subtotalAmount * vatRate) / (100 + vatRate);
            subtotal = subtotalAmount - vatAmount;
            totalAmount = subtotalAmount;
        } else {
            // VAT is added on top
            vatAmount = (subtotalAmount * vatRate) / 100;
            subtotal = subtotalAmount;
            totalAmount = subtotalAmount + vatAmount;
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    // A4 dimensions: 210mm x 297mm (at 96 DPI = 794px x 1123px)
    const a4Style = {
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        boxSizing: 'border-box' as const,
    };

    if (template === 'classic') {
        return (
            <div style={a4Style} className="bg-white print:shadow-none" id="invoice-preview">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-5xl font-bold text-gray-800">INVOICE</h1>
                        <p className="text-gray-500 mt-2 text-lg">#{invoice.invoiceNumber}</p>
                    </div>
                    {invoice.companyLogoUrl ? (
                        <img src={invoice.companyLogoUrl} alt="Company Logo" className="max-h-16" />
                    ) : (
                        <div className="text-3xl font-bold text-gray-800">{invoice.from.name || 'Your Company'}</div>
                    )}
                </div>

                {/* Dates */}
                <div className="mb-8 text-right">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Issue Date</p>
                    <p className="font-semibold text-gray-800 mt-1">{invoice.issuedDate}</p>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mt-3">Due Date</p>
                    <p className="font-semibold text-gray-800 mt-1">{invoice.dueDate}</p>
                </div>

                {/* From/To */}
                <div className="grid grid-cols-2 gap-8 mb-12 pb-8 border-b-2 border-gray-200">
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">From</p>
                        <p className="font-bold text-gray-800 text-lg">{invoice.from.name || 'Your Name'}</p>
                        <p className="text-sm text-gray-600 mt-1">{invoice.from.address || 'Your Address'}</p>
                        <p className="text-sm text-gray-600">{invoice.from.email || 'your.email@example.com'}</p>
                        <p className="text-sm text-gray-600">{invoice.from.phone || '(123) 456-7890'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
                        <p className="font-bold text-gray-800 text-lg">{invoice.to.name || 'Client Name'}</p>
                        <p className="text-sm text-gray-600 mt-1">{invoice.to.address || 'Client Address'}</p>
                        <p className="text-sm text-gray-600">{invoice.to.email || 'client.email@example.com'}</p>
                        <p className="text-sm text-gray-600">{invoice.to.phone || '(987) 654-3210'}</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left font-semibold text-gray-700 py-3 px-4 uppercase tracking-wide text-sm">Description</th>
                            <th className="text-right font-semibold text-gray-700 py-3 px-4 uppercase tracking-wide text-sm">Qty</th>
                            <th className="text-right font-semibold text-gray-700 py-3 px-4 uppercase tracking-wide text-sm">Rate</th>
                            <th className="text-right font-semibold text-gray-700 py-3 px-4 uppercase tracking-wide text-sm">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invoice.items.map(item => (
                            <tr key={item.id}>
                                <td className="py-4 px-4 text-gray-800 font-medium">{item.description || 'Item Description'}</td>
                                <td className="text-right py-4 px-4 text-gray-600">{item.units}</td>
                                <td className="text-right py-4 px-4 text-gray-600">{formatCurrency(item.price)}</td>
                                <td className="text-right py-4 px-4 text-gray-800 font-semibold">{formatCurrency(item.units * item.price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Total with VAT Breakdown */}
                <div className="flex justify-end mb-8">
                    <div className="w-80">
                        <div className="bg-white border-2 border-gray-800 p-6 rounded-lg space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Subtotal:</span>
                                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                            </div>
                            {vatRate > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700">VAT ({vatRate}% {vatInclusive ? 'Inclusive' : 'Exclusive'}):</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(vatAmount)}</span>
                                </div>
                            )}
                            <div className="border-t-2 border-gray-800 pt-3">
                                <div className="bg-gray-800 text-white px-4 py-3 rounded flex justify-between items-center">
                                    <span className="text-lg font-semibold">TOTAL</span>
                                    <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
                        <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                )}

                {/* Payment Details */}
                <div className="border-t-2 border-gray-200 pt-6">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Payment Details</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">Method:</p>
                            <p className="text-gray-800 font-medium">{invoice.paymentDetails.method || 'Bank Transfer'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Account Name:</p>
                            <p className="text-gray-800 font-medium">{invoice.paymentDetails.accountName}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Account Number:</p>
                            <p className="text-gray-800 font-medium">{invoice.paymentDetails.accountNumber}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Bank:</p>
                            <p className="text-gray-800 font-medium">{invoice.paymentDetails.bankName}</p>
                        </div>
                    </div>
                </div>

                {/* Signature */}
                {invoice.signatureUrl && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Authorized Signature:</p>
                        <img src={invoice.signatureUrl} alt="Signature" className="max-h-16 max-w-xs" />
                    </div>
                )}
            </div>
        );
    }

    if (template === 'modern') {
        return (
            <div style={a4Style} className="bg-white print:shadow-none" id="invoice-preview">
                {/* Header with accent */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 -m-8 mb-8 rounded-t-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-5xl font-bold">INVOICE</h1>
                            <p className="text-indigo-100 mt-2 text-lg">#{invoice.invoiceNumber}</p>
                        </div>
                        {invoice.companyLogoUrl ? (
                            <img src={invoice.companyLogoUrl} alt="Logo" className="max-h-16 bg-white p-2 rounded" />
                        ) : (
                            <div className="text-3xl font-bold">{invoice.from.name || 'Company'}</div>
                        )}
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg">
                        <p className="text-xs text-indigo-600 font-semibold uppercase">Issue Date</p>
                        <p className="text-lg font-bold text-gray-800 mt-1">{invoice.issuedDate}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg">
                        <p className="text-xs text-purple-600 font-semibold uppercase">Due Date</p>
                        <p className="text-lg font-bold text-gray-800 mt-1">{invoice.dueDate}</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-red-50 p-4 rounded-lg">
                        <p className="text-xs text-pink-600 font-semibold uppercase">Amount</p>
                        <p className="text-lg font-bold text-gray-800 mt-1">{formatCurrency(totalAmount)}</p>
                    </div>
                </div>

                {/* From/To with Cards */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="border-l-4 border-indigo-600 pl-4">
                        <p className="text-xs text-indigo-600 font-bold uppercase mb-2">From</p>
                        <p className="font-bold text-gray-800 text-lg">{invoice.from.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{invoice.from.address}</p>
                        <p className="text-sm text-gray-600">{invoice.from.email}</p>
                        <p className="text-sm text-gray-600">{invoice.from.phone}</p>
                    </div>
                    <div className="border-l-4 border-purple-600 pl-4">
                        <p className="text-xs text-purple-600 font-bold uppercase mb-2">Bill To</p>
                        <p className="font-bold text-gray-800 text-lg">{invoice.to.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{invoice.to.address}</p>
                        <p className="text-sm text-gray-600">{invoice.to.email}</p>
                        <p className="text-sm text-gray-600">{invoice.to.phone}</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                            <th className="text-left font-semibold py-3 px-4 uppercase text-sm">Description</th>
                            <th className="text-right font-semibold py-3 px-4 uppercase text-sm">Qty</th>
                            <th className="text-right font-semibold py-3 px-4 uppercase text-sm">Rate</th>
                            <th className="text-right font-semibold py-3 px-4 uppercase text-sm">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, idx) => (
                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-3 px-4 text-gray-800 font-medium">{item.description}</td>
                                <td className="text-right py-3 px-4 text-gray-600">{item.units}</td>
                                <td className="text-right py-3 px-4 text-gray-600">{formatCurrency(item.price)}</td>
                                <td className="text-right py-3 px-4 text-gray-800 font-semibold">{formatCurrency(item.units * item.price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Total with VAT Breakdown */}
                <div className="flex justify-end mb-8">
                    <div className="w-80">
                        <div className="bg-white border-2 border-purple-200 p-6 rounded-lg shadow-lg space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Subtotal:</span>
                                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                            </div>
                            {vatRate > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700">VAT ({vatRate}% {vatInclusive ? 'Inclusive' : 'Exclusive'}):</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(vatAmount)}</span>
                                </div>
                            )}
                            <div className="border-t-2 border-purple-200 pt-3">
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg flex justify-between items-center">
                                    <span className="text-lg font-semibold">TOTAL DUE</span>
                                    <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes and Payment */}
                {invoice.notes && (
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-600">
                        <p className="text-sm font-semibold text-purple-900 mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{invoice.notes}</p>
                    </div>
                )}

                <div className="border-t-2 border-gray-200 pt-6">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Payment Information</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                            <div>
                                <p className="text-gray-500 text-xs">Method</p>
                                <p className="text-gray-800 font-medium">{invoice.paymentDetails.method}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                            <div>
                                <p className="text-gray-500 text-xs">Account</p>
                                <p className="text-gray-800 font-medium">{invoice.paymentDetails.accountName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
                            <div>
                                <p className="text-gray-500 text-xs">Number</p>
                                <p className="text-gray-800 font-medium">{invoice.paymentDetails.accountNumber}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                            <div>
                                <p className="text-gray-500 text-xs">Bank</p>
                                <p className="text-gray-800 font-medium">{invoice.paymentDetails.bankName}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signature */}
                {invoice.signatureUrl && (
                    <div className="mt-8 pt-6 border-t-2 border-gradient-to-r from-indigo-200 to-purple-200">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Authorized Signature:</p>
                        <img src={invoice.signatureUrl} alt="Signature" className="max-h-16 max-w-xs" />
                    </div>
                )}
            </div>
        );
    }

    if (template === 'minimal') {
        return (
            <div style={a4Style} className="bg-white print:shadow-none" id="invoice-preview">
                {/* Minimal Header */}
                <div className="flex justify-between items-start mb-16">
                    {invoice.companyLogoUrl ? (
                        <img src={invoice.companyLogoUrl} alt="Logo" className="max-h-12" />
                    ) : (
                        <div className="text-2xl font-light text-gray-800">{invoice.from.name || 'Company'}</div>
                    )}
                    <div className="text-right">
                        <h1 className="text-6xl font-thin text-gray-300">INVOICE</h1>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-4 gap-8 mb-16 pb-8 border-b border-gray-200">
                    <div>
                        <p className="text-xs text-gray-400 uppercase mb-1">Invoice</p>
                        <p className="text-sm font-medium text-gray-800">#{invoice.invoiceNumber}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase mb-1">Issued</p>
                        <p className="text-sm font-medium text-gray-800">{invoice.issuedDate}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase mb-1">Due</p>
                        <p className="text-sm font-medium text-gray-800">{invoice.dueDate}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase mb-1">Amount</p>
                        <p className="text-sm font-semibold text-gray-800">{formatCurrency(totalAmount)}</p>
                    </div>
                </div>

                {/* From/To Minimal */}
                <div className="grid grid-cols-2 gap-16 mb-16">
                    <div>
                        <p className="text-xs text-gray-400 uppercase mb-3">From</p>
                        <p className="font-medium text-gray-800">{invoice.from.name}</p>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                            {invoice.from.address}<br />
                            {invoice.from.email}<br />
                            {invoice.from.phone}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase mb-3">To</p>
                        <p className="font-medium text-gray-800">{invoice.to.name}</p>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                            {invoice.to.address}<br />
                            {invoice.to.email}<br />
                            {invoice.to.phone}
                        </p>
                    </div>
                </div>

                {/* Minimal Table */}
                <table className="w-full mb-16">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left font-normal text-xs text-gray-400 uppercase pb-3">Description</th>
                            <th className="text-right font-normal text-xs text-gray-400 uppercase pb-3">Qty</th>
                            <th className="text-right font-normal text-xs text-gray-400 uppercase pb-3">Rate</th>
                            <th className="text-right font-normal text-xs text-gray-400 uppercase pb-3">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map(item => (
                            <tr key={item.id} className="border-b border-gray-100">
                                <td className="py-4 text-gray-800">{item.description}</td>
                                <td className="text-right py-4 text-gray-600 text-sm">{item.units}</td>
                                <td className="text-right py-4 text-gray-600 text-sm">{formatCurrency(item.price)}</td>
                                <td className="text-right py-4 text-gray-800 font-medium">{formatCurrency(item.units * item.price)}</td>
                            </tr>
                        ))}
                        <tr>
                            <td colSpan={3} className="text-right pt-6 pb-2 text-sm text-gray-600">Subtotal</td>
                            <td className="text-right pt-6 pb-2 text-gray-800 font-medium">{formatCurrency(subtotal)}</td>
                        </tr>
                        {vatRate > 0 && (
                            <tr>
                                <td colSpan={3} className="text-right pb-2 text-sm text-gray-600">VAT ({vatRate}% {vatInclusive ? 'Inclusive' : 'Exclusive'})</td>
                                <td className="text-right pb-2 text-gray-800 font-medium">{formatCurrency(vatAmount)}</td>
                            </tr>
                        )}
                        <tr className="border-t-2 border-gray-800">
                            <td colSpan={3} className="text-right pt-3 font-medium text-gray-800">Total</td>
                            <td className="text-right pt-3 text-xl font-semibold text-gray-800">{formatCurrency(totalAmount)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Notes */}
                {invoice.notes && (
                    <div className="mb-12">
                        <p className="text-xs text-gray-400 uppercase mb-2">Notes</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{invoice.notes}</p>
                    </div>
                )}

                {/* Payment Minimal */}
                <div className="border-t border-gray-200 pt-8">
                    <p className="text-xs text-gray-400 uppercase mb-4">Payment Details</p>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="text-gray-400">Method:</span> {invoice.paymentDetails.method}</p>
                        <p><span className="text-gray-400">Account:</span> {invoice.paymentDetails.accountName}</p>
                        <p><span className="text-gray-400">Number:</span> {invoice.paymentDetails.accountNumber}</p>
                        <p><span className="text-gray-400">Bank:</span> {invoice.paymentDetails.bankName}</p>
                    </div>
                </div>

                {/* Signature */}
                {invoice.signatureUrl && (
                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <p className="text-xs text-gray-400 uppercase mb-3">Authorized Signature</p>
                        <img src={invoice.signatureUrl} alt="Signature" className="max-h-16 max-w-xs" />
                    </div>
                )}
            </div>
        );
    }

    if (template === 'professional') {
        return (
            <div style={a4Style} className="bg-white print:shadow-none" id="invoice-preview">
                {/* Professional Header */}
                <div className="border-b-4 border-blue-600 pb-6 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            {invoice.companyLogoUrl ? (
                                <img src={invoice.companyLogoUrl} alt="Logo" className="max-h-14 mb-3" />
                            ) : (
                                <div className="text-2xl font-bold text-blue-900 mb-3">{invoice.from.name}</div>
                            )}
                            <div className="text-sm text-gray-600">
                                <p>{invoice.from.address}</p>
                                <p>{invoice.from.email} | {invoice.from.phone}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-4xl font-bold text-blue-900">INVOICE</h1>
                            <p className="text-blue-600 font-semibold mt-1">#{invoice.invoiceNumber}</p>
                        </div>
                    </div>
                </div>

                {/* Invoice Info Table */}
                <div className="mb-8">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 text-gray-600 font-semibold w-32">Invoice Date:</td>
                                <td className="py-2 text-gray-800">{invoice.issuedDate}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 text-gray-600 font-semibold">Due Date:</td>
                                <td className="py-2 text-gray-800">{invoice.dueDate}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 text-gray-600 font-semibold">Amount Due:</td>
                                <td className="py-2 text-blue-600 font-bold" colSpan={3}>{formatCurrency(totalAmount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Bill To */}
                <div className="mb-8 p-4 bg-blue-50 rounded">
                    <p className="text-sm font-semibold text-blue-900 mb-2">BILL TO</p>
                    <p className="font-bold text-gray-800">{invoice.to.name}</p>
                    <p className="text-sm text-gray-600">{invoice.to.address}</p>
                    <p className="text-sm text-gray-600">{invoice.to.email} | {invoice.to.phone}</p>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="bg-blue-900 text-white">
                            <th className="text-left font-semibold py-3 px-4 uppercase text-sm">Description</th>
                            <th className="text-center font-semibold py-3 px-4 uppercase text-sm w-20">Qty</th>
                            <th className="text-right font-semibold py-3 px-4 uppercase text-sm w-32">Rate</th>
                            <th className="text-right font-semibold py-3 px-4 uppercase text-sm w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, idx) => (
                            <tr key={item.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}>
                                <td className="py-3 px-4 text-gray-800">{item.description}</td>
                                <td className="text-center py-3 px-4 text-gray-600">{item.units}</td>
                                <td className="text-right py-3 px-4 text-gray-600">{formatCurrency(item.price)}</td>
                                <td className="text-right py-3 px-4 text-gray-800 font-semibold">{formatCurrency(item.units * item.price)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-blue-600">
                            <td colSpan={3} className="text-right pt-4 pb-2 font-semibold text-gray-700">Subtotal:</td>
                            <td className="text-right pt-4 pb-2 text-gray-800 font-semibold">{formatCurrency(subtotal)}</td>
                        </tr>
                        {vatRate > 0 && (
                            <tr>
                                <td colSpan={3} className="text-right pb-2 font-semibold text-gray-700">VAT ({vatRate}% {vatInclusive ? 'Inclusive' : 'Exclusive'}):</td>
                                <td className="text-right pb-2 text-gray-800 font-semibold">{formatCurrency(vatAmount)}</td>
                            </tr>
                        )}
                        <tr className="bg-blue-900 text-white">
                            <td colSpan={3} className="text-right py-3 px-4 font-bold text-lg">TOTAL:</td>
                            <td className="text-right py-3 px-4 font-bold text-xl">{formatCurrency(totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {invoice.notes && (
                    <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Important Notes:</p>
                        <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                )}

                {/* Payment Instructions */}
                <div className="border-t-2 border-gray-300 pt-6">
                    <p className="text-sm font-bold text-blue-900 mb-3">PAYMENT INSTRUCTIONS</p>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="text-gray-600 font-semibold">Payment Method:</p>
                            <p className="text-gray-800 mt-1">{invoice.paymentDetails.method || 'Bank Transfer'}</p>
                        </div>
                        <div>
                            <p className="text-gray-600 font-semibold">Bank Name:</p>
                            <p className="text-gray-800 mt-1">{invoice.paymentDetails.bankName}</p>
                        </div>
                        <div>
                            <p className="text-gray-600 font-semibold">Account Name:</p>
                            <p className="text-gray-800 mt-1">{invoice.paymentDetails.accountName}</p>
                        </div>
                        <div>
                            <p className="text-gray-600 font-semibold">Account Number:</p>
                            <p className="text-gray-800 mt-1 font-mono">{invoice.paymentDetails.accountNumber}</p>
                        </div>
                    </div>
                    <div className="mt-6 p-3 bg-blue-50 rounded text-xs text-blue-900">
                        <p className="font-semibold">Please include invoice number #{invoice.invoiceNumber} as payment reference</p>
                    </div>
                </div>

                {/* Signature */}
                {invoice.signatureUrl && (
                    <div className="mt-8 pt-6 border-t-2 border-blue-200">
                        <p className="text-sm font-semibold text-blue-900 mb-3">Authorized Signature:</p>
                        <img src={invoice.signatureUrl} alt="Signature" className="max-h-16 max-w-xs" />
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-300 text-center text-xs text-gray-500">
                    <p>Thank you for your business!</p>
                    <p className="mt-1">For questions about this invoice, please contact {invoice.from.email}</p>
                </div>
            </div>
        );
    }

    if (template === 'pdf') {

        return (
            <div style={a4Style} className="bg-white print:shadow-none" id="invoice-preview">
                {/* Header with dark background */}
                <div className="bg-gray-800 text-white -m-[20mm] mb-8 p-[20mm] pb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold">INVOICE</h1>
                        </div>
                        {invoice.companyLogoUrl && (
                            <img src={invoice.companyLogoUrl} alt="Company Logo" className="max-h-16 bg-white p-2 rounded" />
                        )}
                    </div>
                    <p className="text-gray-300 mt-2">#{invoice.invoiceNumber}</p>
                </div>

                {/* From/To Section */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">From</p>
                        <p className="font-bold text-gray-900">{invoice.from.name}</p>
                        <p className="text-sm text-gray-600">{invoice.from.address}</p>
                        <p className="text-sm text-gray-600">{invoice.from.email}</p>
                        <p className="text-sm text-gray-600">{invoice.from.phone}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Bill To</p>
                        <p className="font-bold text-gray-900">{invoice.to.name}</p>
                        <p className="text-sm text-gray-600">{invoice.to.address}</p>
                        <p className="text-sm text-gray-600">{invoice.to.email}</p>
                        <p className="text-sm text-gray-600">{invoice.to.phone}</p>
                    </div>
                </div>

                {/* Dates */}
                <div className="flex justify-between mb-6 text-sm">
                    <p><span className="text-gray-500">Issue Date:</span> <span className="font-medium">{invoice.issuedDate}</span></p>
                    <p><span className="text-gray-500">Due Date:</span> <span className="font-medium">{invoice.dueDate}</span></p>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="text-left font-bold text-xs uppercase py-3 px-2 text-gray-700">Description</th>
                            <th className="text-center font-bold text-xs uppercase py-3 px-2 text-gray-700 w-20">Qty</th>
                            <th className="text-right font-bold text-xs uppercase py-3 px-2 text-gray-700 w-32">Price</th>
                            <th className="text-right font-bold text-xs uppercase py-3 px-2 text-gray-700 w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, idx) => (
                            <tr key={item.id} className="border-b border-gray-100">
                                <td className="py-3 px-2 text-sm text-gray-800">{item.description}</td>
                                <td className="text-center py-3 px-2 text-sm text-gray-600">{item.units}</td>
                                <td className="text-right py-3 px-2 text-sm text-gray-600">{formatCurrency(item.price)}</td>
                                <td className="text-right py-3 px-2 text-sm font-medium text-gray-800">{formatCurrency(item.units * item.price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                    <div className="w-80">
                        <div className="border-t border-gray-200 pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">{formatCurrency(subtotal)}</span>
                            </div>
                            {vatRate > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">VAT ({vatRate}% {invoice.vatInclusive ? 'Inclusive' : 'Exclusive'})</span>
                                    <span className="font-medium">{formatCurrency(vatAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-800">
                                <span>TOTAL</span>
                                <span>{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Details */}
                {invoice.paymentDetails && (
                    <div className="mb-8">
                        <p className="text-xs font-bold text-gray-700 uppercase mb-3">Payment Details</p>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p><span className="text-gray-500">Method:</span> {invoice.paymentDetails.method}</p>
                            {invoice.paymentDetails.method === 'Bank Transfer' && (
                                <>
                                    {invoice.paymentDetails.bankName && <p><span className="text-gray-500">Bank:</span> {invoice.paymentDetails.bankName}</p>}
                                    {invoice.paymentDetails.accountName && <p><span className="text-gray-500">Account Name:</span> {invoice.paymentDetails.accountName}</p>}
                                    {invoice.paymentDetails.accountNumber && <p><span className="text-gray-500">Account Number:</span> {invoice.paymentDetails.accountNumber}</p>}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {invoice.notes && (
                    <div className="mb-8">
                        <p className="text-xs font-bold text-gray-700 uppercase mb-2">Notes</p>
                        <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                )}

                {/* Signature */}
                {invoice.signatureUrl && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-xs font-bold text-gray-700 uppercase mb-3">Authorized Signature</p>
                        <img src={invoice.signatureUrl} alt="Signature" className="max-h-16 max-w-xs" />
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">Thank you for your business!</p>
                </div>
            </div>
        );
    }

    return null;
};

export default InvoiceTemplate;
