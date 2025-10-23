import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { createRoute } from '../../services/firestore/routes';
import { useClients } from '../../hooks/useFirestore';
import { canAddResource, getSubscriptionLimits } from '../../services/firestore/subscriptions';
import LimitReachedModal from '../LimitReachedModal';

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
    const [distance, setDistance] = useState('');
    const [stops, setStops] = useState('');
    const [rate, setRate] = useState('');
    const [clientId, setClientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Get subscription limits
    const subscriptionPlan = organization?.subscription?.plan || 'basic';
    const limits = getSubscriptionLimits(subscriptionPlan, userRole || 'partner');
    const routeLimit = limits?.routes;

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
                    stops: stops ? Number(stops) : 0,
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
                },
                currentUser.uid
            );

            // Call legacy callback if provided (for demo mode)
            if (onAddRoute) {
                onAddRoute({
                    distanceKm: Number(distance),
                    rate: Number(rate),
                    stops: Number(stops),
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
            <ModalBase title={t('modals.createRoute.title')} onClose={onClose}>
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
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}
                <InputField
                    label="Origin"
                    id="origin"
                    placeholder="e.g., Lagos"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    required
                />
                <InputField
                    label="Destination"
                    id="destination"
                    placeholder="e.g., Abuja"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                />
                <InputField
                    label="Distance (km)"
                    id="distance"
                    type="number"
                    placeholder="e.g., 750"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    required
                />
                <InputField
                    label="Number of Stops"
                    id="stops"
                    type="number"
                    placeholder="e.g., 5"
                    value={stops}
                    onChange={(e) => setStops(e.target.value)}
                    required
                />
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
                        {loading ? 'Creating...' : t('modals.createRoute.saveButton')}
                    </button>
                </div>
                </form>
            </ModalBase>
        </>
    );
};

export default CreateRouteModal;