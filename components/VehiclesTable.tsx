import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Vehicle } from '../types';
import { EllipsisHorizontalIcon, EyeIcon, PencilIcon } from './Icons';

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
}

const VehiclesTable: React.FC<VehiclesTableProps> = ({ 
    vehicles, 
    showViewAllButton = true, 
    onViewAll,
    onViewDetails,
    onUpdateStatus
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
                            <th className="py-3 px-4 font-medium">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map((vehicle) => (
                            <tr key={vehicle.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="py-3 px-4">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{vehicle.make} {vehicle.model}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('screens.vehicleDetails.vin')}: {vehicle.vin}</p>
                                </td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-mono">{vehicle.plateNumber}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{vehicle.odometer.toLocaleString()} km</td>
                                <td className="py-3 px-4"><StatusBadge status={vehicle.status} /></td>
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