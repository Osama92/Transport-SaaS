import React, { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useAuth } from '../../contexts/AuthContext';
import { useVehicles, useDrivers } from '../../hooks/useFirestore';
import type { Vehicle, Driver } from '../../types';

// Kano, Nigeria coordinates (center of map)
const defaultCenter = {
    lat: 12.0022,
    lng: 8.5919
};

const mapContainerStyle = {
    width: '100%',
    height: 'calc(100vh - 120px)'
};

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
};

interface VehicleWithLocation extends Vehicle {
    currentLocation?: {
        lat: number;
        lng: number;
        address?: string;
        lastUpdate?: string;
    };
    driver?: Driver;
    status: 'idle' | 'moving' | 'stopped';
    idleDuration?: string;
    todayDistance?: number;
}

const VehicleTrackingScreen: React.FC = () => {
    const { organizationId } = useAuth();
    const { data: vehicles } = useVehicles(organizationId);
    const { data: drivers } = useDrivers(organizationId);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithLocation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'idle' | 'moving' | 'stopped'>('all');
    const [vehiclesWithTracking, setVehiclesWithTracking] = useState<VehicleWithLocation[]>([]);

    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    // Load Google Maps script
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: googleMapsApiKey,
    });

    // Mock GPS data for demonstration (Kano locations)
    useEffect(() => {
        if (!vehicles) return;

        const mockLocations = [
            { lat: 12.0022, lng: 8.5919, address: '117 Ali Yakasai St, GRA, Kano 700213', status: 'idle', idleDuration: '18 hours and 23 minutes' },
            { lat: 11.9962, lng: 8.5247, address: 'Ungwa Uku, Tarauni, Kano 700101', status: 'stopped', idleDuration: '31 minutes' },
            { lat: 12.0189, lng: 8.5432, address: 'Zoo Road, Kano', status: 'moving', idleDuration: '0 minutes' },
            { lat: 11.9845, lng: 8.5673, address: 'Ibrahim Taiwo Road, Kano', status: 'idle', idleDuration: '2 hours and 15 minutes' },
            { lat: 12.0301, lng: 8.5156, address: 'Murtala Mohammed Way, Kano', status: 'moving', idleDuration: '0 minutes' },
        ];

        const trackedVehicles: VehicleWithLocation[] = vehicles.slice(0, 5).map((vehicle, index) => {
            const location = mockLocations[index % mockLocations.length];
            const assignedDriver = drivers?.find(d => d.id === vehicle.assignedDriverId);

            return {
                ...vehicle,
                currentLocation: {
                    lat: location.lat + (Math.random() - 0.5) * 0.01, // Slight random offset
                    lng: location.lng + (Math.random() - 0.5) * 0.01,
                    address: location.address,
                    lastUpdate: new Date(Date.now() - Math.random() * 300000).toISOString() // Random time in last 5 min
                },
                driver: assignedDriver,
                status: location.status as 'idle' | 'moving' | 'stopped',
                idleDuration: location.idleDuration,
                todayDistance: Math.random() * 50 // Random distance 0-50km
            };
        });

        setVehiclesWithTracking(trackedVehicles);
    }, [vehicles, drivers]);

    const filteredVehicles = vehiclesWithTracking.filter(vehicle => {
        const matchesSearch = vehicle.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            vehicle.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterStatus === 'all' || vehicle.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'idle': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            case 'moving': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
            case 'stopped': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getMarkerIcon = (vehicle: VehicleWithLocation) => {
        const color = vehicle.status === 'idle' ? '#dc2626' :
                     vehicle.status === 'moving' ? '#16a34a' : '#eab308';

        // Bootstrap Icons truck - professional delivery truck icon
        return {
            path: 'M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 4.732 11h5.536a2 2 0 0 1 .732-.732V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2',
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 2.5,
            anchor: new google.maps.Point(8, 12),
            rotation: 0
        };
    };

    const formatLastUpdate = (timestamp?: string) => {
        if (!timestamp) return 'Unknown';
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    };

    return (
        <div className="h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Vehicle Tracking
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            All Vehicles: {vehiclesWithTracking.length} Vehicles
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Status</option>
                            <option value="idle">Idle</option>
                            <option value="moving">Moving</option>
                            <option value="stopped">Stopped</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Vehicle List Sidebar */}
                <div className="w-96 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
                    {/* Search */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search vehicles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Vehicle List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredVehicles.map((vehicle) => (
                            <div
                                key={vehicle.id}
                                onClick={() => setSelectedVehicle(vehicle)}
                                className={`p-4 border-b border-gray-200 dark:border-slate-700 cursor-pointer transition-colors ${
                                    selectedVehicle?.id === vehicle.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            vehicle.status === 'idle' ? 'bg-red-500' :
                                            vehicle.status === 'moving' ? 'bg-green-500' : 'bg-yellow-500'
                                        }`}></div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {vehicle.licensePlate}
                                        </h3>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(vehicle.status)}`}>
                                        {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    {vehicle.status === 'idle' ? '⚠️ Idling: ' : vehicle.status === 'stopped' ? '⏸️ Stopped: ' : '🚗 Moving'}
                                    {vehicle.status !== 'moving' && <span className="font-semibold text-red-600 dark:text-red-400">{vehicle.idleDuration}</span>}
                                </p>

                                <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                                    Last data received {formatLastUpdate(vehicle.currentLocation?.lastUpdate)}
                                </p>

                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="bg-gray-100 dark:bg-slate-900 rounded p-2 text-center">
                                        <p className="text-gray-500 dark:text-gray-500">ON</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">Ignition</p>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-slate-900 rounded p-2 text-center">
                                        <p className="text-gray-500 dark:text-gray-500">{vehicle.status === 'moving' ? '50' : '0'} km/h</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">Speed</p>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-slate-900 rounded p-2 text-center">
                                        <p className="text-gray-500 dark:text-gray-500">{vehicle.fuelLevel || 75}%</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">Fuel</p>
                                    </div>
                                </div>

                                {vehicle.currentLocation?.address && (
                                    <div className="mt-2 flex items-start gap-2">
                                        <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                            {vehicle.currentLocation.address}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredVehicles.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <svg className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                <p className="text-gray-500 dark:text-gray-400 text-center">
                                    No vehicles found
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Show All
                        </button>
                    </div>
                </div>

                {/* Map */}
                <div className="flex-1 relative">
                    {loadError && (
                        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-slate-900">
                            <div className="text-center">
                                <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Error loading maps</p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Please check your API key</p>
                            </div>
                        </div>
                    )}

                    {!isLoaded && !loadError && (
                        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-slate-900">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
                            </div>
                        </div>
                    )}

                    {isLoaded && (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={selectedVehicle?.currentLocation || defaultCenter}
                            zoom={selectedVehicle ? 15 : 12}
                            options={mapOptions}
                        >
                            {vehiclesWithTracking.map((vehicle) => (
                                vehicle.currentLocation && (
                                    <Marker
                                        key={vehicle.id}
                                        position={vehicle.currentLocation}
                                        icon={getMarkerIcon(vehicle)}
                                        onClick={() => setSelectedVehicle(vehicle)}
                                    />
                                )
                            ))}

                            {selectedVehicle && selectedVehicle.currentLocation && (
                                <InfoWindow
                                    position={selectedVehicle.currentLocation}
                                    onCloseClick={() => setSelectedVehicle(null)}
                                    options={{
                                        pixelOffset: new google.maps.Size(0, -10),
                                        maxWidth: 320
                                    }}
                                >
                                    <div className="min-w-[280px]">
                                        {/* Header with vehicle plate and arrow */}
                                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900">{selectedVehicle.licensePlate}</h3>
                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Idling Warning */}
                                        {selectedVehicle.status === 'idle' && (
                                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                                                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-red-900">Idling: {selectedVehicle.idleDuration}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Stopped Warning */}
                                        {selectedVehicle.status === 'stopped' && (
                                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                                                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-yellow-900">Stopped: {selectedVehicle.idleDuration}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Today stats */}
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                                <span className="font-medium">Today: {selectedVehicle.todayDistance?.toFixed(1) || 0} km</span>
                                            </span>
                                        </div>

                                        {/* Last update */}
                                        <p className="text-xs text-gray-500 mb-3">
                                            Last data received {formatLastUpdate(selectedVehicle.currentLocation.lastUpdate)}
                                        </p>

                                        {/* Address */}
                                        <div className="mb-3">
                                            <p className="text-sm text-gray-900 font-medium">
                                                {selectedVehicle.currentLocation.address}
                                            </p>
                                        </div>

                                        {/* Coordinates */}
                                        <p className="text-xs text-gray-500 mb-3 font-mono">
                                            ({selectedVehicle.currentLocation.lat.toFixed(6)}, {selectedVehicle.currentLocation.lng.toFixed(6)})
                                        </p>

                                        {/* Trip and Consigner Info */}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div>
                                                <p className="text-xs text-gray-500">Trip:</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {selectedVehicle.driver?.routeId || 'Not Assigned'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Consigner:</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {selectedVehicle.driver?.name || 'Not Assigned'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                            <button
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                title="Share location"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                title="Route history"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                title="Delivery truck"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                </svg>
                                            </button>
                                            <button
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                title="Navigation"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                title="More options"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    )}

                    {/* Map Legend */}
                    <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-3">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">Moving</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">Idle</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">Stopped</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleTrackingScreen;
