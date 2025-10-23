import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { startRoute, completeRoute, updateRouteProgress } from '../services/firestore/routes';
import { updateDriver } from '../services/firestore/drivers';
import { updateVehicle } from '../services/firestore/vehicles';
import type { Driver, Route, Payslip } from '../types';

interface DriverPortalProps {
    driver: Driver;
    onLogout: () => void;
}

const DriverPortal: React.FC<DriverPortalProps> = ({ driver, onLogout }) => {
    const [activeRoute, setActiveRoute] = useState<Route | null>(null);
    const [completedRoutes, setCompletedRoutes] = useState<Route[]>([]);
    const [activeView, setActiveView] = useState<'dashboard' | 'history' | 'wallet' | 'analytics' | 'payslips' | 'profile'>('dashboard');
    const [loading, setLoading] = useState(true);
    const [progressSlider, setProgressSlider] = useState(0);
    const [updatingProgress, setUpdatingProgress] = useState(false);
    const [showPodModal, setShowPodModal] = useState(false);
    const [podFile, setPodFile] = useState<File | null>(null);
    const [podPreview, setPodPreview] = useState<string | null>(null);
    const [uploadingPod, setUploadingPod] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');

    // Listen to driver's active route
    useEffect(() => {
        // Check if driver.id exists
        if (!driver?.id) {
            setActiveRoute(null);
            setLoading(false);
            return;
        }

        // If no current route, don't query
        if (!driver.currentRouteId) {
            setActiveRoute(null);
            setLoading(false);
            return;
        }

        const routesRef = collection(db, 'routes');
        // Query using assignedDriverId (which is set during route assignment)
        const q = query(routesRef, where('assignedDriverId', '==', driver.id), where('status', '!=', 'Completed'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const routeDoc = snapshot.docs[0];
                const newRoute = {
                    id: routeDoc.id,
                    ...routeDoc.data()
                } as Route;

                // Check if this is a new route assignment (different from current)
                if (activeRoute && activeRoute.id !== newRoute.id) {
                    setNotificationMessage(`New route assigned: ${newRoute.origin} → ${newRoute.destination}`);
                    setShowNotification(true);
                    setTimeout(() => setShowNotification(false), 5000);
                } else if (!activeRoute && newRoute) {
                    // First route assignment
                    setNotificationMessage(`Route assigned: ${newRoute.origin} → ${newRoute.destination}`);
                    setShowNotification(true);
                    setTimeout(() => setShowNotification(false), 5000);
                }

                setActiveRoute(newRoute);
            } else {
                setActiveRoute(null);
            }
            setLoading(false);
        }, (error) => {
            console.error('Error fetching active route:', error);
            setActiveRoute(null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [driver?.id, driver?.currentRouteId]);

    // Fetch completed routes
    useEffect(() => {
        // Check if driver.id exists
        if (!driver?.id) {
            setCompletedRoutes([]);
            return;
        }

        const fetchCompletedRoutes = async () => {
            try {
                const routesRef = collection(db, 'routes');
                // Query using assignedDriverId (which is set during route assignment)
                const q = query(
                    routesRef,
                    where('assignedDriverId', '==', driver.id),
                    where('status', '==', 'Completed')
                );
                const snapshot = await getDocs(q);
                const routes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Route));
                setCompletedRoutes(routes.slice(0, 10)); // Last 10 routes
            } catch (error) {
                console.error('Error fetching completed routes:', error);
                setCompletedRoutes([]);
            }
        };

        fetchCompletedRoutes();
    }, [driver?.id]);

    // Sync progress slider with active route
    useEffect(() => {
        if (activeRoute) {
            setProgressSlider(activeRoute.progress || 0);
        }
    }, [activeRoute]);

    const handleUpdateProgress = async () => {
        if (activeRoute && !updatingProgress) {
            setUpdatingProgress(true);
            try {
                await updateRouteProgress(activeRoute.id, progressSlider);
                // The onSnapshot listener will update activeRoute automatically
            } catch (error) {
                console.error('Error updating progress:', error);
                alert('Failed to update progress. Please try again.');
            } finally {
                setUpdatingProgress(false);
            }
        }
    };

    const handleGetDirections = () => {
        if (activeRoute) {
            // Open Google Maps with directions from origin to destination
            const origin = encodeURIComponent(activeRoute.origin);
            const destination = encodeURIComponent(activeRoute.destination);
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
            window.open(mapsUrl, '_blank');
        }
    };

    const handlePodFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPodFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPodPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadPod = async () => {
        if (!podFile || !activeRoute) return;

        setUploadingPod(true);
        try {
            // For now, we'll just simulate upload and store the preview URL
            // In production, you would upload to Firebase Storage
            alert('POD uploaded successfully! (Note: In production, this would upload to Firebase Storage)');
            setShowPodModal(false);
            setPodFile(null);
            setPodPreview(null);
        } catch (error) {
            console.error('Error uploading POD:', error);
            alert('Failed to upload POD. Please try again.');
        } finally {
            setUploadingPod(false);
        }
    };

    const handleStartRoute = async () => {
        if (activeRoute) {
            try {
                await startRoute(activeRoute.id);
                alert('Route started! Safe travels.');
            } catch (error) {
                alert('Failed to start route. Please try again.');
            }
        }
    };

    const handleCompleteRoute = async () => {
        if (activeRoute && confirm('Are you sure you want to complete this route?')) {
            try {
                // Complete the route
                await completeRoute(activeRoute.id);

                // Update driver status to Idle and clear current route
                if (driver?.id) {
                    await updateDriver(driver.id, {
                        status: 'Idle',
                        currentRouteId: undefined,
                        currentRouteStatus: undefined
                    });
                }

                // Update vehicle status to Parked and clear current route
                if (activeRoute.assignedVehicleId || activeRoute.vehicleId) {
                    const vehicleId = activeRoute.assignedVehicleId || activeRoute.vehicleId;
                    await updateVehicle(vehicleId!, {
                        status: 'Parked',
                        currentRouteId: undefined,
                        currentRouteStatus: undefined
                    });
                }

                alert('Route completed successfully!');
                setActiveRoute(null);

                // Refetch completed routes to include the newly completed one
                if (driver?.id) {
                    const routesRef = collection(db, 'routes');
                    const q = query(
                        routesRef,
                        where('assignedDriverId', '==', driver.id),
                        where('status', '==', 'Completed')
                    );
                    const snapshot = await getDocs(q);
                    const routes = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Route));
                    setCompletedRoutes(routes.slice(0, 10));
                }
            } catch (error) {
                console.error('Error completing route:', error);
                alert('Failed to complete route. Please try again.');
            }
        }
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('driverSession');
            onLogout();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Notification Banner */}
            {showNotification && (
                <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-4 shadow-lg">
                        <div className="max-w-4xl mx-auto flex items-center gap-3">
                            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="flex-1 font-semibold">{notificationMessage}</p>
                            <button
                                onClick={() => setShowNotification(false)}
                                className="p-1 hover:bg-white/20 rounded transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-6 shadow-lg">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="text-xl font-bold">{driver.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">{driver.name}</h1>
                            <p className="text-sm text-blue-100">{driver.licenseNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {activeView === 'dashboard' && (
                    <>
                        {/* Active Route Card */}
                        {activeRoute ? (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        Active Route
                                    </h2>
                                    <p className="text-sm text-green-100 mt-1">{activeRoute.id}</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Route Details */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase mb-1">From</p>
                                            <p className="font-semibold text-gray-900">{activeRoute.origin}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase mb-1">To</p>
                                            <p className="font-semibold text-gray-900">{activeRoute.destination}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase mb-1">Vehicle</p>
                                            <p className="font-semibold text-gray-900">{activeRoute.vehicle || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase mb-1">Distance</p>
                                            <p className="font-semibold text-gray-900">{activeRoute.distanceKm} km</p>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-600">Progress</span>
                                            <span className="text-sm font-semibold text-blue-600">{activeRoute.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
                                                style={{ width: `${activeRoute.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Progress Update Slider (only show if route is In Progress) */}
                                    {activeRoute.status === 'In Progress' && (
                                        <div className="border-t pt-4 mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Update Progress: {progressSlider}%
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={progressSlider}
                                                    onChange={(e) => setProgressSlider(Number(e.target.value))}
                                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                />
                                                <button
                                                    onClick={handleUpdateProgress}
                                                    disabled={updatingProgress || progressSlider === activeRoute.progress}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                                                >
                                                    {updatingProgress ? 'Updating...' : 'Update'}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Slide to update your delivery progress
                                            </p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3 pt-2">
                                        {/* Navigation Button - Always visible */}
                                        <button
                                            onClick={handleGetDirections}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                            </svg>
                                            Get Directions
                                        </button>

                                        {/* Status-specific buttons */}
                                        {activeRoute.status === 'Pending' && (
                                            <button
                                                onClick={handleStartRoute}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Start Route
                                            </button>
                                        )}
                                        {activeRoute.status === 'In Progress' && (
                                            <>
                                                <button
                                                    onClick={() => setShowPodModal(true)}
                                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    Upload Proof of Delivery
                                                </button>
                                                <button
                                                    onClick={handleCompleteRoute}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Complete Route
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Route</h3>
                                <p className="text-gray-600">You don't have any active routes assigned yet.</p>
                            </div>
                        )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl shadow p-4">
                                <p className="text-xs text-gray-500 uppercase mb-1">Completed</p>
                                <p className="text-2xl font-bold text-gray-900">{completedRoutes.length}</p>
                                <p className="text-xs text-green-600 mt-1">Total routes</p>
                            </div>
                            <div className="bg-white rounded-xl shadow p-4">
                                <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                                <p className="text-2xl font-bold text-gray-900">{driver.status}</p>
                                <p className="text-xs text-blue-600 mt-1">Current</p>
                            </div>
                        </div>
                    </>
                )}

                {activeView === 'history' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-4">
                            <h2 className="text-xl font-bold">Route History</h2>
                            <p className="text-sm text-purple-100 mt-1">Last 10 completed routes</p>
                        </div>
                        <div className="divide-y">
                            {completedRoutes.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No completed routes yet
                                </div>
                            ) : (
                                completedRoutes.map((route) => (
                                    <div key={route.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-gray-900">{route.origin} → {route.destination}</p>
                                                <p className="text-xs text-gray-500 mt-1">{route.id}</p>
                                            </div>
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                Completed
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'wallet' && (
                    <div className="space-y-6">
                        {/* Wallet Balance Card */}
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">Wallet Balance</h2>
                                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <p className="text-4xl font-bold mb-2">
                                ₦{(driver.walletBalance || 0).toLocaleString()}
                            </p>
                            <p className="text-green-100 text-sm">Available for withdrawal</p>
                        </div>

                        {/* Withdrawal Button */}
                        <button
                            onClick={() => alert('Withdrawal feature coming soon! Contact your transporter for payment.')}
                            className="w-full bg-white hover:bg-gray-50 text-green-600 font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Request Withdrawal
                        </button>

                        {/* Recent Transactions */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4">
                                <h2 className="text-xl font-bold">Recent Payments</h2>
                                <p className="text-sm text-blue-100 mt-1">Last 10 payments received</p>
                            </div>
                            <div className="divide-y max-h-96 overflow-y-auto">
                                <div className="p-8 text-center text-gray-500">
                                    No payment history yet
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'analytics' && (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl shadow-lg p-4">
                                <p className="text-xs text-gray-500 uppercase mb-1">Completion Rate</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {completedRoutes.length > 0 ? '100' : '0'}%
                                </p>
                                <p className="text-xs text-green-600 mt-1">{completedRoutes.length} completed</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg p-4">
                                <p className="text-xs text-gray-500 uppercase mb-1">On-Time Delivery</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {completedRoutes.length > 0
                                        ? Math.round((completedRoutes.filter(r => {
                                            if (!r.estimatedArrivalTime || !r.actualArrivalTime) return false;
                                            return new Date(r.actualArrivalTime) <= new Date(r.estimatedArrivalTime);
                                        }).length / completedRoutes.length) * 100)
                                        : 0}%
                                </p>
                                <p className="text-xs text-blue-600 mt-1">Delivered on time</p>
                            </div>
                        </div>

                        {/* Total Distance Card */}
                        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">Total Distance</h2>
                                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <p className="text-4xl font-bold mb-2">
                                {completedRoutes.reduce((total, route) => total + (route.distanceKm || 0), 0).toLocaleString()} km
                            </p>
                            <p className="text-purple-100 text-sm">Across {completedRoutes.length} routes</p>
                        </div>

                        {/* Performance Stats */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-4">
                                <h2 className="text-xl font-bold">Performance Metrics</h2>
                                <p className="text-sm text-orange-100 mt-1">Your delivery statistics</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Total Routes Completed</span>
                                    <span className="font-bold text-gray-900">{completedRoutes.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Average Distance per Route</span>
                                    <span className="font-bold text-gray-900">
                                        {completedRoutes.length > 0
                                            ? Math.round(completedRoutes.reduce((total, route) => total + (route.distanceKm || 0), 0) / completedRoutes.length)
                                            : 0} km
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">On-Time Deliveries</span>
                                    <span className="font-bold text-green-600">
                                        {completedRoutes.filter(r => {
                                            if (!r.estimatedArrivalTime || !r.actualArrivalTime) return false;
                                            return new Date(r.actualArrivalTime) <= new Date(r.estimatedArrivalTime);
                                        }).length} / {completedRoutes.length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Late Deliveries</span>
                                    <span className="font-bold text-red-600">
                                        {completedRoutes.filter(r => {
                                            if (!r.estimatedArrivalTime || !r.actualArrivalTime) return false;
                                            return new Date(r.actualArrivalTime) > new Date(r.estimatedArrivalTime);
                                        }).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'payslips' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4">
                            <h2 className="text-xl font-bold">My Payslips</h2>
                            <p className="text-sm text-indigo-100 mt-1">View your payment history</p>
                        </div>
                        <div className="divide-y">
                            <div className="p-8 text-center text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-600 font-medium mb-2">No payslips available</p>
                                <p className="text-sm text-gray-500">Your payslips will appear here once processed by your transporter</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'profile' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-6 py-4">
                            <h2 className="text-xl font-bold">My Profile</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Name</p>
                                <p className="font-semibold text-gray-900">{driver.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">License Number</p>
                                <p className="font-semibold text-gray-900">{driver.licenseNumber}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Phone</p>
                                <p className="font-semibold text-gray-900">{driver.phone}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                    driver.status === 'On-route'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {driver.status}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
                <div className="grid grid-cols-5 max-w-4xl mx-auto">
                    <button
                        onClick={() => setActiveView('dashboard')}
                        className={`flex flex-col items-center justify-center py-2 ${
                            activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-xs mt-1">Home</span>
                    </button>
                    <button
                        onClick={() => setActiveView('wallet')}
                        className={`flex flex-col items-center justify-center py-2 ${
                            activeView === 'wallet' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="text-xs mt-1">Wallet</span>
                    </button>
                    <button
                        onClick={() => setActiveView('analytics')}
                        className={`flex flex-col items-center justify-center py-2 ${
                            activeView === 'analytics' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-xs mt-1">Analytics</span>
                    </button>
                    <button
                        onClick={() => setActiveView('payslips')}
                        className={`flex flex-col items-center justify-center py-2 ${
                            activeView === 'payslips' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs mt-1">Payslips</span>
                    </button>
                    <button
                        onClick={() => setActiveView('profile')}
                        className={`flex flex-col items-center justify-center py-2 ${
                            activeView === 'profile' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs mt-1">Profile</span>
                    </button>
                </div>
            </div>

            {/* POD Upload Modal */}
            {showPodModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-t-xl">
                            <h2 className="text-xl font-bold">Upload Proof of Delivery</h2>
                            <p className="text-sm text-purple-100 mt-1">Take or upload a photo</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* File Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Image
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePodFileChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    On mobile, you can take a photo directly
                                </p>
                            </div>

                            {/* Image Preview */}
                            {podPreview && (
                                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                                    <img
                                        src={podPreview}
                                        alt="POD Preview"
                                        className="w-full h-64 object-cover"
                                    />
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowPodModal(false);
                                        setPodFile(null);
                                        setPodPreview(null);
                                    }}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadPod}
                                    disabled={!podFile || uploadingPod}
                                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                                >
                                    {uploadingPod ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverPortal;
