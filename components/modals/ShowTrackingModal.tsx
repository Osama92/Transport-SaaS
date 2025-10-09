import React from 'react';
import ModalBase from './ModalBase';
import type { Vehicle } from '../../types';
import { MapPinIcon, ClockIcon } from '../Icons';

interface ShowTrackingModalProps {
    vehicle: Vehicle;
    onClose: () => void;
}

const ShowTrackingModal: React.FC<ShowTrackingModalProps> = ({ vehicle, onClose }) => {
    // Mock tracking history data
    const trackingHistory = [
        { timestamp: '2025-10-09 08:30', location: 'Lagos, Ikeja', lat: 6.5955, lng: 3.3416, event: 'Started Journey' },
        { timestamp: '2025-10-09 09:15', location: 'Lagos, Victoria Island', lat: 6.4281, lng: 3.4219, event: 'En Route' },
        { timestamp: '2025-10-09 10:00', location: 'Lagos, Lekki', lat: 6.4698, lng: 3.5852, event: 'Delivery Stop' },
        { timestamp: '2025-10-09 11:30', location: 'Lagos, Ajah', lat: 6.4698, lng: 3.6052, event: 'Current Location' },
    ];

    return (
        <ModalBase title={`Tracking History - ${vehicle.make} (${vehicle.plateNumber})`} onClose={onClose}>
            <div className="space-y-4">
                {/* Vehicle Summary */}
                <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">{vehicle.status}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Current Speed</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">
                                {vehicle.currentSpeed || 0} km/h
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Odometer</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">
                                {vehicle.odometer || 0} km
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">
                                {vehicle.lastUpdated || 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tracking Timeline */}
                <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Location History</h4>
                    <div className="space-y-3">
                        {trackingHistory.map((entry, index) => (
                            <div key={index} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full ${index === trackingHistory.length - 1 ? 'bg-green-500' : 'bg-indigo-500'}`}></div>
                                    {index < trackingHistory.length - 1 && (
                                        <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-600 my-1"></div>
                                    )}
                                </div>
                                <div className="flex-1 pb-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <MapPinIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                                            {entry.event}
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{entry.location}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <ClockIcon className="w-3 h-3 text-gray-400" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{entry.timestamp}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                        Close
                    </button>
                    <button
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        View Full Map
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default ShowTrackingModal;
