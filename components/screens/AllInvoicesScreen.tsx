import React, { useState, useRef, useEffect } from 'react';
import type { Invoice } from '../../types';
import { 
    DocumentPlusIcon, 
    EllipsisHorizontalIcon,
    PencilIcon,
    ArrowDownTrayIcon,
    CheckCircleIcon,
    TrashIcon,
} from '../Icons';

interface AllInvoicesScreenProps {
    invoices: Invoice[];
    onCreateNew: () => void;
    onEdit: (invoice: Invoice) => void;
    onDownloadPdf: (invoice: Invoice) => void;
    onMarkAsPaid: (invoiceId: string) => void;
    onDelete: (invoiceId: string) => void;
}

const StatusBadge: React.FC<{ status: Invoice['status'] }> = ({ status }) => {
    const statusClasses = {
        'Paid': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Sent': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        'Draft': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    const dotClasses = {
        'Paid': 'bg-green-500',
        'Sent': 'bg-blue-500',
        'Draft': 'bg-gray-500',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status]}`}>
            <span className={`w-2 h-2 rounded-full ${dotClasses[status]}`}></span>
            {status}
        </span>
    );
};

const AllInvoicesScreen: React.FC<AllInvoicesScreenProps> = ({ invoices, onCreateNew, onEdit, onDownloadPdf, onMarkAsPaid, onDelete }) => {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuClick = (invoiceId: string) => {
        setOpenMenuId(openMenuId === invoiceId ? null : invoiceId);
    };
    
    const calculateTotal = (items: Invoice['items']) => {
        return items.reduce((sum, item) => sum + item.units * item.price, 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Invoices</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage all your client invoices.</p>
                </div>
                <button onClick={onCreateNew} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <DocumentPlusIcon className="w-5 h-5"/> Create New Invoice
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b text-gray-500 dark:border-slate-700 dark:text-gray-400">
                            <tr>
                                <th className="py-3 px-4 font-medium">Invoice ID</th>
                                <th className="py-3 px-4 font-medium">Client</th>
                                <th className="py-3 px-4 font-medium">Due Date</th>
                                <th className="py-3 px-4 font-medium">Total</th>
                                <th className="py-3 px-4 font-medium">Status</th>
                                <th className="py-3 px-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="py-4 px-4 font-mono dark:text-gray-300">#{invoice.invoiceNumber || invoice.id}</td>
                                    <td className="py-4 px-4">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{invoice.to.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.to.email}</p>
                                    </td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{invoice.dueDate}</td>
                                    <td className="py-4 px-4 font-semibold text-gray-800 dark:text-gray-100">
                                        {formatCurrency(calculateTotal(invoice.items))}
                                    </td>
                                    <td className="py-4 px-4"><StatusBadge status={invoice.status} /></td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="relative inline-block text-left">
                                            <button onClick={() => handleMenuClick(invoice.id)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                                                <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500"/>
                                            </button>
                                            {openMenuId === invoice.id && (
                                                <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl z-10 border dark:border-slate-700">
                                                    <div className="py-1">
                                                        <button onClick={() => { onEdit(invoice); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                            <PencilIcon className="w-4 h-4 text-gray-500"/> {invoice.status === 'Paid' ? 'View' : 'View / Edit'}
                                                        </button>
                                                        <button onClick={() => { onDownloadPdf(invoice); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                            <ArrowDownTrayIcon className="w-4 h-4 text-gray-500"/> Download PDF
                                                        </button>
                                                        {invoice.status !== 'Paid' && (
                                                            <button onClick={() => { onMarkAsPaid(invoice.id); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                                <CheckCircleIcon className="w-4 h-4 text-green-500"/> Mark as Paid
                                                            </button>
                                                        )}
                                                        <div className="border-t my-1 dark:border-slate-700"></div>
                                                        <button onClick={() => { onDelete(invoice.id); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                            <TrashIcon className="w-4 h-4"/> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {invoices.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <h3 className="text-lg font-semibold">No invoices yet</h3>
                            <p className="mt-1">Click "Create New Invoice" to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AllInvoicesScreen;