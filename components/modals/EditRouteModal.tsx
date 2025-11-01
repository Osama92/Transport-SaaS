import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { updateRoute } from '../../services/firestore/routes';
import { useClients } from '../../hooks/useFirestore';
import GooglePlacesAutocomplete from '../GooglePlacesAutocomplete';
import StopManager from '../route/StopManager';
import type { Route, RouteStop } from '../../types';

interface EditRouteModalProps {
    route: Route;
    onClose: () => void;
    onSave?: (updatedRoute: Route) => void; // For demo mode
}

const InputField: React.FC<{label: string, id: string, placeholder: string, type?: string, required?: boolean, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, id, placeholder, type = 'text', required = false, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} placeholder={placeholder} required={required} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const EditRouteModal: React.FC<EditRouteModalProps> = ({ route, onClose, onSave }) => {
    const { t } = useTranslation();
    const { currentUser, organizationId } = useAuth();
    const { data: clients } = useClients(organizationId);
    const [origin, setOrigin] = useState(route.origin || '');
    const [destination, setDestination] = useState(route.destination || '');
    const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [distance, setDistance] = useState(String(route.distance || route.distanceKm || ''));

    // Handle both number and RouteStop[] array formats
    const hasDetailedStops = Array.isArray(route.stops);
    const [stopsArray, setStopsArray] = useState<RouteStop[]>(
        hasDetailedStops ? route.stops as RouteStop[] : []
    );
    const [stopsNumber, setStopsNumber] = useState(
        hasDetailedStops ? String((route.stops as RouteStop[]).length) : String(route.stops || '')
    );

    const [rate, setRate] = useState(String(route.rate || ''));
    const [clientId, setClientId] = useState(route.clientId || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [calculatingDistance, setCalculatingDistance] = useState(false);
    const [distanceCalculationError, setDistanceCalculationError] = useState<string | null>(null);

    // Auto-calculate distance when both locations are selected with coordinates
    useEffect(() => {
        const calculateDistance = async () => {
            if (!originCoords || !destCoords) {
                return;
            }

            setCalculatingDistance(true);
            setDistanceCalculationError(null);

            try {
                // Calculate using Haversine since we have exact coordinates
                const straightLineDistance = haversineDistance(
                    originCoords.lat,
                    originCoords.lng,
                    destCoords.lat,
                    destCoords.lng
                );

                // Add 30% buffer for realistic road distance
                const estimatedRoadDistance = Math.round(straightLineDistance * 1.3);

                setDistance(String(estimatedRoadDistance));
                setDistanceCalculationError(null);
            } catch (err: any) {
                console.error('Error calculating distance:', err);
                setDistanceCalculationError('Failed to calculate distance');
            } finally {
                setCalculatingDistance(false);
            }
        };

        calculateDistance();
    }, [originCoords, destCoords]);

    // Haversine distance calculation helper
    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return Math.round(distance);
    };

    const toRadians = (degrees: number): number => {
        return degrees * (Math.PI / 180);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!organizationId || !currentUser) {
            setError('You must be logged in to edit a route');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (!origin || !destination) {
                setError('Origin and destination are required');
                setLoading(false);
                return;
            }

            // Find selected client
            const selectedClient = clientId ? clients?.find(c => c.id === clientId) : null;

            const updates = {
                origin: origin,
                destination: destination,
                distance: distance ? Number(distance) : 0,
                // Use updated stopsArray if detailed stops exist, otherwise use number
                stops: hasDetailedStops ? stopsArray : (stopsNumber ? Number(stopsNumber) : 0),
                rate: rate ? Number(rate) : 0,
                distanceKm: distance ? Number(distance) : 0,
                clientId: clientId || null,
                clientName: selectedClient?.name || '',
            };

            // Update route in Firestore
            await updateRoute(route.id, updates);

            // Call legacy callback if provided (for demo mode)
            if (onSave) {
                onSave({
                    ...route,
                    ...updates,
                });
            }

            onClose();
        } catch (err: any) {
            console.error('Error updating route:', err);
            setError(err.message || 'Failed to update route');
            setLoading(false);
        }
    };

    return (
        <ModalBase title="Edit Route" onClose={onClose} size={hasDetailedStops ? 'lg' : 'md'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                        <span className="font-semibold">Note:</span> You can only edit routes that have not been assigned to a driver or vehicle yet.
                    </p>
                </div>

                <GooglePlacesAutocomplete
                    label="Origin"
                    id="origin"
                    placeholder="e.g., Lagos, Ojota Bus Stop"
                    value={origin}
                    onChange={(value, placeId, coordinates) => {
                        setOrigin(value);
                        if (coordinates) setOriginCoords(coordinates);
                    }}
                    required
                />
                <GooglePlacesAutocomplete
                    label="Destination"
                    id="destination"
                    placeholder="e.g., Abuja, Kano"
                    value={destination}
                    onChange={(value, placeId, coordinates) => {
                        setDestination(value);
                        if (coordinates) setDestCoords(coordinates);
                    }}
                    required
                />
                <div>
                    <label htmlFor="distance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Distance (km) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            id="distance"
                            placeholder="e.g., 750"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                        />
                        {calculatingDistance && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <svg className="animate-spin h-4 w-4 text-indigo-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {distanceCalculationError && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{distanceCalculationError}</p>
                    )}
                    {!calculatingDistance && !distanceCalculationError && originCoords && destCoords && (
                        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                            ✓ Distance auto-calculated
                        </p>
                    )}
                </div>
                {hasDetailedStops ? (
                    <div className="border-t pt-4 dark:border-slate-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Delivery Stops ({stopsArray.length})
                        </h3>
                        <StopManager
                            stops={stopsArray}
                            onStopsChange={setStopsArray}
                            maxStops={15}
                        />
                    </div>
                ) : (
                    <div>
                        <label htmlFor="stops" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Number of Stops <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="stops"
                            placeholder="e.g., 5"
                            value={stopsNumber}
                            onChange={(e) => setStopsNumber(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border bg-gray-100 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                        />
                    </div>
                )}
                <InputField
                    label="Route Rate (₦)"
                    id="rate"
                    type="number"
                    placeholder="e.g., 150000"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    required
                />
                <div>
                    <label htmlFor="client" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client (Optional)</label>
                    <select
                        id="client"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    >
                        <option value="">Select a client</option>
                        {clients?.filter(c => c.status === 'Active').map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} disabled={loading} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300 disabled:opacity-50">{t('common.cancel')}</button>
                    <button type="submit" disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Saving...' : t('common.save')}
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default EditRouteModal;
