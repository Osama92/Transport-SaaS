import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { createRoute } from '../../services/firestore/routes';
import { useClients } from '../../hooks/useFirestore';
import { canAddResource, getSubscriptionLimits } from '../../services/firestore/subscriptions';
import LimitReachedModal from '../LimitReachedModal';
import { calculateDistanceFallback } from '../../utils/distanceCalculator';
import GooglePlacesAutocomplete from '../GooglePlacesAutocomplete';
import StopManager from '../route/StopManager';
import RouteMap from '../route/RouteMap';
import { RouteStop } from '../../types';
import { optimizeRouteWithGoogle } from '../../services/google/directionsService';
import {
    optimizeStopsNearestNeighbor,
    calculateTotalDistance,
    estimateTravelTime,
    validateStopsForOptimization
} from '../../utils/routeOptimization';

interface CreateRouteModalProps {
    onClose: () => void;
    onAddRoute?: (routeData: { distanceKm: number, rate: number, stops: number }) => void;
    currentMonthRouteCount?: number;
    onUpgradePlan?: () => void; // Callback to navigate to subscription page
}

const InputField: React.FC<{label: string, id: string, placeholder: string, type?: string, required?: boolean, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, id, placeholder, type = 'text', required = false, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} placeholder={placeholder} required={required} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const CreateRouteModal: React.FC<CreateRouteModalProps> = ({ onClose, onAddRoute, currentMonthRouteCount = 0, onUpgradePlan }) => {
    const { t } = useTranslation();
    const { currentUser, organizationId, organization, userRole } = useAuth();
    const { data: clients } = useClients(organizationId);
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [distance, setDistance] = useState('');
    const [stops, setStops] = useState<RouteStop[]>([]);
    const [rate, setRate] = useState('');
    const [clientId, setClientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [calculatingDistance, setCalculatingDistance] = useState(false);
    const [distanceCalculationError, setDistanceCalculationError] = useState<string | null>(null);

    // Optimization states
    const [optimizing, setOptimizing] = useState(false);
    const [optimizationMethod, setOptimizationMethod] = useState<'manual' | 'nearestNeighbor' | 'google' | null>(null);
    const [optimizationResult, setOptimizationResult] = useState<{
        totalDistanceKm: number;
        totalDurationMinutes: number;
        method: string;
    } | null>(null);

    // Get subscription limits
    const subscriptionPlan = organization?.subscription?.plan || 'basic';
    const limits = getSubscriptionLimits(subscriptionPlan, userRole || 'partner');
    const routeLimit = limits?.routes;

    // Auto-calculate distance when both locations are selected with coordinates
    // or when stops are optimized
    useEffect(() => {
        const calculateDistance = async () => {
            if (!originCoords || !destCoords) {
                return;
            }

            setCalculatingDistance(true);
            setDistanceCalculationError(null);

            try {
                if (stops.length === 0) {
                    // No stops - calculate direct distance
                    const straightLineDistance = haversineDistance(
                        originCoords.lat,
                        originCoords.lng,
                        destCoords.lat,
                        destCoords.lng
                    );

                    // Add 30% buffer for realistic road distance
                    const estimatedRoadDistance = Math.round(straightLineDistance * 1.3);
                    setDistance(String(estimatedRoadDistance));
                } else {
                    // Has stops - calculate total route distance
                    const totalDistance = calculateTotalDistance(originCoords, stops, destCoords);
                    setDistance(String(totalDistance));
                }

                setDistanceCalculationError(null);
            } catch (err: any) {
                console.error('Error calculating distance:', err);
                setDistanceCalculationError('Failed to calculate distance');
            } finally {
                setCalculatingDistance(false);
            }
        };

        calculateDistance();
    }, [originCoords, destCoords, stops]);

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

    // Optimize route using nearest-neighbor algorithm (free)
    const handleOptimizeNearestNeighbor = () => {
        if (!originCoords || !destCoords) {
            setError('Please select origin and destination first');
            return;
        }

        if (stops.length === 0) {
            setError('Please add at least one stop before optimizing');
            return;
        }

        if (!validateStopsForOptimization(stops)) {
            setError('All stops must have valid coordinates');
            return;
        }

        setOptimizing(true);
        setError(null);

        try {
            // Optimize using nearest-neighbor
            const optimizedStops = optimizeStopsNearestNeighbor(originCoords, destCoords, stops);

            // Calculate totals
            const totalDistance = calculateTotalDistance(originCoords, optimizedStops, destCoords);
            const estimatedDuration = estimateTravelTime(totalDistance);

            // Update stops with optimized order
            setStops(optimizedStops);
            setOptimizationMethod('nearestNeighbor');
            setOptimizationResult({
                totalDistanceKm: totalDistance,
                totalDurationMinutes: estimatedDuration,
                method: 'Nearest Neighbor (Free)'
            });
        } catch (err: any) {
            console.error('Optimization error:', err);
            setError('Failed to optimize route: ' + err.message);
        } finally {
            setOptimizing(false);
        }
    };

    // Optimize route using Google Directions API (paid)
    const handleOptimizeGoogle = async () => {
        if (!originCoords || !destCoords) {
            setError('Please select origin and destination first');
            return;
        }

        if (stops.length === 0) {
            setError('Please add at least one stop before optimizing');
            return;
        }

        if (!validateStopsForOptimization(stops)) {
            setError('All stops must have valid coordinates');
            return;
        }

        setOptimizing(true);
        setError(null);

        try {
            // Optimize using Google Directions API (SDK loaded via script tag)
            const result = await optimizeRouteWithGoogle(
                originCoords,
                destCoords,
                stops
            );

            // Update stops with Google's optimized order
            setStops(result.optimizedStops);
            setOptimizationMethod('google');
            setOptimizationResult({
                totalDistanceKm: result.totalDistanceKm,
                totalDurationMinutes: result.totalDurationMinutes,
                method: 'Google Directions API'
            });
        } catch (err: any) {
            console.error('Google optimization error:', err);

            // Check if it's an API key authorization error
            const isAuthError = err.message?.includes('REQUEST_DENIED') || err.message?.includes('not authorized');

            if (isAuthError) {
                console.warn('Google Directions API not enabled. Please enable it in Google Cloud Console.');
            }

            // Automatically fallback to nearest neighbor
            try {
                const optimizedStops = optimizeStopsNearestNeighbor(originCoords, destCoords, stops);
                const totalDistance = calculateTotalDistance(originCoords, optimizedStops, destCoords);
                const estimatedDuration = estimateTravelTime(totalDistance);

                setStops(optimizedStops);
                setOptimizationMethod('nearestNeighbor');
                setOptimizationResult({
                    totalDistanceKm: totalDistance,
                    totalDurationMinutes: estimatedDuration,
                    method: 'Nearest Neighbor (Auto-Fallback)'
                });

                // Show helpful message based on error type
                if (isAuthError) {
                    setError('ℹ️ Google Directions API not enabled. Used free optimization instead. Route optimized successfully!');
                } else {
                    setError('⚠️ Google optimization unavailable. Used free optimization instead.');
                }
            } catch (fallbackErr: any) {
                setError('❌ Optimization failed. Please check your stops and try again.');
            }
        } finally {
            setOptimizing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!organizationId || !currentUser) {
            setError('You must be logged in to create a route');
            return;
        }

        // Check subscription limit before creating
        if (!canAddResource(currentMonthRouteCount, routeLimit)) {
            setShowLimitModal(true);
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

            // Create route in Firestore
            await createRoute(
                organizationId,
                {
                    origin: origin,
                    destination: destination,
                    distance: distance ? Number(distance) : 0,
                    stops: stops.length > 0 ? stops : 0, // Support both RouteStop[] and number
                    rate: rate ? Number(rate) : 0,
                    distanceKm: distance ? Number(distance) : 0,
                    driverName: '',
                    driverAvatar: '',
                    vehicle: '',
                    status: 'Pending',
                    progress: 0,
                    assignedDriverId: null,
                    assignedDriverName: '',
                    assignedVehicleId: null,
                    assignedVehiclePlate: '',
                    clientId: clientId || null,
                    clientName: selectedClient?.name || '',
                    cargo: {
                        type: '',
                        weight: 0,
                        description: '',
                    },
                    estimatedDepartureTime: null,
                    estimatedArrivalTime: null,
                    actualDepartureTime: null,
                    actualArrivalTime: null,
                    podUrl: null,
                    notes: '',
                    // New optimization fields
                    optimizationMethod: optimizationMethod || 'manual',
                    isOptimized: optimizationMethod !== null,
                    totalDistanceKm: optimizationResult?.totalDistanceKm,
                    estimatedDurationMinutes: optimizationResult?.totalDurationMinutes,
                },
                currentUser.uid
            );

            // Call legacy callback if provided (for demo mode)
            if (onAddRoute) {
                onAddRoute({
                    distanceKm: Number(distance),
                    rate: Number(rate),
                    stops: stops.length,
                });
            }

            onClose();
        } catch (err: any) {
            console.error('Error creating route:', err);
            setError(err.message || 'Failed to create route');
            setLoading(false);
        }
    };

    const handleUpgrade = () => {
        setShowLimitModal(false);
        onClose();
        // Navigate to subscription page if callback is provided
        if (onUpgradePlan) {
            onUpgradePlan();
        }
    };

    return (
        <>
            <LimitReachedModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceType="routes"
                currentPlan={subscriptionPlan}
                onUpgrade={handleUpgrade}
            />
            <ModalBase
                title={t('modals.createRoute.title')}
                onClose={onClose}
                size={optimizationResult && stops.length > 0 ? 'xl' : 'lg'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subscription Limit Warning Banner */}
                {routeLimit !== undefined && (
                    <div className={`rounded-lg p-4 border ${
                        currentMonthRouteCount >= routeLimit
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : currentMonthRouteCount >= routeLimit * 0.8
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                {currentMonthRouteCount >= routeLimit ? (
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                ) : currentMonthRouteCount >= routeLimit * 0.8 ? (
                                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-sm font-semibold mb-1 ${
                                    currentMonthRouteCount >= routeLimit
                                        ? 'text-red-800 dark:text-red-300'
                                        : currentMonthRouteCount >= routeLimit * 0.8
                                        ? 'text-yellow-800 dark:text-yellow-300'
                                        : 'text-blue-800 dark:text-blue-300'
                                }`}>
                                    {currentMonthRouteCount >= routeLimit
                                        ? '⚠️ Route Limit Reached'
                                        : currentMonthRouteCount >= routeLimit * 0.8
                                        ? '⚡ Approaching Route Limit'
                                        : '✓ Route Capacity Available'
                                    }
                                </h4>
                                <p className={`text-sm ${
                                    currentMonthRouteCount >= routeLimit
                                        ? 'text-red-700 dark:text-red-400'
                                        : currentMonthRouteCount >= routeLimit * 0.8
                                        ? 'text-yellow-700 dark:text-yellow-400'
                                        : 'text-blue-700 dark:text-blue-400'
                                }`}>
                                    You have created <span className="font-bold">{currentMonthRouteCount}</span> of <span className="font-bold">{routeLimit}</span> routes this month on your <span className="font-semibold capitalize">{subscriptionPlan}</span> plan.
                                    {currentMonthRouteCount < routeLimit && (
                                        <span className="block mt-1">
                                            {routeLimit - currentMonthRouteCount} route{routeLimit - currentMonthRouteCount !== 1 ? 's' : ''} remaining this month.
                                        </span>
                                    )}
                                </p>
                                {currentMonthRouteCount >= routeLimit && (
                                    <button
                                        type="button"
                                        onClick={handleUpgrade}
                                        className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                                    >
                                        Upgrade Plan →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className={`px-4 py-3 rounded-lg ${
                        error.startsWith('ℹ️')
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                            : error.startsWith('⚠️')
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                    }`}>
                        {error}
                    </div>
                )}
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
                            name="distance"
                            placeholder="Auto-calculated or enter manually"
                            required
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            disabled={calculatingDistance}
                            className="w-full px-3 py-2 pr-10 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 disabled:opacity-50 disabled:cursor-wait"
                        />
                        {calculatingDistance && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <svg className="animate-spin h-5 w-5 text-indigo-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {calculatingDistance && (
                        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Calculating driving distance...
                        </p>
                    )}
                    {distanceCalculationError && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {distanceCalculationError} - Please enter manually
                        </p>
                    )}
                    {!calculatingDistance && !distanceCalculationError && distance && (
                        <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Distance calculated (editable)
                        </p>
                    )}
                </div>

                {/* Stop Manager - Multi-Stop Deliveries */}
                <div className="border-t pt-4 dark:border-slate-700">
                    <StopManager
                        stops={stops}
                        onStopsChange={setStops}
                        maxStops={15}
                    />
                </div>

                {/* Route Optimization Buttons - Only show if stops exist */}
                {stops.length > 0 && originCoords && destCoords && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                        <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-3">
                            Route Optimization
                        </h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-3">
                            Optimize your route to find the best delivery sequence. Choose between free nearest-neighbor or Google's advanced optimization.
                        </p>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleOptimizeNearestNeighbor}
                                disabled={optimizing || stops.length === 0}
                                className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border-2 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 rounded-lg font-medium hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {optimizing && optimizationMethod !== 'google' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Optimizing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Quick Optimize (Free)
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleOptimizeGoogle}
                                disabled={optimizing || stops.length === 0}
                                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {optimizing && optimizationMethod === 'google' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Optimizing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        Google Optimize
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 Both methods optimize stop order for shortest distance. Google Optimize uses real roads (requires API setup), Quick Optimize uses straight-line calculations.
                        </p>

                        {/* Optimization Result Display */}
                        {optimizationResult && (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                                            Route Optimized!
                                        </p>
                                        <div className="mt-1 text-xs text-green-700 dark:text-green-400 space-y-1">
                                            <p>Method: <span className="font-medium">{optimizationResult.method}</span></p>
                                            <p>Total Distance: <span className="font-medium">{optimizationResult.totalDistanceKm} km</span></p>
                                            <p>Estimated Time: <span className="font-medium">{Math.floor(optimizationResult.totalDurationMinutes / 60)}h {optimizationResult.totalDurationMinutes % 60}m</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Map Visualization */}
                        {optimizationResult && stops.length > 0 && originCoords && destCoords && (
                            <div className="mt-4">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                    Route Visualization
                                </h4>
                                <RouteMap
                                    origin={originCoords}
                                    destination={destCoords}
                                    stops={stops}
                                    height="350px"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    🗺️ Map shows optimized route. Green (A) = Origin, Red (B) = Destination, Blue = Stops (in sequence)
                                </p>
                            </div>
                        )}
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
                    <label htmlFor="client" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
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
                        {loading ? 'Creating...' : t('modals.createRoute.saveButton')}
                    </button>
                </div>
                </form>
            </ModalBase>
        </>
    );
};

export default CreateRouteModal;