import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { Invoice, Client } from '../../types';
import InvoiceTemplate, { InvoiceTemplateType } from './InvoiceTemplates';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Select from 'react-select';
import { XMarkIcon, DocumentTextIcon, EnvelopeIcon, CreditCardIcon, PlusIcon, TrashIcon, ChevronDownIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingOutIcon } from '../Icons';
import { NIGERIAN_BANKS, PAYMENT_METHODS } from '../../constants/nigerianBanks';
import { generateInvoicePdf } from '../../utils/pdfGenerator';
import { useAuth } from '../../contexts/AuthContext';
import {
    updateOrganizationCompanyDetails,
    updateOrganizationPaymentDetails,
    updateOrganizationBranding
} from '../../services/firestore/organizations';

interface InvoiceScreenModernProps {
    onCancel: () => void;
    onSave: (invoice: Invoice) => void;
    invoiceData?: Invoice | null;
    onEmailRequest: (invoice: Invoice) => void;
    clients: Client[];
}

const createInitialInvoice = (organization: any): Invoice => {

    const invoiceId = `INV${Date.now().toString().slice(-6)}`;
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const invoiceNumber = `INV-${year}${month}-${Date.now().toString().slice(-6)}`;

    return {
        id: invoiceId,
        invoiceNumber: invoiceNumber,
        organizationId: organization?.id || '', // Will be set when saving
        project: '',
        issuedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        from: {
            name: organization?.name || 'Your Company',
            address: organization?.companyDetails?.address || '123 Main Street',
            email: organization?.companyDetails?.email || 'billing@yourcompany.com',
            phone: organization?.companyDetails?.phone || '(555) 123-4567',
        },
        to: {
            name: '',
            address: '',
            email: '',
            phone: '',
        },
        items: [
            { id: 1, description: '', units: 1, price: 0 },
        ],
        total: 0, // Will be calculated
        notes: 'Thank you for your business.',
        paymentDetails: {
            method: 'Bank Transfer',
            accountName: organization?.paymentDetails?.bankAccountName || 'Your Company Inc.',
            code: '',
            accountNumber: organization?.paymentDetails?.bankAccountNumber || '987654321',
            bankName: organization?.paymentDetails?.bankName || 'Your Bank'
        },
        companyLogoUrl: organization?.companyDetails?.logoUrl,
        signatureUrl: organization?.companyDetails?.signatureUrl,
        vatRate: 7.5,
        vatInclusive: false,
        status: 'Draft',
    };
};

const InvoiceScreenModern: React.FC<InvoiceScreenModernProps> = ({ onCancel, onSave, invoiceData, onEmailRequest, clients }) => {
    const { organization, organizationId } = useAuth();
    const [invoice, setInvoice] = useState<Invoice>(invoiceData || createInitialInvoice(organization));
    const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplateType>(invoiceData?.template || 'pdf');

    // Helper to convert date string to ISO format for input[type="date"]
    const toDateInputValue = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                // If invalid, return today's date
                return new Date().toISOString().split('T')[0];
            }
            return date.toISOString().split('T')[0];
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    };
    const [showTemplates, setShowTemplates] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveDropdown, setShowSaveDropdown] = useState(false);
    const [previewScale, setPreviewScale] = useState(1);
    const [manualZoom, setManualZoom] = useState(100); // Zoom percentage
    const [autoFitScale, setAutoFitScale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const previewContentRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (invoiceData) {
            setInvoice(invoiceData);
        }
    }, [invoiceData]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSaveDropdown(false);
            }
        };

        if (showSaveDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSaveDropdown]);

    // Save settings to Firebase whenever payment details, branding, or company info changes
    useEffect(() => {
        if (!organizationId || !invoice) return;

        const saveToFirebase = async () => {
            try {
                // Update company details if changed
                if (invoice.from) {
                    await updateOrganizationCompanyDetails(organizationId, {
                        address: invoice.from.address,
                        email: invoice.from.email,
                        phone: invoice.from.phone,
                    });
                }

                // Update payment details if changed
                if (invoice.paymentDetails) {
                    await updateOrganizationPaymentDetails(organizationId, {
                        bankAccountName: invoice.paymentDetails.accountName,
                        bankAccountNumber: invoice.paymentDetails.accountNumber,
                        bankName: invoice.paymentDetails.bankName,
                    });
                }

                // Update branding if changed
                if (invoice.companyLogoUrl || invoice.signatureUrl) {
                    await updateOrganizationBranding(organizationId, {
                        logoUrl: invoice.companyLogoUrl,
                        signatureUrl: invoice.signatureUrl,
                    });
                }
            } catch (error) {
                console.error('Error saving invoice settings to Firebase:', error);
            }
        };

        // Debounce the save to avoid too many Firebase writes
        const timeoutId = setTimeout(saveToFirebase, 1000);
        return () => clearTimeout(timeoutId);
    }, [invoice.paymentDetails, invoice.companyLogoUrl, invoice.signatureUrl, invoice.from, organizationId]);

    // Calculate auto-fit scale
    useLayoutEffect(() => {
        const calculateScale = () => {
            if (previewContainerRef.current && previewContentRef.current) {
                const container = previewContainerRef.current;

                // Get container dimensions (minus padding)
                const containerHeight = container.clientHeight - 64; // Account for 8*2 padding (p-8)
                const containerWidth = container.clientWidth - 64;

                // A4 dimensions in mm converted to pixels (approximate)
                const a4WidthPx = 794; // 210mm at 96 DPI
                const a4HeightPx = 1123; // 297mm at 96 DPI

                // Calculate scale needed to fit
                const scaleX = containerWidth / a4WidthPx;
                const scaleY = containerHeight / a4HeightPx;
                const scale = Math.min(scaleX, scaleY, 0.75); // Cap at 0.75 max scale

                setAutoFitScale(scale);
                // Apply the scale with manual zoom factor
                setPreviewScale(scale * (manualZoom / 100));
            }
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);

        // Recalculate when template changes or container size changes
        const timer = setTimeout(calculateScale, 100);

        return () => {
            window.removeEventListener('resize', calculateScale);
            clearTimeout(timer);
        };
    }, [selectedTemplate, showTemplates, manualZoom]);

    // Zoom control functions
    const handleZoomIn = () => {
        setManualZoom(prev => Math.min(prev + 10, 300)); // Max 300%
    };

    const handleZoomOut = () => {
        setManualZoom(prev => Math.max(prev - 10, 50)); // Min 50%
    };

    const handleZoomReset = () => {
        setManualZoom(100); // Reset to fit
    };

    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        try {
            await generateInvoicePdf(invoice, selectedTemplate);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleSave = async (status: 'Draft' | 'Sent') => {
        setIsSaving(true);
        setShowSaveDropdown(false);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
        onSave({ ...invoice, status });
        setIsSaving(false);
    };

    const addItem = () => {
        setInvoice(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), description: '', units: 1, price: 0 }]
        }));
    };

    const removeItem = (id: number) => {
        setInvoice(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const updateItem = (id: number, field: string, value: any) => {
        setInvoice(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    // Calculate amounts with VAT
    const subtotalAmount = invoice.items.reduce((sum, item) => sum + (item.units * item.price), 0);
    const vatRate = invoice.vatRate || 0;
    const vatInclusive = invoice.vatInclusive || false;

    let subtotal = subtotalAmount;
    let vatAmount = 0;
    let totalAmount = subtotalAmount;

    if (vatRate > 0) {
        if (vatInclusive) {
            // VAT is included in the price, so we extract it
            subtotal = subtotalAmount / (1 + vatRate / 100);
            vatAmount = subtotalAmount - subtotal;
            totalAmount = subtotalAmount;
        } else {
            // VAT is added on top
            subtotal = subtotalAmount;
            vatAmount = subtotalAmount * (vatRate / 100);
            totalAmount = subtotalAmount + vatAmount;
        }
    }

    const templates = [
        { id: 'classic' as InvoiceTemplateType, name: 'Classic', icon: '📄' },
        { id: 'modern' as InvoiceTemplateType, name: 'Modern', icon: '🎨' },
        { id: 'minimal' as InvoiceTemplateType, name: 'Minimal', icon: '✨' },
        { id: 'professional' as InvoiceTemplateType, name: 'Professional', icon: '💼' },
    ];

    return (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col">
            {/* Saving Overlay */}
            {isSaving && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
                        <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Saving Invoice</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we save your invoice...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {invoiceData ? 'Edit Invoice' : 'Create Invoice'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Close"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Form */}
                <div className="w-full lg:w-5/12 overflow-y-auto bg-gray-50 dark:bg-slate-800/50 p-8">
                    <div className="max-w-xl mx-auto space-y-6">
                        {/* Invoice Details Section */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Invoice Details</h2>

                            {/* Client Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Client <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={invoice.to.name}
                                    onChange={(e) => {
                                        const client = clients.find(c => c.name === e.target.value);
                                        if (client) {
                                            setInvoice(prev => ({
                                                ...prev,
                                                to: {
                                                    name: client.name,
                                                    address: client.address || '',
                                                    email: client.email,
                                                    phone: client.phone || ''
                                                }
                                            }));
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                >
                                    <option value="">Select a client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.name}>{client.name}</option>
                                    ))}
                                </select>
                                {invoice.to.name && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{invoice.to.email}</p>
                                )}
                            </div>

                            {/* Issue Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issue date</label>
                                <input
                                    type="date"
                                    value={toDateInputValue(invoice.issuedDate)}
                                    onChange={(e) => {
                                        console.log('Issue date input value:', e.target.value);
                                        // e.target.value is in format "YYYY-MM-DD"
                                        // We need to convert to local date to avoid timezone issues
                                        const [year, month, day] = e.target.value.split('-');
                                        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                        const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                        console.log('Formatted issue date:', formattedDate);
                                        setInvoice(prev => ({
                                            ...prev,
                                            issuedDate: formattedDate
                                        }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Due Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due date</label>
                                <input
                                    type="date"
                                    value={toDateInputValue(invoice.dueDate)}
                                    onChange={(e) => {
                                        console.log('Due date input value:', e.target.value);
                                        // e.target.value is in format "YYYY-MM-DD"
                                        // We need to convert to local date to avoid timezone issues
                                        const [year, month, day] = e.target.value.split('-');
                                        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                        const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                        console.log('Formatted due date:', formattedDate);
                                        setInvoice(prev => ({
                                            ...prev,
                                            dueDate: formattedDate
                                        }));
                                    }}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Template Selector */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowTemplates(!showTemplates)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-left flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="text-lg">{templates.find(t => t.id === selectedTemplate)?.icon}</span>
                                            <span className="capitalize">{selectedTemplate}</span>
                                        </span>
                                        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showTemplates && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg">
                                            {templates.map(template => (
                                                <button
                                                    key={template.id}
                                                    onClick={() => {
                                                        setSelectedTemplate(template.id);
                                                        setInvoice(prev => ({ ...prev, template: template.id }));
                                                        setShowTemplates(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                                >
                                                    <span className="text-lg">{template.icon}</span>
                                                    <span className="text-sm">{template.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Product Section */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Items</h2>
                            <div className="space-y-3">
                                {invoice.items.map((item, index) => (
                                    <div key={item.id} className="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    placeholder="Item description"
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                                                        <input
                                                            type="number"
                                                            value={item.units}
                                                            onChange={(e) => updateItem(item.id, 'units', parseInt(e.target.value) || 0)}
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Price</label>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                                                        <div className="px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-500 rounded-md text-sm font-semibold">
                                                            ₦{(item.units * item.price).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {invoice.items.length > 1 && (
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={addItem}
                                className="mt-3 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add New Line
                            </button>
                        </div>

                        {/* VAT Section */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">VAT Settings</h2>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">VAT Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={invoice.vatRate || 0}
                                        onChange={(e) => setInvoice(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                                        placeholder="7.5"
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">VAT Type</label>
                                    <select
                                        value={invoice.vatInclusive ? 'inclusive' : 'exclusive'}
                                        onChange={(e) => setInvoice(prev => ({ ...prev, vatInclusive: e.target.value === 'inclusive' }))}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="exclusive">Exclusive (add VAT)</option>
                                        <option value="inclusive">Inclusive (VAT included)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Payment Details Section */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Payment Details</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                                    <Select
                                        value={PAYMENT_METHODS.find(m => m.value === invoice.paymentDetails?.method)}
                                        onChange={(option) => setInvoice(prev => ({
                                            ...prev,
                                            paymentDetails: { ...prev.paymentDetails!, method: option?.value || 'Bank Transfer' }
                                        }))}
                                        options={PAYMENT_METHODS}
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        placeholder="Select payment method"
                                    />
                                </div>

                                {invoice.paymentDetails?.method === 'Bank Transfer' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank Name</label>
                                            <Select
                                                value={NIGERIAN_BANKS.find(b => b.value === invoice.paymentDetails?.bankName)}
                                                onChange={(option) => setInvoice(prev => ({
                                                    ...prev,
                                                    paymentDetails: { ...prev.paymentDetails!, bankName: option?.value || '' }
                                                }))}
                                                options={NIGERIAN_BANKS}
                                                className="react-select-container"
                                                classNamePrefix="react-select"
                                                placeholder="Search and select bank"
                                                isClearable
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name</label>
                                            <input
                                                type="text"
                                                value={invoice.paymentDetails?.accountName || ''}
                                                onChange={(e) => setInvoice(prev => ({
                                                    ...prev,
                                                    paymentDetails: { ...prev.paymentDetails!, accountName: e.target.value }
                                                }))}
                                                placeholder="Your Company Inc."
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
                                            <input
                                                type="text"
                                                value={invoice.paymentDetails?.accountNumber || ''}
                                                onChange={(e) => setInvoice(prev => ({
                                                    ...prev,
                                                    paymentDetails: { ...prev.paymentDetails!, accountNumber: e.target.value }
                                                }))}
                                                placeholder="0123456789"
                                                maxLength={10}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </>
                                )}

                                {invoice.paymentDetails?.method === 'Cheque' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payable To</label>
                                        <input
                                            type="text"
                                            value={invoice.paymentDetails?.accountName || ''}
                                            onChange={(e) => setInvoice(prev => ({
                                                ...prev,
                                                paymentDetails: { ...prev.paymentDetails!, accountName: e.target.value }
                                            }))}
                                            placeholder="Your Company Inc."
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}

                                {invoice.paymentDetails?.method === 'Cash' && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                        Payment to be made in cash upon receipt of invoice.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Company Details */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Company Details</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Your Company Name"
                                        value={invoice.from.name || ''}
                                        onChange={(e) => setInvoice(prev => ({ ...prev, from: { ...prev.from, name: e.target.value } }))}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                                    <textarea
                                        placeholder="Company Address"
                                        value={invoice.from.address || ''}
                                        onChange={(e) => setInvoice(prev => ({ ...prev, from: { ...prev.from, address: e.target.value } }))}
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        placeholder="company@example.com"
                                        value={invoice.from.email || ''}
                                        onChange={(e) => setInvoice(prev => ({ ...prev, from: { ...prev.from, email: e.target.value } }))}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="+234 000 000 0000"
                                        value={invoice.from.phone || ''}
                                        onChange={(e) => setInvoice(prev => ({ ...prev, from: { ...prev.from, phone: e.target.value } }))}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Branding */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Branding</h2>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Logo</label>
                                <div className="flex items-center gap-3">
                                    {invoice.companyLogoUrl && (
                                        <img src={invoice.companyLogoUrl} alt="Company Logo" className="h-12 w-12 object-contain rounded border border-gray-200 dark:border-slate-600" />
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <div className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-center hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                                            {invoice.companyLogoUrl ? 'Change Logo' : 'Upload Logo'}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                console.log('Logo file input change event triggered');
                                                const file = e.target.files?.[0];
                                                console.log('Selected logo file:', file?.name, file?.size);
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        console.log('Logo FileReader completed, data length:', (reader.result as string)?.length);
                                                        setInvoice(prev => ({ ...prev, companyLogoUrl: reader.result as string }));
                                                    };
                                                    reader.onerror = (error) => {
                                                        console.error('Logo FileReader error:', error);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                                // Reset input value to allow re-uploading same file
                                                e.target.value = '';
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                    {invoice.companyLogoUrl && (
                                        <button
                                            onClick={() => setInvoice(prev => ({ ...prev, companyLogoUrl: undefined }))}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Signature Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signature</label>
                                <div className="flex items-center gap-3">
                                    {invoice.signatureUrl && (
                                        <img src={invoice.signatureUrl} alt="Signature" className="h-12 w-24 object-contain rounded border border-gray-200 dark:border-slate-600 bg-white" />
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <div className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-center hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                                            {invoice.signatureUrl ? 'Change Signature' : 'Upload Signature'}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                console.log('Signature file input change event triggered');
                                                const file = e.target.files?.[0];
                                                console.log('Selected signature file:', file?.name, file?.size);
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        console.log('Signature FileReader completed, data length:', (reader.result as string)?.length);
                                                        setInvoice(prev => ({ ...prev, signatureUrl: reader.result as string }));
                                                    };
                                                    reader.onerror = (error) => {
                                                        console.error('Signature FileReader error:', error);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                                // Reset input value to allow re-uploading same file
                                                e.target.value = '';
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                    {invoice.signatureUrl && (
                                        <button
                                            onClick={() => setInvoice(prev => ({ ...prev, signatureUrl: undefined }))}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                            <textarea
                                value={invoice.notes}
                                onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3}
                                placeholder="Additional notes or payment terms"
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                        </div>

                        {/* Save Info */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-4">
                            Last saved: Today at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="hidden lg:flex lg:w-7/12 flex-col bg-gray-100 dark:bg-slate-900">
                    {/* Preview Header */}
                    <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Preview
                            </h2>

                            {/* Zoom Controls */}
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                                <button
                                    onClick={handleZoomOut}
                                    disabled={manualZoom <= 50}
                                    className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Zoom Out"
                                >
                                    <MagnifyingGlassMinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </button>
                                <button
                                    onClick={handleZoomReset}
                                    className="px-2 py-1 min-w-[60px] text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors"
                                    title="Reset Zoom"
                                >
                                    {manualZoom}%
                                </button>
                                <button
                                    onClick={handleZoomIn}
                                    disabled={manualZoom >= 300}
                                    className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Zoom In"
                                >
                                    <MagnifyingGlassPlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </button>
                                <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1" />
                                <button
                                    onClick={handleZoomReset}
                                    className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors"
                                    title="Fit to View"
                                >
                                    <ArrowsPointingOutIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGeneratePdf}
                                disabled={isGeneratingPdf}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                            >
                                <DocumentTextIcon className="w-4 h-4" />
                                PDF
                            </button>
                            <button
                                onClick={() => onEmailRequest(invoice)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                <EnvelopeIcon className="w-4 h-4" />
                                Email
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                                <CreditCardIcon className="w-4 h-4" />
                                Payment page
                            </button>
                        </div>
                    </div>

                    {/* Preview Content - Auto-scaled with zoom controls */}
                    <div
                        className="flex-1 overflow-auto p-8"
                        ref={previewContainerRef}
                        style={{
                            // Only allow scroll when zoomed in beyond fit
                            overflow: manualZoom > 100 ? 'auto' : 'hidden'
                        }}
                    >
                        <div className="w-full min-h-full flex items-start justify-center">
                            <div
                                ref={previewContentRef}
                                id="invoice-preview"
                                className="bg-white rounded-lg shadow-2xl"
                                style={{
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.2s ease-in-out',
                                    marginBottom: '50px' // Add some space at the bottom when scrolling
                                }}
                            >
                                <InvoiceTemplate invoice={invoice} template={selectedTemplate} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Save Button with Dropdown */}
            <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                <button
                    onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    Cancel
                </button>
                <div className="relative" ref={dropdownRef}>
                    <div className="flex items-center gap-0">
                        <button
                            onClick={() => handleSave('Sent')}
                            disabled={isSaving || !invoice.to.name}
                            className="px-8 py-2.5 bg-gray-900 dark:bg-indigo-600 hover:bg-gray-800 dark:hover:bg-indigo-700 text-white font-semibold rounded-l-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving && (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isSaving ? 'Saving...' : 'Save & Send'}
                        </button>
                        <button
                            onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                            disabled={isSaving || !invoice.to.name}
                            className="px-3 py-2.5 bg-gray-900 dark:bg-indigo-600 hover:bg-gray-800 dark:hover:bg-indigo-700 text-white font-semibold rounded-r-lg border-l border-gray-700 dark:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronDownIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {showSaveDropdown && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                            <button
                                onClick={() => handleSave('Draft')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Save as Draft
                            </button>
                            <button
                                onClick={() => handleSave('Sent')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Save & Send
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceScreenModern;
