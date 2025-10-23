import React from 'react';
import type { Invoice, Client } from '../../types';
import Accordion from './Accordion';
import { PlusIcon, TrashIcon } from '../Icons';

interface InvoiceFormProps {
    invoice: Invoice;
    setInvoice: React.Dispatch<React.SetStateAction<Invoice>>;
    readOnly: boolean;
    clients: Client[];
}

const InputField: React.FC<{ label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, disabled?: boolean }> = ({ label, name, value, onChange, placeholder, disabled = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type="text" name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className="w-full px-3 py-2 text-sm rounded-md bg-gray-100 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 disabled:opacity-70 dark:disabled:opacity-50" />
    </div>
);

const FileInputField: React.FC<{ label: string; previewUrl?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, previewUrl, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <div className="flex items-center gap-4">
            {previewUrl && <img src={previewUrl} alt="Preview" className="w-12 h-12 object-contain rounded-md bg-gray-100 dark:bg-slate-700" />}
            <input 
                type="file" 
                accept="image/png, image/jpeg"
                onChange={onChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900 disabled:opacity-50"
            />
        </div>
    </div>
);


const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, setInvoice, readOnly, clients }) => {

    const handleDetailsChange = (section: 'from' | 'to' | 'paymentDetails', e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInvoice(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: value
            }
        }));
    };

    const handleFileChange = (file: File | null, callback: (dataUrl: string) => void) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                callback(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileChange(e.target.files?.[0] || null, (logoUrl) => {
            setInvoice(prev => ({ ...prev, from: { ...prev.from, logoUrl } }));
        });
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileChange(e.target.files?.[0] || null, (signatureUrl) => {
            setInvoice(prev => ({ ...prev, signatureUrl }));
        });
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...invoice.items];
        (newItems[index] as any)[field] = value;
        setInvoice(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setInvoice(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), description: '', units: 1, price: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        const newItems = invoice.items.filter((_, i) => i !== index);
        setInvoice(prev => ({ ...prev, items: newItems }));
    };

    const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clientId = e.target.value;
        const client = clients.find(c => c.id === clientId);

        if (client) {
            setInvoice(prev => ({
                ...prev,
                to: {
                    ...prev.to,
                    name: client.name,
                    address: client.address,
                    email: client.email,
                    phone: client.phone,
                }
            }));
        } else {
            // Reset if "Select a client" is chosen
            setInvoice(prev => ({
                ...prev,
                to: {
                    ...prev.to,
                    name: '',
                    address: '',
                    email: '',
                    phone: '',
                }
            }));
        }
    };
    
    return (
        <fieldset disabled={readOnly}>
            <div className="space-y-4">
                <Accordion title="My Details" defaultOpen>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Name" name="name" value={invoice.from.name} onChange={(e) => handleDetailsChange('from', e)} />
                            <InputField label="Email" name="email" value={invoice.from.email} onChange={(e) => handleDetailsChange('from', e)} />
                            <InputField label="Address" name="address" value={invoice.from.address} onChange={(e) => handleDetailsChange('from', e)} />
                            <InputField label="Phone" name="phone" value={invoice.from.phone} onChange={(e) => handleDetailsChange('from', e)} />
                        </div>
                        <FileInputField label="Company Logo" onChange={handleLogoChange} previewUrl={invoice.from.logoUrl} />
                    </div>
                </Accordion>
                <Accordion title="Client Details">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Client</label>
                            <select
                                id="client-select"
                                onChange={handleClientSelect}
                                value={clients.find(c => c.name === invoice.to.name && c.email === invoice.to.email)?.id || ''}
                                className="w-full px-3 py-2 text-sm rounded-md bg-gray-100 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 disabled:opacity-70 dark:disabled:opacity-50"
                            >
                                <option value="">Select a client...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Name" name="name" value={invoice.to.name} onChange={() => {}} disabled />
                            <InputField label="Email" name="email" value={invoice.to.email} onChange={() => {}} disabled />
                            <InputField label="Address" name="address" value={invoice.to.address || ''} onChange={() => {}} disabled />
                            <InputField label="Phone" name="phone" value={invoice.to.phone} onChange={() => {}} disabled />
                        </div>
                    </div>
                </Accordion>
                <Accordion title="Invoice Details" defaultOpen>
                    <div className="space-y-4">
                        {invoice.items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-6">
                                    <label className="block text-xs font-medium text-gray-500">Description</label>
                                    <input type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="w-full text-sm p-2 rounded-md bg-gray-100 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 disabled:opacity-70 dark:disabled:opacity-50" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500">Units</label>
                                    <input type="number" value={item.units} onChange={(e) => handleItemChange(index, 'units', Number(e.target.value))} className="w-full text-sm p-2 rounded-md bg-gray-100 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 disabled:opacity-70 dark:disabled:opacity-50" />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-medium text-gray-500">Price</label>
                                    <input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))} className="w-full text-sm p-2 rounded-md bg-gray-100 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 disabled:opacity-70 dark:disabled:opacity-50" />
                                </div>
                                <div className="col-span-1 pt-5">
                                    {!readOnly && (
                                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-full dark:hover:bg-red-900/50">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!readOnly && (
                            <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                                <PlusIcon className="w-4 h-4" /> Add Item
                            </button>
                        )}
                    </div>
                </Accordion>
                <Accordion title="Payment Details">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Payment Method" name="method" value={invoice.paymentDetails.method} onChange={(e) => handleDetailsChange('paymentDetails', e)} />
                        <InputField label="Account Name" name="accountName" value={invoice.paymentDetails.accountName} onChange={(e) => handleDetailsChange('paymentDetails', e)} />
                        <InputField label="Account Number" name="accountNumber" value={invoice.paymentDetails.accountNumber} onChange={(e) => handleDetailsChange('paymentDetails', e)} />
                        <InputField label="Bank Code" name="code" value={invoice.paymentDetails.code || ''} onChange={(e) => handleDetailsChange('paymentDetails', e)} />
                    </div>
                </Accordion>
                 <Accordion title="Add Signature">
                    <FileInputField label="Signature Image" onChange={handleSignatureChange} previewUrl={invoice.signatureUrl} />
                </Accordion>
                <Accordion title="Add Notes">
                    <textarea 
                        value={invoice.notes} 
                        onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                        rows={4} 
                        className="w-full text-sm p-2 rounded-md bg-gray-100 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 disabled:opacity-70 dark:disabled:opacity-50"
                        placeholder="Add notes, terms, or conditions..."
                    />
                </Accordion>
            </div>
        </fieldset>
    );
};

export default InvoiceForm;