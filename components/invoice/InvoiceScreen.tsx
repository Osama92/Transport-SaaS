import React, { useState, useEffect, useRef } from 'react';
import type { Invoice, Client } from '../../types';
import InvoiceForm from './InvoiceForm';
import InvoicePreview from './InvoicePreview';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowLeftIcon, ExclamationCircleIcon, DocumentTextIcon, EnvelopeIcon, CreditCardIcon, ChevronDownIcon } from '../Icons';

interface InvoiceScreenProps {
    onCancel: () => void;
    onSave: (invoice: Invoice) => void;
    invoiceData?: Invoice | null;
    onEmailRequest: (invoice: Invoice) => void;
    clients: Client[];
}

const createInitialInvoice = (): Invoice => ({
    id: `#${(Math.random() * 100000).toFixed(0)}`,
    project: 'New Project',
    issuedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric'}),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric'}),
    from: {
        name: 'Your Company',
        address: '123 Main Street',
        email: 'billing@yourcompany.com',
        phone: '(555) 123-4567',
    },
    to: {
        name: 'Client Company',
        address: '',
        email: '',
        phone: '',
    },
    items: [
        { id: 1, description: 'Service or Product', units: 1, price: 0 },
    ],
    notes: 'Thank you for your business.',
    paymentDetails: {
        method: 'EFT Bank Transfer',
        accountName: 'Your Company Inc.',
        code: '123456',
        accountNumber: '987654321'
    },
    status: 'Draft',
});

const InvoiceScreen: React.FC<InvoiceScreenProps> = ({ onCancel, onSave, invoiceData, onEmailRequest, clients }) => {
    const [invoice, setInvoice] = useState<Invoice>(invoiceData || createInitialInvoice());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const saveMenuRef = useRef<HTMLDivElement>(null);
    
    const isReadOnly = invoice.status === 'Paid';

    useEffect(() => {
        if (invoiceData) {
            setInvoice(invoiceData);
        } else {
            setInvoice(createInitialInvoice());
        }
    }, [invoiceData]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
                setIsSaveMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleGeneratePdf = () => {
        const input = document.getElementById('invoice-preview');
        if (!input) return;

        setIsGeneratingPdf(true);
        html2canvas(input, { scale: 2 })
            .then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Invoice-${invoice.id}.pdf`);
            })
            .finally(() => setIsGeneratingPdf(false));
    };

    const handleSave = (status: 'Draft' | 'Sent') => {
        onSave({ ...invoice, status });
    };

    return (
        <div className="flex flex-col h-full">
            <header className="flex-shrink-0">
                 <button onClick={onCancel} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 mb-4">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Invoices
                </button>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{invoiceData ? (isReadOnly ? 'View Invoice' : 'Edit Invoice') : 'Create New Invoice'}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Fill in invoice details</p>
                {!isReadOnly && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg flex items-center gap-3 dark:bg-yellow-900/20 dark:border-yellow-800/30 dark:text-yellow-300">
                        <ExclamationCircleIcon className="w-5 h-5" />
                        You can save unfinished invoice as draft and complete later.
                    </div>
                )}
            </header>
            
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 overflow-y-auto">
                {/* Left Side: Form */}
                <div className="lg:overflow-y-auto pr-4">
                    <InvoiceForm invoice={invoice} setInvoice={setInvoice} readOnly={isReadOnly} clients={clients} />
                </div>

                {/* Right Side: Preview */}
                <div className="flex flex-col gap-6 lg:overflow-y-auto">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Preview</h2>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                             <button 
                                onClick={handleGeneratePdf}
                                disabled={isGeneratingPdf}
                                className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 font-semibold px-3 py-2 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600 disabled:opacity-50"
                            >
                                <DocumentTextIcon className="w-4 h-4" /> 
                                {isGeneratingPdf ? 'Generating...' : 'PDF'}
                            </button>
                            <button onClick={() => onEmailRequest(invoice)} className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 font-semibold px-3 py-2 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                                <EnvelopeIcon className="w-4 h-4" /> Email
                            </button>
                             <button className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 font-semibold px-3 py-2 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                                <CreditCardIcon className="w-4 h-4" /> Online Payment
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 lg:p-0">
                         <InvoicePreview invoice={invoice} />
                    </div>
                </div>
            </div>

            <footer className="flex-shrink-0 flex justify-end items-center gap-3 mt-8 pt-4 border-t dark:border-slate-700">
                {!isReadOnly && (
                    <div className="relative inline-block text-left" ref={saveMenuRef}>
                        <div className="flex rounded-lg shadow-sm">
                            <button
                                type="button"
                                onClick={() => handleSave('Sent')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-l-lg"
                            >
                                Save Invoice
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-r-lg border-l border-indigo-400"
                                aria-haspopup="true"
                                aria-expanded={isSaveMenuOpen}
                            >
                                <ChevronDownIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        {isSaveMenuOpen && (
                            <div className="origin-bottom-right absolute right-0 bottom-full mb-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black dark:ring-slate-700 ring-opacity-5 focus:outline-none z-10">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleSave('Draft'); setIsSaveMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700" role="menuitem">
                                        Save as Draft
                                    </a>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleSave('Sent'); setIsSaveMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700" role="menuitem">
                                        Save and Send
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </footer>
        </div>
    );
};

export default InvoiceScreen;