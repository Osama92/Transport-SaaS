import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Shipment } from '../types';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, EllipsisHorizontalIcon, EyeIcon, TrashIcon, TruckIcon, MapPinIcon } from './Icons';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusClasses: { [key: string]: string } = {
        'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'In Transit': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        'Assigned to Transporter': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Partially Delivered': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Pending': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    const dotClasses: { [key: string]: string } = {
        'Completed': 'bg-green-500',
        'In Transit': 'bg-blue-500',
        'Assigned to Transporter': 'bg-yellow-500',
        'Partially Delivered': 'bg-yellow-500',
        'Pending': 'bg-gray-500',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-700'}`}>
            <span className={`w-2 h-2 rounded-full ${dotClasses[status] || 'bg-gray-500'}`}></span>
            {status}
        </span>
    );
};

interface ShipmentsTableProps {
    shipments: Shipment[];
    onView: (shipment: Shipment) => void;
    onDelete: (shipment: Shipment) => void;
    onAssign: (shipment: Shipment) => void;
    onTrack: (shipment: Shipment) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    statusFilters: string[];
    onStatusFilterChange: (filters: string[]) => void;
}

const ShipmentsTable: React.FC<ShipmentsTableProps> = ({ 
    shipments, 
    onView, 
    onDelete, 
    onAssign, 
    onTrack,
    searchQuery,
    onSearchChange,
    statusFilters,
    onStatusFilterChange
}) => {
    const { t } = useTranslation();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const shipmentStatuses: Shipment['status'][] = ['Pending', 'Assigned to Transporter', 'In Transit', 'Partially Delivered', 'Completed'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuClick = (shipmentId: string) => {
        setOpenMenuId(openMenuId === shipmentId ? null : shipmentId);
    };

    const handleStatusChange = (status: string) => {
        const currentIndex = statusFilters.indexOf(status);
        const newFilters = [...statusFilters];

        if (currentIndex === -1) {
            newFilters.push(status);
        } else {
            newFilters.splice(currentIndex, 1);
        }
        onStatusFilterChange(newFilters);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('dashboard.shipment_history_title')}</h3>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder={t('dashboard.shipment_history_search')} 
                            className="pl-10 pr-4 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-indigo-500" 
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                    <div className="relative" ref={filterRef}>
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 relative"
                        >
                            <AdjustmentsHorizontalIcon className="w-5 h-5"/> {t('dashboard.shipment_history_filters')}
                            {statusFilters.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white text-xs">
                                    {statusFilters.length}
                                </span>
                            )}
                        </button>
                        {isFilterOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-xl z-10 border dark:border-slate-700 p-4">
                                <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Filter by Status</h4>
                                <div className="space-y-2">
                                    {shipmentStatuses.map(status => (
                                        <label key={status} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={statusFilters.includes(status)}
                                                onChange={() => handleStatusChange(status)}
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600"
                                            />
                                            {status}
                                        </label>
                                    ))}
                                </div>
                                <div className="border-t dark:border-slate-700 mt-4 pt-2">
                                    <button 
                                        onClick={() => onStatusFilterChange([])} 
                                        className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
                        <tr>
                            <th className="py-3 px-4 font-medium">{t('dashboard.shipment_history_header_id')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.shipment_history_header_route')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.shipment_history_header_date')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.shipment_history_header_status')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.shipment_history_header_actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shipments.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                                <td className="py-4 px-4 font-mono text-sm text-gray-700 dark:text-gray-300">{item.id}</td>
                                <td className="py-4 px-4">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{`${item.stops.length} ${item.stops.length > 1 ? 'Deliveries' : 'Delivery'}`}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.stops.length > 0 ? `To: ${item.stops[0].destination}` : 'No destinations'}
                                        {item.stops.length > 1 ? ` & ${item.stops.length - 1} more` : ''}
                                    </p>
                                </td>
                                <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{item.date}</td>
                                <td className="py-4 px-4"><StatusBadge status={item.status} /></td>
                                <td className="py-4 px-4">
                                     <div className="relative">
                                        <button onClick={() => handleMenuClick(item.id)} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                                            <EllipsisHorizontalIcon className="w-5 h-5"/>
                                        </button>
                                        {openMenuId === item.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl z-10 border dark:border-slate-700">
                                                <button onClick={() => { onTrack(item); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <MapPinIcon className="w-5 h-5 text-gray-500"/> {t('dashboard.shipment_history_track_action')}
                                                </button>
                                                <button onClick={() => { onView(item); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">
                                                    <EyeIcon className="w-5 h-5 text-gray-500"/> {t('dashboard.shipment_history_view_action')}
                                                </button>
                                                <button onClick={() => { onAssign(item); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 disabled:opacity-50" disabled={item.status !== 'Pending'}>
                                                    <TruckIcon className="w-5 h-5 text-gray-500"/> {t('dashboard.shipment_history_assign_action')}
                                                </button>
                                                <div className="border-t my-1 dark:border-slate-700"></div>
                                                <button onClick={() => { onDelete(item); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <TrashIcon className="w-5 h-5"/> {t('dashboard.shipment_history_delete_action')}
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

export default ShipmentsTable;