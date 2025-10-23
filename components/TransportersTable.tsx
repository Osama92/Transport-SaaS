import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Transporter } from '../types';
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import StarRating from './StarRating';

const StatusBadge: React.FC<{ status: Transporter['status'] }> = ({ status }) => {
    const statusClasses = {
        'Active': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Inactive': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status]}`}>{status}</span>;
};

interface TransportersTableProps {
    transporters: Transporter[];
    onEdit: (transporter: Transporter) => void;
    onToggleStatus: (transporter: Transporter) => void;
    onDelete: (transporter: Transporter) => void;
}

const TransportersTable: React.FC<TransportersTableProps> = ({ transporters, onEdit, onToggleStatus, onDelete }) => {
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

    const handleMenuClick = (transporterId: string) => {
        setOpenMenuId(openMenuId === transporterId ? null : transporterId);
    };
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{t('components.transportersTable.title')}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b text-gray-500 dark:border-slate-700 dark:text-gray-400">
                        <tr>
                            <th className="py-3 px-4 font-medium">{t('components.transportersTable.name')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.transportersTable.contact')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.transportersTable.rating')}</th>
                            <th className="py-3 px-4 font-medium">{t('common.status')}</th>
                            <th className="py-3 px-4 font-medium">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transporters.map((transporter) => (
                            <tr key={transporter.id} className="border-b hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                                <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">{transporter.name}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                    <div>{transporter.contactEmail}</div>
                                    <div className="text-xs">{transporter.contactPhone}</div>
                                </td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                    <StarRating rating={transporter.rating} readOnly />
                                </td>
                                <td className="py-3 px-4"><StatusBadge status={transporter.status} /></td>
                                <td className="py-3 px-4">
                                     <div className="relative">
                                        <button onClick={() => handleMenuClick(transporter.id)} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                                            <EllipsisHorizontalIcon className="w-5 h-5"/>
                                        </button>
                                        {openMenuId === transporter.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl z-10 border dark:border-slate-700">
                                                <button onClick={() => { onEdit(transporter); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <PencilIcon className="w-4 h-4 text-gray-500"/> {t('common.edit')}
                                                </button>
                                                <button onClick={() => { onToggleStatus(transporter); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    {transporter.status === 'Active' ? <XCircleIcon className="w-4 h-4 text-gray-500"/> : <CheckCircleIcon className="w-4 h-4 text-gray-500"/>}
                                                    {transporter.status === 'Active' ? t('components.transportersTable.markInactive') : t('components.transportersTable.markActive')}
                                                </button>
                                                <div className="border-t my-1 dark:border-slate-700"></div>
                                                <button onClick={() => { onDelete(transporter); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <TrashIcon className="w-4 h-4"/> {t('common.remove')}
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

export default TransportersTable;
