import React, { useState } from 'react';
import VehiclesTable from '../VehiclesTable';
import VehicleDetailsScreen from './VehicleDetailsScreen';
import VehicleAnalytics from '../analytics/VehicleAnalytics';
import { TruckIcon, ChartPieIcon, MapIcon } from '../Icons';
import type { Vehicle } from '../../types';
import FleetTrackingScreen from './FleetTrackingScreen';

interface VehiclesScreenProps {
    vehicles: Vehicle[];
    onVehicleUpdate: (updatedVehicle: Vehicle) => void;
    setActiveModal: (modal: 'addVehicle' | 'updateVehicleStatus' | 'addMaintenanceLog' | 'uploadDocument', vehicle?: Vehicle) => void;
    dateRange: { start: Date; end: Date };
}

const VehiclesScreen: React.FC<VehiclesScreenProps> = ({ vehicles, onVehicleUpdate, setActiveModal, dateRange }) => {
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'analytics' | 'track'>('all');

    const handleViewDetails = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
    };

    const handleUpdateStatus = (vehicle: Vehicle) => {
        setActiveModal('updateVehicleStatus', vehicle);
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
            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'all'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <TruckIcon className="w-5 h-5" />
                        All Vehicles
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'analytics'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <ChartPieIcon className="w-5 h-5" />
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('track')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'track'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <MapIcon className="w-5 h-5" />
                        Track Vehicle
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