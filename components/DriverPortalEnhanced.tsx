import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { startRoute, completeRoute, updateRouteProgress } from '../services/firestore/routes';
import { updateDriver } from '../services/firestore/drivers';
import { updateVehicle } from '../services/firestore/vehicles';
import type { Driver, Route } from '../types';

interface DriverPortalEnhancedProps {
    driver: Driver;
    onLogout: () => void;
}

const DriverPortalEnhanced: React.FC<DriverPortalEnhancedProps> = ({ driver, onLogout }) => {
    const [activeRoute, setActiveRoute] = useState<Route | null>(null);
    const [completedRoutes, setCompletedRoutes] = useState<Route[]>([]);
    const [activeView, setActiveView] = useState<'dashboard' | 'wallet' | 'analytics' | 'payslips' | 'profile'>('dashboard');
    const [loading, setLoading] = useState(true);
    const [progressSlider, setProgressSlider] = useState(0);
    const [updatingProgress, setUpdatingProgress] = useState(false);
    const [showPodModal, setShowPodModal] = useState(false);
    const [podFile, setPodFile] = useState<File | null>(null);
    const [podPreview, setPodPreview] = useState<string | null>(null);
    const [uploadingPod, setUploadingPod] = useState(false);

    // Listen to driver's active route
    useEffect(() => {
        if (!driver?.id) {
            setActiveRoute(null);
            setLoading(false);
            return;
        }

        if (!driver.currentRouteId) {
            setActiveRoute(null);
            setLoading(false);
            return;
        }

        const routesRef = collection(db, 'routes');
        const q = query(routesRef, where('assignedDriverId', '==', driver.id), where('status', '!=', 'Completed'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const routeDoc = snapshot.docs[0];
                const newRoute = {
                    id: routeDoc.id,
                    ...routeDoc.data()
                } as Route;
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
        if (!driver?.id) {
            setCompletedRoutes([]);
            return;
        }

        const fetchCompletedRoutes = async () => {
            try {
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
            } catch (error) {
                console.error('Error fetching completed routes:', error);
                setCompletedRoutes([]);
            }
        };

        fetchCompletedRoutes();
    }, [driver?.id]);

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
                await completeRoute(activeRoute.id);

                if (driver?.id) {
                    await updateDriver(driver.id, {
                        status: 'Idle',
                        currentRouteId: undefined,
                        currentRouteStatus: undefined
                    });
                }

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
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                    <p className="text-white font-semibold">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Modern Header with Gradient */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-6 shadow-2xl">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                            <span className="text-2xl font-bold">{driver.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">Welcome back!</h1>
                            <p className="text-sm text-purple-100">{driver.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200"
                        title="Logout"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
                {activeView === 'dashboard' && (
                    <>
                        {/* Active Route Card - Inspired by delivery apps */}
                        {activeRoute ? (
                            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                                {/* Route Header */}
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold flex items-center gap-2">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                Active Delivery
                                            </h2>
                                            <p className="text-sm text-emerald-100 mt-1">#{activeRoute.id.slice(0, 8)}</p>
                                        </div>
                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                            activeRoute.status === 'Pending'
                                                ? 'bg-yellow-400 text-yellow-900'
                                                : 'bg-white text-emerald-600'
                                        }`}>
                                            {activeRoute.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Route Timeline */}
                                    <div className="relative pl-8">
                                        {/* Origin */}
                                        <div className="relative">
                                            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-blue-100"></div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Pickup</p>
                                            <p className="font-semibold text-gray-900">{activeRoute.origin}</p>
                                        </div>

                                        {/* Connecting Line */}
                                        <div className="absolute left-[7px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-500 to-emerald-500"></div>

                                        {/* Destination */}
                                        <div className="relative mt-6">
                                            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-emerald-100"></div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Dropoff</p>
                                            <p className="font-semibold text-gray-900">{activeRoute.destination}</p>
                                        </div>
                                    </div>

                                    {/* Route Info Cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                                            <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Vehicle</p>
                                            <p className="font-bold text-gray-900">{activeRoute.vehicle || 'N/A'}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                                            <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Distance</p>
                                            <p className="font-bold text-gray-900">{activeRoute.distanceKm} km</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="bg-gray-50 rounded-2xl p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-semibold text-gray-700">Delivery Progress</span>
                                            <span className="text-lg font-bold text-indigo-600">{activeRoute.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out"
                                                style={{ width: `${activeRoute.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Progress Update Slider */}
                                    {activeRoute.status === 'In Progress' && (
                                        <div className="border-t border-gray-100 pt-5">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Update Progress: <span className="text-indigo-600">{progressSlider}%</span>
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={progressSlider}
                                                    onChange={(e) => setProgressSlider(Number(e.target.value))}
                                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                    style={{
                                                        background: `linear-gradient(to right, rgb(79 70 229) 0%, rgb(79 70 229) ${progressSlider}%, rgb(229 231 235) ${progressSlider}%, rgb(229 231 235) 100%)`
                                                    }}
                                                />
                                                <button
                                                    onClick={handleUpdateProgress}
                                                    disabled={updatingProgress || progressSlider === activeRoute.progress}
                                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
                                                >
                                                    {updatingProgress ? 'Updating...' : 'Update'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3 pt-2">
                                        <button
                                            onClick={handleGetDirections}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                            </svg>
                                            Get Directions
                                        </button>

                                        {activeRoute.status === 'Pending' && (
                                            <button
                                                onClick={handleStartRoute}
                                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Start Delivery
                                            </button>
                                        )}
                                        {activeRoute.status === 'In Progress' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setShowPodModal(true)}
                                                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    Upload POD
                                                </button>
                                                <button
                                                    onClick={handleCompleteRoute}
                                                    className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Complete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-gray-100">
                                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Delivery</h3>
                                <p className="text-gray-600">You're all set! New deliveries will appear here.</p>
                            </div>
                        )}

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl p-6 text-white">
                                <p className="text-sm font-semibold opacity-90 mb-2">Completed</p>
                                <p className="text-4xl font-bold mb-1">{completedRoutes.length}</p>
                                <p className="text-xs opacity-75">Total deliveries</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl p-6 text-white">
                                <p className="text-sm font-semibold opacity-90 mb-2">Status</p>
                                <p className="text-2xl font-bold mb-1">{driver.status}</p>
                                <p className="text-xs opacity-75">Current status</p>
                            </div>
                        </div>
                    </>
                )}

                {activeView === 'wallet' && (
                    <div className="space-y-6">
                        {/* Wallet Balance Card */}
                        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-sm font-semibold opacity-90 mb-1">Available Balance</p>
                                        <h2 className="text-5xl font-bold">₦{(driver.walletBalance || 0).toLocaleString()}</h2>
                                    </div>
                                    <svg className="w-16 h-16 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                </div>
                                <p className="text-sm opacity-90">Ready for withdrawal</p>
                            </div>
                        </div>

                        {/* Withdrawal Button */}
                        <button
                            onClick={() => alert('💡 Withdrawal feature coming soon!\n\nYou will be able to:\n• Request instant withdrawals\n• View transaction history\n• Set up automatic payouts\n\nFor now, contact your transporter for payment.')}
                            className="w-full bg-white hover:bg-gray-50 text-orange-600 font-bold py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 border-2 border-orange-100 relative overflow-hidden group"
                        >
                            <div className="absolute top-2 right-2">
                                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">Coming Soon</span>
                            </div>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-lg">Request Withdrawal</span>
                        </button>

                        {/* Payment History Placeholder */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-5">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Payment History
                                </h2>
                                <p className="text-sm text-blue-100 mt-1">Recent transactions</p>
                            </div>
                            <div className="p-12 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 font-medium">No payment history yet</p>
                                <p className="text-sm text-gray-400 mt-2">Your payment transactions will appear here</p>
                                <div className="mt-4">
                                    <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">Feature in development</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'analytics' && (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Completion Rate</p>
                                </div>
                                <p className="text-4xl font-bold text-gray-900">{completedRoutes.length > 0 ? '100' : '0'}%</p>
                                <p className="text-xs text-green-600 mt-2 font-semibold">{completedRoutes.length} completed</p>
                            </div>
                            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">On-Time</p>
                                </div>
                                <p className="text-4xl font-bold text-gray-900">
                                    {completedRoutes.length > 0
                                        ? Math.round((completedRoutes.filter(r => {
                                            if (!r.estimatedArrivalTime || !r.actualArrivalTime) return false;
                                            return new Date(r.actualArrivalTime) <= new Date(r.estimatedArrivalTime);
                                        }).length / completedRoutes.length) * 100)
                                        : 0}%
                                </p>
                                <p className="text-xs text-blue-600 mt-2 font-semibold">Delivery rate</p>
                            </div>
                        </div>

                        {/* Total Distance Card */}
                        <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-sm font-semibold opacity-90 mb-2">Total Distance Covered</p>
                                    <h2 className="text-5xl font-bold">{completedRoutes.reduce((total, route) => total + (route.distanceKm || 0), 0).toLocaleString()} km</h2>
                                </div>
                                <svg className="w-16 h-16 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <p className="text-sm opacity-90">Across {completedRoutes.length} deliveries</p>
                        </div>

                        {/* Performance Metrics */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-5">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Performance Metrics
                                </h2>
                                <p className="text-sm text-orange-100 mt-1">Your delivery statistics</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-gray-600 font-medium">Total Deliveries</span>
                                    <span className="font-bold text-gray-900 text-lg">{completedRoutes.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-gray-600 font-medium">Avg Distance/Route</span>
                                    <span className="font-bold text-gray-900 text-lg">
                                        {completedRoutes.length > 0
                                            ? Math.round(completedRoutes.reduce((total, route) => total + (route.distanceKm || 0), 0) / completedRoutes.length)
                                            : 0} km
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                                    <span className="text-gray-600 font-medium">On-Time Deliveries</span>
                                    <span className="font-bold text-green-600 text-lg">
                                        {completedRoutes.filter(r => {
                                            if (!r.estimatedArrivalTime || !r.actualArrivalTime) return false;
                                            return new Date(r.actualArrivalTime) <= new Date(r.estimatedArrivalTime);
                                        }).length} / {completedRoutes.length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100">
                                    <span className="text-gray-600 font-medium">Late Deliveries</span>
                                    <span className="font-bold text-red-600 text-lg">
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
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-5">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                My Payslips
                            </h2>
                            <p className="text-sm text-indigo-100 mt-1">View your payment history</p>
                        </div>
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No Payslips Available</h3>
                            <p className="text-gray-600 mb-4">Your payslips will appear here once processed by your transporter</p>
                            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mt-6">
                                <p className="text-sm text-purple-800 font-semibold">💡 Coming Soon</p>
                                <p className="text-xs text-purple-600 mt-1">View, download, and manage your payslips</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'profile' && (
                    <div className="space-y-6">
                        {/* Profile Header Card */}
                        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl p-8 text-white text-center">
                            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
                                <span className="text-4xl font-bold">{driver.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-1">{driver.name}</h2>
                            <p className="text-purple-100 text-sm">{driver.licenseNumber}</p>
                        </div>

                        {/* Profile Details */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-gray-600 font-medium">License Number</span>
                                    <span className="font-bold text-gray-900">{driver.licenseNumber}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-gray-600 font-medium">Phone</span>
                                    <span className="font-bold text-gray-900">{driver.phone}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                                    <span className="text-gray-600 font-medium">Status</span>
                                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                                        driver.status === 'On-route'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                    }`}>
                                        {driver.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modern Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl pb-safe">
                <div className="grid grid-cols-5 max-w-4xl mx-auto">
                    {[
                        { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home' },
                        { id: 'wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Wallet' },
                        { id: 'analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Stats' },
                        { id: 'payslips', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Pay' },
                        { id: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Profile' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as any)}
                            className={`flex flex-col items-center justify-center py-3 transition-all ${
                                activeView === item.id
                                    ? 'text-indigo-600'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <svg className={`w-6 h-6 mb-1 transition-transform ${activeView === item.id ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeView === item.id ? 2.5 : 2} d={item.icon} />
                            </svg>
                            <span className={`text-xs font-semibold ${activeView === item.id ? 'font-bold' : ''}`}>{item.label}</span>
                            {activeView === item.id && (
                                <div className="absolute bottom-0 w-12 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* POD Upload Modal */}
            {showPodModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-5 rounded-t-3xl">
                            <h2 className="text-xl font-bold">Upload Proof of Delivery</h2>
                            <p className="text-sm text-purple-100 mt-1">Take or upload a photo</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Select Image
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePodFileChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    📸 On mobile, you can take a photo directly
                                </p>
                            </div>

                            {podPreview && (
                                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
                                    <img
                                        src={podPreview}
                                        alt="POD Preview"
                                        className="w-full h-64 object-cover"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowPodModal(false);
                                        setPodFile(null);
                                        setPodPreview(null);
                                    }}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadPod}
                                    disabled={!podFile || uploadingPod}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-2xl transition-all shadow-lg"
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

export default DriverPortalEnhanced;
