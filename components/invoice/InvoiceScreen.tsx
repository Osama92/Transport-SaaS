import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { Invoice, Client } from '../../types';
import InvoiceForm from './InvoiceForm';
import InvoiceTemplate, { InvoiceTemplateType } from './InvoiceTemplates';
import InvoiceTemplatePicker from './InvoiceTemplatePicker';
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
    const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplateType>('classic');
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
    const [activeView, setActiveView] = useState<'form' | 'preview'>('form');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const [previewScale, setPreviewScale] = useState(1);
    const saveMenuRef = useRef<HTMLDivElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const previewContentRef = useRef<HTMLDivElement>(null);

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

    // Calculate scale to fit preview
    useLayoutEffect(() => {
        const calculateScale = () => {
            if (previewContainerRef.current && previewContentRef.current) {
                const container = previewContainerRef.current;
                const content = previewContentRef.current;

                // Get container dimensions (minus padding)
                const containerHeight = container.clientHeight - 32; // Account for padding
                const containerWidth = container.clientWidth - 32;

                // A4 dimensions in mm converted to pixels (approximate)
                const a4WidthPx = 794; // 210mm at 96 DPI
                const a4HeightPx = 1123; // 297mm at 96 DPI

                // Calculate scale needed to fit
                const scaleX = containerWidth / a4WidthPx;
                const scaleY = containerHeight / a4HeightPx;
                const scale = Math.min(scaleX, scaleY, 0.9); // Cap at 0.9 max scale

                setPreviewScale(scale);
            }
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);

        // Recalculate when switching views
        const timer = setTimeout(calculateScale, 100);

        return () => {
            window.removeEventListener('resize', calculateScale);
            clearTimeout(timer);
        };
    }, [activeView, templatePickerOpen]);

    const handleGeneratePdf = async () => {
        const input = document.getElementById('invoice-preview');
        if (!input) return;

        setIsGeneratingPdf(true);

        try {
            // A4 dimensions at 96 DPI
            const a4Width = 210; // mm
            const a4Height = 297; // mm

            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: input.scrollWidth,
                height: input.scrollHeight,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            // Calculate proper dimensions to fit A4
            const imgWidth = a4Width;
            const imgHeight = (canvas.height * a4Width) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Invoice-${invoice.id}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsGeneratingPdf(false);
        }
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
            
            {/* Tab Navigation for Mobile/Small Screens */}
            <div className="flex-grow flex flex-col mt-8 overflow-hidden">
                {/* Desktop: Side-by-side | Mobile: Tabs */}
                <div className="lg:hidden mb-4">
                    <div className="flex border-b border-gray-200 dark:border-slate-700">
                        <button
                            onClick={() => setActiveView('form')}
                            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                                activeView === 'form'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            Edit Invoice
                        </button>
                        <button
                            onClick={() => setActiveView('preview')}
                            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                                activeView === 'preview'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            Preview
                        </button>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                    {/* Left Side: Form - Takes 5 columns on desktop */}
                    <div className={`lg:col-span-5 overflow-y-auto ${activeView === 'preview' ? 'hidden lg:block' : ''}`}>
                        <div className="space-y-6 pr-4">
                            {/* Collapsible Template Picker */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                                <button
                                    onClick={() => setTemplatePickerOpen(!templatePickerOpen)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">
                                            {selectedTemplate === 'classic' && '📄'}
                                            {selectedTemplate === 'modern' && '🎨'}
                                            {selectedTemplate === 'minimal' && '✨'}
                                            {selectedTemplate === 'professional' && '💼'}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Template: <span className="capitalize">{selectedTemplate}</span>
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Click to change
                                            </p>
                                        </div>
                                    </div>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform ${templatePickerOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {templatePickerOpen && (
                                    <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                                        <InvoiceTemplatePicker selected={selectedTemplate} onChange={setSelectedTemplate} />
                                    </div>
                                )}
                            </div>

                            {/* Invoice Form */}
                            <InvoiceForm invoice={invoice} setInvoice={setInvoice} readOnly={isReadOnly} clients={clients} />
                        </div>
                    </div>

                    {/* Right Side: Preview - Takes 7 columns on desktop */}
                    <div className={`lg:col-span-7 flex flex-col overflow-hidden ${activeView === 'form' ? 'hidden lg:flex' : ''}`}>
                        {/* Preview Actions - Sticky Header */}
                        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Preview</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={handleGeneratePdf}
                                    disabled={isGeneratingPdf}
                                    className="flex items-center gap-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 font-semibold px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <DocumentTextIcon className="w-4 h-4" />
                                    {isGeneratingPdf ? 'Generating...' : 'PDF'}
                                </button>
                                <button
                                    onClick={() => onEmailRequest(invoice)}
                                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 font-semibold px-4 py-2 rounded-lg transition-colors"
                                >
                                    <EnvelopeIcon className="w-4 h-4" /> Email
                                </button>
                                <button className="lg:flex hidden items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 font-semibold px-4 py-2 rounded-lg transition-colors">
                                    <CreditCardIcon className="w-4 h-4" /> Payment
                                </button>
                            </div>
                        </div>

                        {/* Preview Content - Auto-scaled to fit */}
                        <div className="flex-1 overflow-hidden p-4" ref={previewContainerRef}>
                            <div className="w-full h-full flex items-start justify-center">
                                <div
                                    ref={previewContentRef}
                                    style={{
                                        transform: `scale(${previewScale})`,
                                        transformOrigin: 'top center',
                                        transition: 'transform 0.2s ease-in-out'
                                    }}
                                >
                                    <div className="bg-white rounded-lg shadow-xl border border-gray-200">
                                        <InvoiceTemplate invoice={invoice} template={selectedTemplate} />
                                    </div>
                                </div>
                            </div>
                        </div>
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