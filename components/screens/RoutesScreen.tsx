import React from 'react';
import RouteAssignmentTable from '../RouteAssignmentTable';
import { MapPinIcon, DocumentPlusIcon } from '../Icons';
import type { Route } from '../../types';

type RouteStatusFilter = 'All' | 'Pending' | 'In Progress' | 'Completed';

interface RoutesScreenProps {
    setActiveModal: (modal: 'createRoute') => void;
    routes: Route[];
    onAssign: (route: Route) => void;
    onViewDetails: (route: Route) => void;
    onComplete: (route: Route) => void;
    onFilterChange: (status: RouteStatusFilter) => void;
    activeFilter: RouteStatusFilter;
    selectedRoutes: string[];
    onSelectRoute: (routeId: string) => void;
    onSelectAllCompleted: () => void;
    onCreateInvoiceFromSelection: () => void;
    invoicedRouteIds: Set<string>;
    onEdit?: (route: Route) => void;
    onDelete?: (route: Route) => void;
}

const RoutesScreen: React.FC<RoutesScreenProps> = ({
    setActiveModal, routes, onAssign, onViewDetails, onComplete, onFilterChange, activeFilter,
    selectedRoutes, onSelectRoute, onSelectAllCompleted, onCreateInvoiceFromSelection, invoicedRouteIds,
    onEdit, onDelete
}) => {
    console.log('[ROUTES SCREEN] Rendering with routes:', routes);
    console.log('[ROUTES SCREEN] Routes count:', routes?.length || 0);
    console.log('[ROUTES SCREEN] Active filter:', activeFilter);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">All Routes</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all active, pending, and completed routes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onCreateInvoiceFromSelection} 
                        disabled={selectedRoutes.length === 0}
                        className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <DocumentPlusIcon className="w-5 h-5"/> Create Invoice from Selection ({selectedRoutes.length})
                    </button>
                    <button onClick={() => setActiveModal('createRoute')} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                        <MapPinIcon className="w-5 h-5"/> Create New Route
                    </button>
                </div>
            </div>
            <RouteAssignmentTable
                routes={routes}
                onAssign={onAssign}
                onViewDetails={onViewDetails}
                onComplete={onComplete}
                onFilterChange={onFilterChange}
                activeFilter={activeFilter}
                selectedRoutes={selectedRoutes}
                onSelectRoute={onSelectRoute}
                onSelectAllCompleted={onSelectAllCompleted}
                invoicedRouteIds={invoicedRouteIds}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
};

export default RoutesScreen;