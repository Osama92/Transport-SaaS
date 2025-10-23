import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Vehicle } from '../types';
import { EllipsisHorizontalIcon, EyeIcon, PencilIcon, TrashIcon } from './Icons';

const StatusBadge: React.FC<{ status: Vehicle['status'] }> = ({ status }) => {
    const { t } = useTranslation();
    const statusKey = status.replace('-', '').toLowerCase();

    const statusClasses = {
        'Active': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'In-Shop': 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
        'Inactive': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status]}`}>{t(`components.vehiclesTable.${statusKey}`, status)}</span>;
};

interface VehiclesTableProps {
    vehicles: Vehicle[];
    showViewAllButton?: boolean;
    onViewAll?: () => void;
    onViewDetails: (vehicle: Vehicle) => void;
    onUpdateStatus: (vehicle: Vehicle) => void;
    onRemove?: (vehicle: Vehicle) => void;
    onResetStatus?: (vehicle: Vehicle) => void;
}

const VehiclesTable: React.FC<VehiclesTableProps> = ({
    vehicles,
    showViewAllButton = true,
    onViewAll,
    onViewDetails,
    onUpdateStatus,
    onRemove,
    onResetStatus
}) => {
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

    const handleMenuClick = (vehicleId: string) => {
        setOpenMenuId(openMenuId === vehicleId ? null : vehicleId);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('components.vehiclesTable.title')}</h3>
                {showViewAllButton && (
                    <button onClick={onViewAll} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">{t('common.viewAll')}</button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b text-gray-500 dark:text-gray-400 dark:border-slate-700">
                            <th className="py-3 px-4 font-medium">{t('components.vehiclesTable.headerVehicle')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.vehiclesTable.headerPlate')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.vehiclesTable.headerOdometer')}</th>
                            <th className="py-3 px-4 font-medium">{t('common.status')}</th>
                            <th className="py-3 px-4 font-medium">Current Route</th>
                            <th className="py-3 px-4 font-medium">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 px-4 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                        </svg>
                                        <p className="text-lg font-medium mb-1">No vehicles yet</p>
                                        <p className="text-sm">Add your first vehicle to get started</p>
                                    </div>
                                </td>
                            </tr>
                        ) : vehicles.map((vehicle) => (
                            <tr key={vehicle.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="py-3 px-4">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{vehicle.make} {vehicle.model}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('screens.vehicleDetails.vin')}: {vehicle.vin}</p>
                                </td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-mono">{vehicle.plateNumber}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{(vehicle.telematics?.odometer || 0).toLocaleString()} km</td>
                                <td className="py-3 px-4"><StatusBadge status={vehicle.status} /></td>
                                <td className="py-3 px-4">
                                    {vehicle.currentRouteId ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-1 rounded dark:bg-indigo-900/50 dark:text-indigo-300">
                                                {vehicle.currentRouteId}
                                            </span>
                                            {vehicle.currentRouteStatus && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    ({vehicle.currentRouteStatus})
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                   <div className="relative">
                                        <button onClick={() => handleMenuClick(vehicle.id)} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                                            <EllipsisHorizontalIcon className="w-5 h-5"/>
                                        </button>
                                        {openMenuId === vehicle.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl z-10 border dark:border-slate-700">
                                                <button onClick={() => { onViewDetails(vehicle); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <EyeIcon className="w-5 h-5 text-gray-500"/> {t('components.driversTable.viewDetails')}
                                                </button>
                                                <button onClick={() => { onUpdateStatus(vehicle); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <PencilIcon className="w-5 h-5 text-gray-500"/> {t('components.vehiclesTable.updateStatus')}
                                                </button>
                                                {onResetStatus && (vehicle.status === 'On the Move' || vehicle.currentRouteId) && (
                                                    <button onClick={() => { onResetStatus(vehicle); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Reset Status
                                                    </button>
                                                )}
                                                {onRemove && (
                                                    <button onClick={() => { onRemove(vehicle); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <TrashIcon className="w-5 h-5"/> Remove Vehicle
                                                    </button>
                                                )}
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

export default VehiclesTable;