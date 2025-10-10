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
}

const InputField: React.FC<{label: string, id: string, placeholder: string, type?: string, required?: boolean, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, id, placeholder, type = 'text', required = false, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} placeholder={placeholder} required={required} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const CreateRouteModal: React.FC<CreateRouteModalProps> = ({ onClose, onAddRoute, currentMonthRouteCount = 0 }) => {
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