import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Driver } from '../types';
import { EllipsisHorizontalIcon, CurrencyDollarIcon, EyeIcon, TrashIcon, PencilIcon, WalletIcon } from './Icons';

const StatusBadge: React.FC<{ status: Driver['status'] }> = ({ status }) => {
    const { t } = useTranslation();
    const statusKey = status.replace('-', '').toLowerCase();

    const statusClasses = {
        'On-route': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Idle': 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
        'Offline': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    const dotClasses = {
        'On-route': 'bg-green-500',
        'Idle': 'bg-orange-500',
        'Offline': 'bg-gray-500',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status]}`}>
            <span className={`w-2 h-2 rounded-full ${dotClasses[status]}`}></span>
            {t(`components.driversTable.${statusKey}`, status)}
        </span>
    );
};

interface DriversTableProps {
    drivers: Driver[];
    showViewAllButton?: boolean;
    onViewAll?: () => void;
    onSendFunds?: (driver: Driver) => void;
    onManageWallet?: (driver: Driver) => void;
    onViewDetails?: (driver: Driver) => void;
    onRemove?: (driver: Driver) => void;
    onEditPay?: (driver: Driver) => void;
    onEditDriver?: (driver: Driver) => void;
}

const DriversTable: React.FC<DriversTableProps> = ({
    drivers,
    showViewAllButton = true,
    onViewAll,
    onSendFunds,
    onManageWallet,
    onViewDetails,
    onRemove,
    onEditPay,
    onEditDriver
}) => {
    const { t } = useTranslation();
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
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

    const handleMenuClick = (driverId: number) => {
        setOpenMenuId(openMenuId === driverId ? null : driverId);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('components.driversTable.title')}</h3>
                {showViewAllButton && (
                    <button onClick={onViewAll} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">{t('common.viewAll')}</button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b text-gray-500 dark:text-gray-400 dark:border-slate-700">
                            <th className="py-3 px-4 font-medium">{t('common.name')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.driversTable.contact')}</th>
                            <th className="py-3 px-4 font-medium">{t('common.status')}</th>
                            <th className="py-3 px-4 font-medium">Current Route</th>
                            <th className="py-3 px-4 font-medium">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {drivers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 px-4 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <p className="text-lg font-medium mb-1">No drivers yet</p>
                                        <p className="text-sm">Add your first driver to get started</p>
                                    </div>
                                </td>
                            </tr>
                        ) : drivers.map((driver) => (
                            <tr key={driver.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                        {driver.avatar ? (
                                            <img src={driver.avatar} alt={driver.name} className="w-9 h-9 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                                <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
                                                    {driver.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-100">{driver.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.license')}: {driver.licenseNumber}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{driver.phone}</td>
                                <td className="py-3 px-4"><StatusBadge status={driver.status} /></td>
                                <td className="py-3 px-4">
                                    {driver.currentRouteId ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-1 rounded dark:bg-indigo-900/50 dark:text-indigo-300">
                                                {driver.currentRouteId}
                                            </span>
                                            {driver.currentRouteStatus && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    ({driver.currentRouteStatus})
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <div className="relative">
                                        <button onClick={() => handleMenuClick(driver.id)} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                                            <EllipsisHorizontalIcon className="w-5 h-5"/>
                                        </button>
                                        {openMenuId === driver.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl z-10 border dark:border-slate-700">
                                                <button onClick={() => { onManageWallet?.(driver); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <WalletIcon className="w-5 h-5 text-green-500"/> Manage Wallet
                                                </button>
                                                <button onClick={() => { onSendFunds?.(driver); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <CurrencyDollarIcon className="w-5 h-5 text-gray-500"/> {t('components.driversTable.sendFunds')}
                                                </button>
                                                <button onClick={() => { onEditDriver?.(driver); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <PencilIcon className="w-5 h-5 text-gray-500"/> Edit Driver Details
                                                </button>
                                                <button onClick={() => { onEditPay?.(driver); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <PencilIcon className="w-5 h-5 text-gray-500"/> {t('screens.payroll.editPay')}
                                                </button>
                                                <button onClick={() => { onViewDetails?.(driver); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <EyeIcon className="w-5 h-5 text-gray-500"/> {t('components.driversTable.viewDetails')}
                                                </button>
                                                <button onClick={() => { onRemove?.(driver); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <TrashIcon className="w-5 h-5"/> {t('components.driversTable.removeDriver')}
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

export default DriversTable;