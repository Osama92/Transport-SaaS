import React from 'react';
import ModalBase from './ModalBase';
import type { Route } from '../../types';

interface ProofOfDeliveryModalProps {
    onClose: () => void;
    route: Route | null;
}

const InfoRow: React.FC<{label: string, value: string}> = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{value}</span>
    </div>
);

const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({ onClose, route }) => {
    if (!route) return null;

    return (
        <ModalBase title={`Proof of Delivery: ${route.id}`} onClose={onClose}>
            <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <InfoRow label="Driver" value={route.driverName} />
                    <InfoRow label="Vehicle" value={route.vehicle} />
                    <InfoRow label="Status" value={route.status} />
                </div>
                <div>
                    <h4 className="text-md font-bold text-gray-800 dark:text-gray-100 mb-2">POD Image</h4>
                    {route.podUrl ? (
                        <img 
                            src={route.podUrl} 
                            alt={`Proof of delivery for ${route.id}`}
                            className="rounded-lg w-full h-auto object-cover border dark:border-slate-700" 
                        />
                    ) : (
                        <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-slate-700 rounded-lg text-gray-500 dark:text-gray-400">
                            No POD image available.
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg">Close</button>
                </div>
            </div>
        </ModalBase>
    );
};

export default ProofOfDeliveryModal;