import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Route } from '../types';
import { EllipsisHorizontalIcon, ArrowDownTrayIcon, UserPlusIcon, ClipboardDocumentCheckIcon, CheckCircleIcon, PencilIcon, TrashIcon } from './Icons';

type RouteStatusFilter = 'All' | 'Pending' | 'In Progress' | 'Completed';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const { t } = useTranslation();
    const statusKey = status.replace(' ', '').toLowerCase();

    const baseClasses = "text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap";
    const statusClasses: { [key: string]: string } = {
        'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Pending': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`${baseClasses} ${statusClasses[status] || 'bg-gray-100'}`}>{t(`components.routeAssignmentTable.${statusKey}`)}</span>;
};

interface RouteAssignmentTableProps {
    routes: Route[];
    onAssign: (route: Route) => void;
    onViewDetails: (route: Route) => void;
    onComplete: (route: Route) => void;
    onFilterChange: (status: RouteStatusFilter) => void;
    activeFilter: RouteStatusFilter;
    selectedRoutes: string[];
    onSelectRoute: (routeId: string) => void;
    onSelectAllCompleted: () => void;
    invoicedRouteIds: Set<string>;
    onEdit?: (route: Route) => void;
    onDelete?: (route: Route) => void;
    onViewAll?: () => void;
}

const FilterButton: React.FC<{
    label: RouteStatusFilter;
    activeFilter: RouteStatusFilter;
    onClick: (status: RouteStatusFilter) => void;
}> = ({ label, activeFilter, onClick }) => {
    const { t } = useTranslation();
    const labelKey = label.replace(' ', '').toLowerCase();

    return (
        <button
            onClick={() => onClick(label)}
            className={`px-2 md:px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                activeFilter === label
                ? 'bg-indigo-500 text-white'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
            }`}
        >
            {t(`components.routeAssignmentTable.${labelKey}`)}
        </button>
    );
};


const RouteAssignmentTable: React.FC<RouteAssignmentTableProps> = ({ routes, onAssign, onViewDetails, onComplete, onFilterChange, activeFilter, selectedRoutes, onSelectRoute, onSelectAllCompleted, invoicedRouteIds, onEdit, onDelete, onViewAll }) => {
    const { t } = useTranslation();
    const hasSelectableCompletedRoutes = routes.some(r => r.status === 'Completed' && !invoicedRouteIds.has(r.id));
    const allCompletedSelected = hasSelectableCompletedRoutes && routes.filter(r => r.status === 'Completed' && !invoicedRouteIds.has(r.id)).every(r => selectedRoutes.includes(r.id));

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleDownloadCSV = () => {
        // Create CSV content
        const headers = ['Route ID', 'Origin', 'Destination', 'Driver', 'Vehicle', 'Stops', 'Distance (km)', 'Rate (₦)', 'Progress (%)', 'Status', 'Client'];
        const csvRows = [headers.join(',')];

        routes.forEach(route => {
            const row = [
                route.id,
                route.origin || 'N/A',
                route.destination || 'N/A',
                route.driverName || 'Unassigned',
                route.vehicle || route.assignedVehiclePlate || 'Unassigned',
                route.stops || 0,
                route.distance || route.distanceKm || 0,
                route.rate || 0,
                route.progress || 0,
                route.status,
                route.clientName || 'N/A'
            ];
            csvRows.push(row.map(cell => `"${cell}"`).join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `routes_${activeFilter.toLowerCase().replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex items-center justify-between w-full sm:w-auto">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('components.routeAssignmentTable.title')}</h3>
                    {onViewAll && (
                        <button onClick={onViewAll} className="sm:hidden text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">View All</button>
                    )}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-hide">
                    <FilterButton label="All" activeFilter={activeFilter} onClick={onFilterChange} />
                    <FilterButton label="In Progress" activeFilter={activeFilter} onClick={onFilterChange} />
                    <FilterButton label="Completed" activeFilter={activeFilter} onClick={onFilterChange} />
                    <FilterButton label="Pending" activeFilter={activeFilter} onClick={onFilterChange} />
                    {!onViewAll && (
                        <button
                            onClick={handleDownloadCSV}
                            disabled={routes.length === 0}
                            className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download routes as CSV"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5"/>
                        </button>
                    )}
                    {onViewAll && (
                        <button onClick={onViewAll} className="hidden sm:block text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex-shrink-0">View All</button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
                        <tr>
                            {!onViewAll && (
                                <th className="py-3 px-2 font-medium">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 disabled:opacity-50"
                                        disabled={!hasSelectableCompletedRoutes}
                                        checked={allCompletedSelected}
                                        onChange={onSelectAllCompleted}
                                        aria-label="Select all completed routes"
                                    />
                                </th>
                            )}
                            <th className="py-3 px-4 font-medium">{t('components.routeAssignmentTable.headerId')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.routeAssignmentTable.headerDriver')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.routeAssignmentTable.headerVehicle')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.routeAssignmentTable.headerStops')}</th>
                            <th className="py-3 px-4 font-medium">{t('components.routeAssignmentTable.headerProgress')}</th>
                            <th className="py-3 px-4 font-medium">{t('common.status')}</th>
                            <th className="py-3 px-4 font-medium">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {routes.length === 0 ? (
                            <tr>
                                <td colSpan={onViewAll ? 7 : 8} className="py-12 px-4 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        <p className="text-lg font-medium mb-1">No routes yet</p>
                                        <p className="text-sm">Create your first route to get started</p>
                                    </div>
                                </td>
                            </tr>
                        ) : routes.map((route) => {
                            const isInvoiced = invoicedRouteIds.has(route.id);
                            return (
                                <tr key={route.id} className={`border-b hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50 transition-colors ${selectedRoutes.includes(route.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''} ${isInvoiced ? 'opacity-60' : ''}`}>
                                    {!onViewAll && (
                                        <td className="py-4 px-2">
                                            <div className="relative group flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={route.status !== 'Completed' || isInvoiced}
                                                    checked={selectedRoutes.includes(route.id)}
                                                    onChange={() => onSelectRoute(route.id)}
                                                    aria-label={`Select route ${route.id}`}
                                                />
                                                {isInvoiced && (
                                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                                        {t('components.routeAssignmentTable.invoicedTooltip')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td className="py-4 px-4 font-mono text-sm dark:text-gray-300">{route.id}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            {route.driverAvatar ? (
                                                <img src={route.driverAvatar} alt={route.driverName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                            <p className="font-medium text-gray-800 dark:text-gray-100 text-xs truncate">{route.driverName}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">{route.vehicle}</td>
                                    <td className="py-4 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">{route.stops}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-slate-700">
                                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${route.progress}%` }}></div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-10 text-right">{route.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4"><StatusBadge status={route.status} /></td>
                                    <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                {route.status === 'Pending' && (
                                                    <button
                                                        onClick={() => onAssign(route)}
                                                        className="flex items-center gap-1.5 text-sm bg-orange-100 text-orange-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:hover:bg-orange-900"
                                                    >
                                                        <UserPlusIcon className="w-4 h-4" />
                                                        {t('components.routeAssignmentTable.assign')}
                                                    </button>
                                                )}
                                                {route.status === 'In Progress' && (
                                                    <>
                                                        <button onClick={() => onComplete(route)} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 border px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
                                                            <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                                            {t('components.routeAssignmentTable.complete')}
                                                        </button>
                                                        <button onClick={() => onViewDetails(route)} className="text-sm font-medium text-gray-600 border px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">{t('common.details')}</button>
                                                    </>
                                                )}
                                                {route.status === 'Completed' && (
                                                    <button onClick={() => onViewDetails(route)} className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-100 border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 dark:border-green-800">
                                                        <ClipboardDocumentCheckIcon className="w-4 h-4" />
                                                        {t('components.routeAssignmentTable.viewpod')}
                                                    </button>
                                                )}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === route.id ? null : route.id)}
                                                        className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-slate-700"
                                                    >
                                                        <EllipsisHorizontalIcon className="w-5 h-5"/>
                                                    </button>
                                                    {openMenuId === route.id && (
                                                        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl z-10 border dark:border-slate-700">
                                                            {onEdit && (
                                                                <button
                                                                    onClick={() => { onEdit(route); setOpenMenuId(null); }}
                                                                    disabled={route.status !== 'Pending'}
                                                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                                    title={route.status !== 'Pending' ? 'Cannot edit assigned or completed routes' : ''}
                                                                >
                                                                    <PencilIcon className="w-4 h-4 text-gray-500"/> {t('common.edit')}
                                                                </button>
                                                            )}
                                                            {onDelete && (
                                                                <>
                                                                    <div className="border-t my-1 dark:border-slate-700"></div>
                                                                    <button
                                                                        onClick={() => { onDelete(route); setOpenMenuId(null); }}
                                                                        disabled={route.status !== 'Pending'}
                                                                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                                        title={route.status !== 'Pending' ? 'Cannot delete assigned or completed routes' : ''}
                                                                    >
                                                                        <TrashIcon className="w-4 h-4"/> {t('common.delete')}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RouteAssignmentTable;