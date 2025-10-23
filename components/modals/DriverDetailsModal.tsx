import React from 'react';
import ModalBase from './ModalBase';
import type { Driver } from '../../types';

interface DriverDetailsModalProps {
    onClose: () => void;
    driver: Driver | null;
}

const InfoRow: React.FC<{label: string, value: string}> = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{value}</span>
    </div>
);

const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({ onClose, driver }) => {
    if (!driver) return null;

    return (
        <ModalBase title="Driver Details" onClose={onClose}>
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <img src={driver.avatar} alt={driver.name} className="w-16 h-16 rounded-full" />
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{driver.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{driver.status}</p>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <InfoRow label="Phone Number" value={driver.phone} />
                    <InfoRow label="License Number" value={driver.licenseNumber} />
                </div>

                <div>
                    <h4 className="text-md font-bold text-gray-800 dark:text-gray-100 mb-2">Driver's License</h4>
                    {driver.licensePhotoUrl ? (
                         <img 
                            src={driver.licensePhotoUrl} 
                            alt={`License of ${driver.name}`}
                            className="rounded-lg w-full h-auto object-cover border dark:border-slate-700" 
                        />
                    ) : (
                        <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-slate-700 rounded-lg text-gray-500 dark:text-gray-400">
                            No license photo available.
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

export default DriverDetailsModal;