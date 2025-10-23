import React, { useState } from 'react';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { createVehicle } from '../../services/firestore/vehicles';
import { canAddResource, getSubscriptionLimits } from '../../services/firestore/subscriptions';
import LimitReachedModal from '../LimitReachedModal';
import { notifyVehicleAdded } from '../../services/notificationTriggers';

interface AddVehicleModalProps {
    onClose: () => void;
    currentVehicleCount?: number;
}

const InputField: React.FC<{label: string, id: string, type?: string, placeholder: string, required?: boolean}> = ({ label, id, type = 'text', placeholder, required = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} placeholder={placeholder} required={required} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ onClose, currentVehicleCount = 0 }) => {
    const { currentUser, organizationId, organization, userRole } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Get subscription limits
    const subscriptionPlan = organization?.subscription?.plan || 'basic';
    const limits = getSubscriptionLimits(subscriptionPlan, userRole || 'partner');
    const vehicleLimit = limits?.vehicles;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!organizationId || !currentUser) {
            setError('You must be logged in to add a vehicle');
            return;
        }

        // Check subscription limit before creating
        if (!canAddResource(currentVehicleCount, vehicleLimit)) {
            setShowLimitModal(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData(e.currentTarget);
            const make = formData.get('make') as string;
            const model = formData.get('model') as string;
            const year = formData.get('year') as string;
            const plate = formData.get('plate') as string;
            const vin = formData.get('vin') as string;
            const odometer = formData.get('odometer') as string;

            if (!make || !model || !year || !plate) {
                setError('Make, model, year, and plate number are required');
                setLoading(false);
                return;
            }

            // Create vehicle in Firestore
            await createVehicle(
                organizationId,
                {
                    make: make,
                    model: model,
                    year: Number(year),
                    plateNumber: plate,
                    vin: vin || '',
                    status: 'Parked',
                    assignedDriverId: null,
                    assignedDriverName: '',
                    currentRouteId: null,
                    fuelType: 'Diesel',
                    color: '',
                    capacity: 0,
                    telematics: {
                        odometer: odometer ? Number(odometer) : 0,
                        currentSpeed: 0,
                        batteryLevel: 100,
                        engineHours: 0,
                    },
                    locationData: undefined,
                    maintenance: {
                        lastServiceDate: new Date().toISOString(),
                        nextServiceDate: '',
                        nextServiceOdometer: 0,
                    },
                },
                currentUser.uid
            );

            // Send notification about new vehicle
            await notifyVehicleAdded(currentUser.uid, organizationId, plate);

            onClose();
        } catch (err: any) {
            console.error('Error creating vehicle:', err);
            setError(err.message || 'Failed to create vehicle');
            setLoading(false);
        }
    };

    const handleUpgrade = () => {
        setShowLimitModal(false);
        onClose();
        // TODO: Navigate to subscription management screen
        // This will be handled by the parent component
    };

    return (
        <>
            <LimitReachedModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceType="vehicles"
                currentPlan={subscriptionPlan}
                onUpgrade={handleUpgrade}
            />
            <ModalBase title="Add New Vehicle" onClose={onClose}>
                <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subscription Limit Warning Banner */}
                {vehicleLimit !== undefined && (
                    <div className={`rounded-lg p-4 border ${
                        currentVehicleCount >= vehicleLimit
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : currentVehicleCount >= vehicleLimit * 0.8
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                {currentVehicleCount >= vehicleLimit ? (
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                ) : currentVehicleCount >= vehicleLimit * 0.8 ? (
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
                                    currentVehicleCount >= vehicleLimit
                                        ? 'text-red-800 dark:text-red-300'
                                        : currentVehicleCount >= vehicleLimit * 0.8
                                        ? 'text-yellow-800 dark:text-yellow-300'
                                        : 'text-blue-800 dark:text-blue-300'
                                }`}>
                                    {currentVehicleCount >= vehicleLimit
                                        ? '⚠️ Vehicle Limit Reached'
                                        : currentVehicleCount >= vehicleLimit * 0.8
                                        ? '⚡ Approaching Vehicle Limit'
                                        : '✓ Vehicle Capacity Available'
                                    }
                                </h4>
                                <p className={`text-sm ${
                                    currentVehicleCount >= vehicleLimit
                                        ? 'text-red-700 dark:text-red-400'
                                        : currentVehicleCount >= vehicleLimit * 0.8
                                        ? 'text-yellow-700 dark:text-yellow-400'
                                        : 'text-blue-700 dark:text-blue-400'
                                }`}>
                                    You are using <span className="font-bold">{currentVehicleCount}</span> of <span className="font-bold">{vehicleLimit}</span> vehicles on your <span className="font-semibold capitalize">{subscriptionPlan}</span> plan.
                                    {currentVehicleCount < vehicleLimit && (
                                        <span className="block mt-1">
                                            {vehicleLimit - currentVehicleCount} vehicle{vehicleLimit - currentVehicleCount !== 1 ? 's' : ''} remaining.
                                        </span>
                                    )}
                                </p>
                                {currentVehicleCount >= vehicleLimit && (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Make" id="make" placeholder="e.g., Ford" required />
                    <InputField label="Model" id="model" placeholder="e.g., Transit" required />
                    <InputField label="Year" id="year" type="number" placeholder="e.g., 2023" required />
                    <InputField label="License Plate" id="plate" placeholder="e.g., ABC-1234" required />
                </div>
                <InputField label="VIN (Vehicle Identification Number)" id="vin" placeholder="Enter 17-digit VIN" required />
                <InputField label="Initial Odometer (km)" id="odometer" type="number" placeholder="e.g., 50000" required />
                <div>
                    <label htmlFor="documents" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Documents</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload registration, insurance, etc. (PDF, JPG)</p>
                    <input type="file" id="documents" name="documents" multiple className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900"/>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} disabled={loading} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Saving...' : 'Save Vehicle'}
                    </button>
                </div>
                </form>
            </ModalBase>
        </>
    );
};

export default AddVehicleModal;