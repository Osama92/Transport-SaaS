import React, { useState } from 'react';
import VehiclesTable from '../VehiclesTable';
import VehicleDetailsScreen from './VehicleDetailsScreen';
import VehicleAnalytics from '../analytics/VehicleAnalytics';
import { TruckIcon, ChartPieIcon, MapIcon } from '../Icons';
import type { Vehicle } from '../../types';
import FleetTrackingScreen from './FleetTrackingScreen';
import { updateVehicle } from '../../services/firestore/vehicles';

interface VehiclesScreenProps {
    vehicles: Vehicle[];
    onVehicleUpdate: (updatedVehicle: Vehicle) => void;
    setActiveModal: (modal: 'addVehicle' | 'updateVehicleStatus' | 'addMaintenanceLog' | 'uploadDocument', vehicle?: Vehicle) => void;
    dateRange: { start: Date; end: Date };
    onRemove?: (vehicle: Vehicle) => void;
}

const VehiclesScreen: React.FC<VehiclesScreenProps> = ({ vehicles, onVehicleUpdate, setActiveModal, dateRange, onRemove }) => {
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'analytics' | 'track'>('all');

    const handleViewDetails = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
    };

    const handleUpdateStatus = (vehicle: Vehicle) => {
        setActiveModal('updateVehicleStatus', vehicle);
    };

    const handleResetVehicleStatus = async (vehicle: Vehicle) => {
        if (confirm(`Reset status for ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})?\n\nThis will:\n• Set status to "Parked"\n• Clear current route assignment\n\nThis is useful if a vehicle is stuck in "On the Move" status.`)) {
            try {
                await updateVehicle(vehicle.id, {
                    status: 'Parked',
                    currentRouteId: undefined,
                    currentRouteStatus: undefined
                });
                alert('Vehicle status reset successfully!');
            } catch (error) {
                console.error('Error resetting vehicle status:', error);
                alert('Failed to reset vehicle status. Please try again.');
            }
        }
    };

    if (selectedVehicle) {
        return (
            <VehicleDetailsScreen 
                vehicle={selectedVehicle}
                onBack={() => setSelectedVehicle(null)}
                onUpdateStatus={() => setActiveModal('updateVehicleStatus', selectedVehicle)}
                onAddLog={() => setActiveModal('addMaintenanceLog', selectedVehicle)}
                onAddDocument={() => setActiveModal('uploadDocument', selectedVehicle)}
            />
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Fleet Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage, analyze, and view details for all vehicles in your fleet.</p>
                </div>
                <button onClick={() => setActiveModal('addVehicle')} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <TruckIcon className="w-5 h-5"/> Add New Vehicle
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
                <nav className="-mb-px flex space-x-4 md:space-x-8 min-w-min" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-1 md:gap-2 whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors flex-shrink-0 ${
                            activeTab === 'all'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <TruckIcon className="w-4 h-4 md:w-5 md:h-5" />
                        <span>All Vehicles</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex items-center gap-1 md:gap-2 whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors flex-shrink-0 ${
                            activeTab === 'analytics'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <ChartPieIcon className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Analytics</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('track')}
                        className={`flex items-center gap-1 md:gap-2 whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors flex-shrink-0 ${
                            activeTab === 'track'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <MapIcon className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Track Vehicle</span>
                    </button>
                </nav>
            </div>
            
            {/* Tab Content */}
            <div>
                {activeTab === 'all' && (
                    <VehiclesTable
                        vehicles={vehicles}
                        showViewAllButton={false}
                        onViewDetails={handleViewDetails}
                        onUpdateStatus={handleUpdateStatus}
                        onRemove={onRemove}
                        onResetStatus={handleResetVehicleStatus}
                    />
                )}
                {activeTab === 'analytics' && (
                    <VehicleAnalytics vehicles={vehicles} dateRange={dateRange} />
                )}
                {activeTab === 'track' && (
                   <FleetTrackingScreen vehicles={vehicles} />
                )}
            </div>
        </div>
    );
};

export default VehiclesScreen;