import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { updateRoute } from '../../services/firestore/routes';
import { useClients } from '../../hooks/useFirestore';
import type { Route } from '../../types';

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
    const [distance, setDistance] = useState(String(route.distance || route.distanceKm || ''));
    const [stops, setStops] = useState(String(route.stops || ''));
    const [rate, setRate] = useState(String(route.rate || ''));
    const [clientId, setClientId] = useState(route.clientId || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                stops: stops ? Number(stops) : 0,
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
        <ModalBase title="Edit Route" onClose={onClose}>
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
                        {loading ? 'Saving...' : t('common.save')}
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default EditRouteModal;
