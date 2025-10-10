import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Client } from '../types';
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from './Icons';

const StatusBadge: React.FC<{ status: Client['status'] }> = ({ status }) => {
    const { t } = useTranslation();
    const statusClasses = {
        'Active': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Inactive': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status]}`}>{status}</span>;
};

interface ClientsTableProps {
    clients: Client[];
    showViewAllButton?: boolean;
    onViewAll?: () => void;
    onEdit?: (client: Client) => void;
    onToggleStatus?: (client: Client) => void;
    onDelete?: (client: Client) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({ clients, showViewAllButton = true, onViewAll, onEdit, onToggleStatus, onDelete }) => {
    const { t } = useTranslation();
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

    const handleMenuClick = (clientId: string) => {
        setOpenMenuId(openMenuId === clientId ? null : clientId);
    };
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('clients.tableTitle')}</h3>
                {showViewAllButton && (
                    <button onClick={onViewAll} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">View All</button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b text-gray-500 dark:border-slate-700 dark:text-gray-400">
                        <tr>
                            <th className="py-3 px-4 font-medium">{t('clients.headerCompany')}</th>
                            <th className="py-3 px-4 font-medium">{t('clients.headerContact')}</th>
                            <th className="py-3 px-4 font-medium">{t('clients.headerEmail')}</th>
                            <th className="py-3 px-4 font-medium">{t('common.status')}</th>
                            <th className="py-3 px-4 font-medium">{t('clients.headerActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 px-4 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <p className="text-lg font-medium mb-1">No clients yet</p>
                                        <p className="text-sm">Add your first client to get started</p>
                                    </div>
                                </td>
                            </tr>
                        ) : clients.map((client) => (
                            <tr key={client.id} className="border-b hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                                <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">{client.name}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{client.contactPerson}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{client.email}</td>
                                <td className="py-3 px-4"><StatusBadge status={client.status} /></td>
                                <td className="py-3 px-4">
                                     <div className="relative">
                                        <button onClick={() => handleMenuClick(client.id)} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                                            <EllipsisHorizontalIcon className="w-5 h-5"/>
                                        </button>
                                        {openMenuId === client.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl z-10 border dark:border-slate-700">
                                                <button onClick={() => { onEdit?.(client); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <PencilIcon className="w-4 h-4 text-gray-500"/> {t('clients.edit')}
                                                </button>
                                                <button onClick={() => { onToggleStatus?.(client); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    {client.status === 'Active' ? <XCircleIcon className="w-4 h-4 text-gray-500"/> : <CheckCircleIcon className="w-4 h-4 text-gray-500"/>}
                                                    {client.status === 'Active' ? t('clients.markInactive') : t('clients.markActive')}
                                                </button>
                                                <div className="border-t my-1 dark:border-slate-700"></div>
                                                <button onClick={() => { onDelete?.(client); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <TrashIcon className="w-4 h-4"/> {t('clients.delete')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientsTable;