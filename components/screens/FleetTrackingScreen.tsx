import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Vehicle } from '../../types';
import ShowTrackingModal from '../modals/ShowTrackingModal';
import {
    MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ChevronUpIcon, ClockIcon, ArrowLeftIcon,
    Cog8ToothIcon, XMarkIcon, MapPinIcon, Square2StackIcon, ArrowsPointingOutIcon, TruckIcon
} from '../Icons';

interface FleetTrackingScreenProps {
    vehicles: Vehicle[];
}

// Left sidebar item
const VehicleListItem: React.FC<{vehicle: Vehicle, onSelect: (vehicle: Vehicle) => void, isSelected: boolean}> = ({ vehicle, onSelect, isSelected }) => {
    const statusColors: { [key: string]: string } = {
        'On the Move': 'bg-green-500',
        'Parked': 'bg-yellow-500',
        'Idle': 'bg-gray-500',
        'Inactive': 'bg-red-500',
        'In-Shop': 'bg-purple-500',
    };

    return (
        <div
            onClick={() => onSelect(vehicle)}
            className={`p-3 border-l-4 cursor-pointer transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-slate-700' : 'border-transparent hover:bg-gray-100 dark:hover:bg-slate-600/50'}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <TruckIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    <div>
                        <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{vehicle.make}</p>
                         <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                            <span className={`w-2 h-2 rounded-full ${statusColors[vehicle.status] || 'bg-red-500'}`}></span>
                            <span>{vehicle.status}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <ClockIcon className="w-3 h-3" />
                    <span>{vehicle.lastUpdated || 'N/A'}</span>
                </div>
            </div>
        </div>
    );
};

// Right sidebar
const VehicleDetailsPanel: React.FC<{vehicle: Vehicle, onClose: () => void, onShowTracking: () => void}> = ({ vehicle, onClose, onShowTracking }) => {

    const DetailCard: React.FC<{title: string, value: string, subValue?: string, unit?: string}> = ({title, value, subValue, unit}) => (
        <div className="bg-gray-100 dark:bg-slate-700/50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value} <span className="text-lg font-medium">{unit}</span></p>
            {subValue && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
        </div>
    );

    const statusColor = vehicle.status === 'On the Move' ? 'text-green-500' : 'text-yellow-500';

    return (
        <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 w-80 rounded-lg shadow-lg flex flex-col p-4 gap-4 z-[1000]">
            <header className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{vehicle.make}</h3>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${vehicle.status === 'On the Move' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    <button className="text-gray-400 hover:text-gray-600"><Cog8ToothIcon className="w-5 h-5"/></button>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5"/></button>
                </div>
            </header>
            <div>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Group {vehicle.group}</p>
                 <p className={`font-semibold ${statusColor}`}>{vehicle.status}</p>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated: {vehicle.lastUpdated || 'N/A'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <DetailCard title="Odometer" value={vehicle.odometer?.toString() || '0'} unit="km" />
                <DetailCard title="Speed" value={vehicle.currentSpeed?.toString() || '0'} unit="km/h" />
                {vehicle.engineHours && (
                    <DetailCard
                        title="Engine Hours"
                        value={vehicle.engineHours.today?.toString() || '0'}
                        subValue={`Total: ${vehicle.engineHours.total || 0}h`}
                        unit="hrs"
                    />
                )}
                {vehicle.batteryLevel && (
                    <DetailCard title="Battery" value={vehicle.batteryLevel.toString()} unit="%" />
                )}
            </div>

            <div className="flex flex-col gap-2">
                <button onClick={onShowTracking} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <MapPinIcon className="w-4 h-4" />
                    Show Tracking History
                </button>
            </div>
        </div>
    );
};

const FleetTrackingScreen: React.FC<FleetTrackingScreenProps> = ({ vehicles }) => {
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showTrackingModal, setShowTrackingModal] = useState(false);

    const filteredVehicles = vehicles.filter(v =>
        v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const vehiclesWithLocation = filteredVehicles.filter(v => v.lat != null && v.lng != null);

    const center: [number, number] = vehiclesWithLocation.length > 0
        ? [vehiclesWithLocation[0].lat!, vehiclesWithLocation[0].lng!]
        : [6.5244, 3.3792]; // Default to Lagos, Nigeria

    return (
        <div className="h-screen flex">
            {/* Left Sidebar */}
            <div className="w-80 bg-white dark:bg-slate-800 flex flex-col shadow-lg">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Fleet Tracking</h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search vehicles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredVehicles.map(vehicle => (
                        <VehicleListItem
                            key={vehicle.id}
                            vehicle={vehicle}
                            onSelect={setSelectedVehicle}
                            isSelected={selectedVehicle?.id === vehicle.id}
                        />
                    ))}
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer center={center} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {vehiclesWithLocation.map(vehicle => (
                        <Marker key={vehicle.id} position={[vehicle.lat!, vehicle.lng!]}>
                            <Popup>
                                <div className="text-sm">
                                    <p className="font-bold">{vehicle.make}</p>
                                    <p className="text-xs">{vehicle.plateNumber}</p>
                                    <p className="text-xs">{vehicle.status}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {selectedVehicle && (
                    <VehicleDetailsPanel
                        vehicle={selectedVehicle}
                        onClose={() => setSelectedVehicle(null)}
                        onShowTracking={() => setShowTrackingModal(true)}
                    />
                )}
            </div>

            {showTrackingModal && selectedVehicle && (
                <ShowTrackingModal
                    vehicle={selectedVehicle}
                    onClose={() => setShowTrackingModal(false)}
                />
            )}
        </div>
    );
};

export default FleetTrackingScreen;
