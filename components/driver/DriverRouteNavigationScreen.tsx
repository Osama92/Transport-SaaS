/**
 * Driver Route Navigation Screen
 * Shows assigned route with stops in optimized sequence
 * Allows drivers to navigate through stops and update status
 */

import React, { useState, useEffect } from 'react';
import { Route, RouteStop } from '../../types';
import RouteMap from '../route/RouteMap';

interface DriverRouteNavigationScreenProps {
    route: Route;
    onUpdateStopStatus: (stopId: string, status: RouteStop['status'], notes?: string) => void;
    onComplete: () => void;
}

const DriverRouteNavigationScreen: React.FC<DriverRouteNavigationScreenProps> = ({
    route,
    onUpdateStopStatus,
    onComplete
}) => {
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [showMap, setShowMap] = useState(false);
    const [deliveryNotes, setDeliveryNotes] = useState('');

    // Ensure stops is an array
    const stops = Array.isArray(route.stops) ? route.stops : [];

    // If no detailed stops, show message
    if (stops.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Detailed Stops Available
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This route doesn't have detailed stop information yet.
                    </p>
                </div>
            </div>
        );
    }

    const currentStop = stops[currentStopIndex];
    const completedStops = stops.filter(s => s.status === 'completed').length;
    const progressPercentage = (completedStops / stops.length) * 100;

    const handlePrevious = () => {
        if (currentStopIndex > 0) {
            setCurrentStopIndex(currentStopIndex - 1);
            setDeliveryNotes('');
        }
    };

    const handleNext = () => {
        if (currentStopIndex < stops.length - 1) {
            setCurrentStopIndex(currentStopIndex + 1);
            setDeliveryNotes('');
        }
    };

    const handleMarkArrived = () => {
        onUpdateStopStatus(currentStop.id, 'arrived');
    };

    const handleMarkCompleted = () => {
        onUpdateStopStatus(currentStop.id, 'completed', deliveryNotes);
        if (currentStopIndex < stops.length - 1) {
            setTimeout(() => handleNext(), 500);
        }
    };

    const handleMarkFailed = () => {
        const reason = prompt('Enter failure reason:');
        if (reason) {
            onUpdateStopStatus(currentStop.id, 'failed', reason);
            if (currentStopIndex < stops.length - 1) {
                setTimeout(() => handleNext(), 500);
            }
        }
    };

    const openNavigation = () => {
        const { lat, lng } = currentStop.coordinates;
        // Open Google Maps with directions
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    const allStopsCompleted = stops.every(s => s.status === 'completed' || s.status === 'failed');

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow-sm">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                            {route.name || 'Route Navigation'}
                        </h1>
                        <button
                            onClick={() => setShowMap(!showMap)}
                            className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>{completedStops} of {stops.length} stops completed</span>
                            <span>{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Map View (Conditional) */}
            {showMap && (
                <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                    <RouteMap
                        origin={route.originCoordinates || { lat: 0, lng: 0 }}
                        destination={route.destinationCoordinates || { lat: 0, lng: 0 }}
                        stops={stops}
                        height="250px"
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Current Stop Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-4">
                    {/* Stop Header */}
                    <div className={`p-4 ${
                        currentStop.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                        currentStop.status === 'arrived' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        currentStop.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
                        'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-lg shadow-md">
                                    {currentStop.sequence}
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 dark:text-white">
                                        Stop {currentStop.sequence} of {stops.length}
                                    </h2>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {currentStop.status === 'completed' ? '✓ Completed' :
                                         currentStop.status === 'arrived' ? '→ At Location' :
                                         currentStop.status === 'failed' ? '✗ Failed' :
                                         '○ Pending'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={openNavigation}
                                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Stop Details */}
                    <div className="p-4 space-y-4">
                        {/* Address */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                Delivery Address
                            </label>
                            <p className="text-sm text-gray-900 dark:text-white">
                                {currentStop.address}
                            </p>
                        </div>

                        {/* Recipient Info */}
                        {(currentStop.recipientName || currentStop.recipientPhone) && (
                            <div className="grid grid-cols-2 gap-4">
                                {currentStop.recipientName && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                            Recipient
                                        </label>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {currentStop.recipientName}
                                        </p>
                                    </div>
                                )}
                                {currentStop.recipientPhone && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                            Phone
                                        </label>
                                        <a
                                            href={`tel:${currentStop.recipientPhone}`}
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span>{currentStop.recipientPhone}</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Delivery Notes */}
                        {currentStop.deliveryNotes && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                    Delivery Instructions
                                </label>
                                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-900 p-3 rounded-lg">
                                    {currentStop.deliveryNotes}
                                </p>
                            </div>
                        )}

                        {/* Estimated Arrival */}
                        {currentStop.estimatedArrival && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                    Estimated Arrival
                                </label>
                                <p className="text-sm text-gray-900 dark:text-white flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{new Date(currentStop.estimatedArrival).toLocaleTimeString()}</span>
                                </p>
                            </div>
                        )}

                        {/* Action Notes (for current delivery) */}
                        {currentStop.status !== 'completed' && currentStop.status !== 'failed' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                    Delivery Notes (Optional)
                                </label>
                                <textarea
                                    value={deliveryNotes}
                                    onChange={(e) => setDeliveryNotes(e.target.value)}
                                    placeholder="Add any notes about this delivery..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                                />
                            </div>
                        )}

                        {/* Failure Reason (if failed) */}
                        {currentStop.status === 'failed' && currentStop.failureReason && (
                            <div>
                                <label className="block text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1">
                                    Failure Reason
                                </label>
                                <p className="text-sm text-gray-900 dark:text-white bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                    {currentStop.failureReason}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {currentStop.status !== 'completed' && currentStop.status !== 'failed' && (
                        <div className="p-4 bg-gray-50 dark:bg-slate-900 space-y-2">
                            {currentStop.status === 'pending' && (
                                <button
                                    onClick={handleMarkArrived}
                                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md transition-colors"
                                >
                                    Mark as Arrived
                                </button>
                            )}

                            {currentStop.status === 'arrived' && (
                                <>
                                    <button
                                        onClick={handleMarkCompleted}
                                        className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-md transition-colors"
                                    >
                                        ✓ Mark as Completed
                                    </button>
                                    <button
                                        onClick={handleMarkFailed}
                                        className="w-full py-2 px-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                    >
                                        Mark as Failed
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Upcoming Stops Preview */}
                {currentStopIndex < stops.length - 1 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Upcoming Stops
                        </h3>
                        <div className="space-y-2">
                            {stops.slice(currentStopIndex + 1, currentStopIndex + 4).map((stop) => (
                                <div
                                    key={stop.id}
                                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-900"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                        {stop.sequence}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                                            {stop.recipientName || 'No recipient name'}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                            {stop.address}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="bg-white dark:bg-slate-800 border-t dark:border-slate-700 p-4">
                {allStopsCompleted ? (
                    <button
                        onClick={onComplete}
                        className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-md transition-colors flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Complete Route</span>
                    </button>
                ) : (
                    <div className="flex space-x-3">
                        <button
                            onClick={handlePrevious}
                            disabled={currentStopIndex === 0}
                            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Previous</span>
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentStopIndex === stops.length - 1}
                            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                        >
                            <span>Next</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverRouteNavigationScreen;
