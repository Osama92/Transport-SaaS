import React, { useState } from 'react';
import ModalBase from './ModalBase';
import type { Invoice } from '../../types';

interface EmailInvoiceModalProps {
    onClose: () => void;
    invoice: Invoice;
    onSend: (recipient: string, subject: string, body: string) => void;
}

const InputField: React.FC<{ label: string, id: string, type?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = 
    ({ label, id, type = 'text', value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const EmailInvoiceModal: React.FC<EmailInvoiceModalProps> = ({ onClose, invoice, onSend }) => {
    const defaultSubject = invoice ? `Invoice #${invoice.id} from ${invoice.from.name}` : 'Invoice';
    const defaultBody = invoice ? `Dear ${invoice.to.name},\n\nPlease find attached the invoice for your recent services.\n\nBest regards,\n${invoice.from.name}` : '';

    const [recipient, setRecipient] = useState(invoice?.to?.email || '');
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend(recipient, subject, body);
    };

    return (
        <ModalBase title="Email Invoice" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will open your default email client. Remember to download and attach the PDF before sending.
                </p>
                <InputField 
                    label="Recipient Email" 
                    id="recipient" 
                    type="email" 
                    value={recipient} 
                    onChange={(e) => setRecipient(e.target.value)} 
                />
                <InputField 
                    label="Subject" 
                    id="subject" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                />
                <div>
                    <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
                    <textarea 
                        id="body" 
                        name="body" 
                        rows={6}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    ></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Cancel</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg">Prepare Email</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default EmailInvoiceModal;