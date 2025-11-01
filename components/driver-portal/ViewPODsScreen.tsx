/**
 * View PODs Screen
 * Read-only view of all PODs for a completed route
 */

import React from 'react';
import { Route } from '../../types';
import { ArrowLeftIcon } from '../Icons';

interface ViewPODsScreenProps {
    route: Route;
    onBack: () => void;
}

const ViewPODsScreen: React.FC<ViewPODsScreenProps> = ({ route, onBack }) => {
    const stops = Array.isArray(route.stops) ? route.stops : [];
    const completedStops = stops.filter(s => s.status === 'completed');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                            Proof of Delivery
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {route.origin} → {route.destination}
                        </p>
                    </div>
                </div>
            </div>

            {/* POD List */}
            <div className="p-4 space-y-4">
                {completedStops.length > 0 ? (
                    completedStops.map((stop) => (
                        <div
                            key={stop.id}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden"
                        >
                            {/* Stop Header */}
                            <div className="bg-green-50 dark:bg-green-900/20 px-4 py-3 border-b border-green-200 dark:border-green-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                                            {stop.sequence}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                Stop {stop.sequence}
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                ✓ Completed
                                            </p>
                                        </div>
                                    </div>
                                    {stop.completedAt && (
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                            {new Date(stop.completedAt).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stop Details */}
                            <div className="p-4 space-y-3">
                                {/* Address */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                        Delivery Address
                                    </label>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {stop.address}
                                    </p>
                                </div>

                                {/* Recipient */}
                                {stop.recipientName && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                            Received By
                                        </label>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {stop.recipientName}
                                        </p>
                                        {stop.recipientPhone && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                {stop.recipientPhone}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* POD Photo */}
                                {stop.podPhotoUrl && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                            Photo Evidence
                                        </label>
                                        <a
                                            href={stop.podPhotoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                        >
                                            <img
                                                src={stop.podPhotoUrl}
                                                alt={`POD for Stop ${stop.sequence}`}
                                                className="w-full h-64 object-cover rounded-lg border-2 border-gray-300 dark:border-slate-600 hover:border-green-500 dark:hover:border-green-500 transition-all cursor-pointer"
                                            />
                                            <p className="text-xs text-center text-green-600 dark:text-green-400 mt-2">
                                                📸 Tap to view full size
                                            </p>
                                        </a>
                                    </div>
                                )}

                                {/* Delivery Notes */}
                                {stop.deliveryNotes && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                            Delivery Notes
                                        </label>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {stop.deliveryNotes}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
                        <div className="text-center">
                            <svg
                                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <p className="text-gray-600 dark:text-gray-400 font-medium">
                                No PODs available for this route
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                PODs are uploaded when deliveries are completed
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            {completedStops.length > 0 && (
                <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t dark:border-slate-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Total PODs: <strong className="text-gray-900 dark:text-white">{completedStops.length}</strong>
                        </span>
                        <button
                            onClick={onBack}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
                        >
                            Back to Routes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewPODsScreen;
