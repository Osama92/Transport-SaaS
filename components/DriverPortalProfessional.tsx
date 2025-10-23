import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { startRoute, completeRoute, updateRouteProgress } from '../services/firestore/routes';
import { updateDriver } from '../services/firestore/drivers';
import { updateVehicle } from '../services/firestore/vehicles';
import { getPayslipsByDriver } from '../services/firestore/payroll';
import type { Driver, Route, Payslip } from '../types';

interface DriverPortalProfessionalProps {
    driver: Driver;
    onLogout: () => void;
}

const DriverPortalProfessional: React.FC<DriverPortalProfessionalProps> = ({ driver, onLogout }) => {
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
    const [walletBalance, setWalletBalance] = useState(driver.walletBalance || 0);
    const [payslips, setPayslips] = useState<any[]>([]);

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

    // Listen to driver's wallet balance in real-time
    useEffect(() => {
        console.log('[DRIVER PORTAL DEBUG] Setting up wallet balance listener');
        console.log('[DRIVER PORTAL DEBUG] Driver ID:', driver?.id);
        console.log('[DRIVER PORTAL DEBUG] Driver object:', driver);

        if (!driver?.id) {
            console.log('[DRIVER PORTAL DEBUG] No driver ID, skipping wallet listener');
            return;
        }

        // Listen to the specific driver document by its ID
        const driverDocRef = doc(db, 'drivers', driver.id);
        console.log('[DRIVER PORTAL DEBUG] Listening to driver document:', driver.id);

        const unsubscribe = onSnapshot(driverDocRef, (docSnap) => {
            console.log('[DRIVER PORTAL DEBUG] Wallet listener snapshot received');
            console.log('[DRIVER PORTAL DEBUG] Document exists:', docSnap.exists());

            if (docSnap.exists()) {
                const driverData = docSnap.data();
                console.log('[DRIVER PORTAL DEBUG] Driver data:', driverData);
                console.log('[DRIVER PORTAL DEBUG] Wallet balance from Firestore:', driverData.walletBalance);
                setWalletBalance(driverData.walletBalance || 0);
            } else {
                console.log('[DRIVER PORTAL DEBUG] Driver document does not exist!');
            }
        }, (error) => {
            console.error('[DRIVER PORTAL DEBUG] Error listening to driver wallet balance:', error);
        });

        return () => {
            console.log('[DRIVER PORTAL DEBUG] Cleaning up wallet balance listener');
            unsubscribe();
        };
    }, [driver?.id]);

    // Fetch driver's payslips
    useEffect(() => {
        console.log('[DRIVER PORTAL DEBUG] Setting up payslips fetcher');
        console.log('[DRIVER PORTAL DEBUG] Driver ID for payslips:', driver?.id);
        console.log('[DRIVER PORTAL DEBUG] Organization ID for payslips:', driver?.organizationId);

        if (!driver?.id) {
            console.log('[DRIVER PORTAL DEBUG] No driver ID, clearing payslips');
            setPayslips([]);
            return;
        }

        const fetchPayslips = async () => {
            try {
                // Get organization ID from driver
                const organizationId = driver.organizationId;
                console.log('[DRIVER PORTAL DEBUG] Fetching payslips for org:', organizationId);

                if (!organizationId) {
                    console.log('[DRIVER PORTAL DEBUG] No organization ID, skipping payslips fetch');
                    return;
                }

                const driverPayslips = await getPayslipsByDriver(organizationId, driver.id);
                console.log('[DRIVER PORTAL DEBUG] Payslips fetched:', driverPayslips);
                console.log('[DRIVER PORTAL DEBUG] Number of payslips:', driverPayslips.length);
                setPayslips(driverPayslips);
            } catch (error) {
                console.error('[DRIVER PORTAL DEBUG] Error fetching payslips:', error);
                setPayslips([]);
            }
        };

        fetchPayslips();
    }, [driver?.id, driver?.organizationId]);

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
            <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                    <p className="text-white font-semibold">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Clean Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {driver.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Welcome back!</h1>
                                <p className="text-sm text-gray-600">{driver.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
                {activeView === 'dashboard' && (
                    <div className="space-y-4">
                        {/* Active Route Card */}
                        {activeRoute ? (
                            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                                {/* Route Header */}
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                <h2 className="text-lg font-bold text-white">Active Delivery</h2>
                                            </div>
                                            <p className="text-sm text-emerald-100 mt-0.5">#RTE-{activeRoute.id.slice(-4)}</p>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                            activeRoute.status === 'Pending'
                                                ? 'bg-yellow-400 text-yellow-900'
                                                : 'bg-white text-emerald-600'
                                        }`}>
                                            {activeRoute.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 space-y-5">
                                    {/* Route - Clean Timeline */}
                                    <div className="space-y-4">
                                        {/* Pickup */}
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pickup</p>
                                                <p className="text-base font-semibold text-gray-900">{activeRoute.origin}</p>
                                            </div>
                                        </div>

                                        {/* Dropoff */}
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Dropoff</p>
                                                <p className="text-base font-semibold text-gray-900">{activeRoute.destination}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vehicle & Distance */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Vehicle</p>
                                            <p className="font-bold text-gray-900 text-sm">{activeRoute.vehicle || 'N/A'}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Distance</p>
                                            <p className="font-bold text-gray-900 text-sm">{activeRoute.distanceKm} km</p>
                                        </div>
                                    </div>

                                    {/* Progress Section - Only show when In Progress */}
                                    {activeRoute.status === 'In Progress' && (
                                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-sm font-semibold text-gray-700">Update Delivery Progress</span>
                                                <span className="text-2xl font-bold text-indigo-600">{progressSlider}%</span>
                                            </div>

                                            {/* Progress Bar Visual */}
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progressSlider}%` }}
                                                ></div>
                                            </div>

                                            {/* Slider + Update Button */}
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={progressSlider}
                                                    onChange={(e) => setProgressSlider(Number(e.target.value))}
                                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                                <button
                                                    onClick={handleUpdateProgress}
                                                    disabled={updatingProgress || progressSlider === activeRoute.progress}
                                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-bold rounded-lg transition-all disabled:cursor-not-allowed"
                                                >
                                                    {updatingProgress ? 'Updating...' : 'Update'}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2">💡 Slide to update your delivery progress</p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-3 pt-2">
                                        <button
                                            onClick={handleGetDirections}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                            </svg>
                                            Get Directions
                                        </button>

                                        {activeRoute.status === 'Pending' && (
                                            <button
                                                onClick={handleStartRoute}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
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
                                                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    Upload POD
                                                </button>
                                                <button
                                                    onClick={handleCompleteRoute}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
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
                            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Delivery</h3>
                                <p className="text-gray-600 text-sm">You're all set! New deliveries will appear here.</p>
                            </div>
                        )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl shadow-md p-5">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Completed</p>
                                <p className="text-3xl font-bold text-gray-900 mb-1">{completedRoutes.length}</p>
                                <p className="text-xs text-gray-600">Total deliveries</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-md p-5">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Status</p>
                                <p className="text-lg font-bold text-gray-900 mb-1">{driver.status}</p>
                                <p className="text-xs text-gray-600">Current status</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'wallet' && (
                    <div className="space-y-4">
                        {/* Wallet Balance */}
                        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white">
                            <p className="text-sm font-semibold opacity-90 mb-1">Available Balance</p>
                            <h2 className="text-4xl font-bold mb-3">₦{walletBalance.toLocaleString()}</h2>
                            <p className="text-sm opacity-90">Ready for withdrawal</p>
                        </div>

                        {/* Withdrawal Button */}
                        <button
                            onClick={() => alert('💡 Withdrawal feature coming soon!\n\nYou will be able to:\n• Request instant withdrawals\n• View transaction history\n• Set up automatic payouts')}
                            className="w-full bg-white hover:bg-gray-50 text-orange-600 font-semibold py-4 rounded-xl transition-all border-2 border-orange-200 relative"
                        >
                            <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">Coming Soon</span>
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Request Withdrawal
                            </div>
                        </button>

                        {/* Payment History */}
                        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                            <div className="bg-indigo-600 px-5 py-4 text-white">
                                <h2 className="text-lg font-bold">Payment History</h2>
                                <p className="text-sm text-indigo-100">Recent transactions</p>
                            </div>
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 font-medium text-sm">No payment history yet</p>
                                <p className="text-xs text-gray-400 mt-1">Transactions will appear here</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'analytics' && (
                    <div className="space-y-4">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl shadow-md p-5">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Completion</p>
                                <p className="text-3xl font-bold text-gray-900">{completedRoutes.length > 0 ? '100' : '0'}%</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-md p-5">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">On-Time</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {completedRoutes.length > 0
                                        ? Math.round((completedRoutes.filter(r => {
                                            if (!r.estimatedArrivalTime || !r.actualArrivalTime) return false;
                                            return new Date(r.actualArrivalTime) <= new Date(r.estimatedArrivalTime);
                                        }).length / completedRoutes.length) * 100)
                                        : 0}%
                                </p>
                            </div>
                        </div>

                        {/* Total Distance */}
                        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
                            <p className="text-sm font-semibold opacity-90 mb-1">Total Distance</p>
                            <h2 className="text-4xl font-bold mb-2">{completedRoutes.reduce((total, route) => total + (route.distanceKm || 0), 0).toLocaleString()} km</h2>
                            <p className="text-sm opacity-90">Across {completedRoutes.length} deliveries</p>
                        </div>
                    </div>
                )}

                {activeView === 'payslips' && (
                    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                        <div className="bg-indigo-600 px-5 py-4 text-white">
                            <h2 className="text-lg font-bold">My Payslips</h2>
                            <p className="text-sm text-indigo-100">View payment history</p>
                        </div>
                        {payslips.length > 0 ? (
                            <div className="p-4 space-y-3">
                                {payslips.map((payslip) => {
                                    // Calculate total deductions
                                    const totalDeductions = (payslip.tax || 0) + (payslip.pension || 0) + (payslip.nhf || 0);

                                    return (
                                        <div key={payslip.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900">
                                                        {payslip.payPeriod}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">Payment Date: {new Date(payslip.payDate).toLocaleDateString('en-NG')}</p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    payslip.status === 'Paid'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {payslip.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                <div className="bg-gray-50 rounded-lg p-2.5">
                                                    <p className="text-xs text-gray-500 mb-0.5">Gross Pay</p>
                                                    <p className="text-sm font-bold text-gray-900">₦{(payslip.grossPay || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-red-50 rounded-lg p-2.5">
                                                    <p className="text-xs text-red-600 mb-0.5">Deductions</p>
                                                    <p className="text-sm font-bold text-red-700">-₦{totalDeductions.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-green-50 rounded-lg p-2.5">
                                                    <p className="text-xs text-green-600 mb-0.5">Net Pay</p>
                                                    <p className="text-sm font-bold text-green-700">₦{(payslip.netPay || 0).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-200 pt-3 space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-600">PAYE Tax</span>
                                                    <span className="font-semibold text-gray-900">₦{(payslip.tax || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-600">Pension</span>
                                                    <span className="font-semibold text-gray-900">₦{(payslip.pension || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-600">NHF</span>
                                                    <span className="font-semibold text-gray-900">₦{(payslip.nhf || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-1">No Payslips Available</h3>
                                <p className="text-sm text-gray-600">Payslips will appear here once processed</p>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'profile' && (
                    <div className="space-y-4">
                        {/* Profile Header */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white text-center">
                            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 border-4 border-white/30">
                                <span className="text-3xl font-bold">{driver.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <h2 className="text-xl font-bold mb-1">{driver.name}</h2>
                            <p className="text-indigo-100 text-sm">{driver.licenseNumber}</p>
                        </div>

                        {/* Profile Details */}
                        <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                <span className="text-gray-600 font-medium text-sm">License</span>
                                <span className="font-bold text-gray-900 text-sm">{driver.licenseNumber}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                <span className="text-gray-600 font-medium text-sm">Phone</span>
                                <span className="font-bold text-gray-900 text-sm">{driver.phone}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-100">
                                <span className="text-gray-600 font-medium text-sm">Status</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    driver.status === 'On-route'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-700'
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
                            className={`flex flex-col items-center justify-center py-3 transition-colors ${
                                activeView === item.id
                                    ? 'text-indigo-600'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeView === item.id ? 2.5 : 2} d={item.icon} />
                            </svg>
                            <span className={`text-xs ${activeView === item.id ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* POD Upload Modal */}
            {showPodModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="bg-purple-600 text-white px-5 py-4 rounded-t-2xl">
                            <h2 className="text-lg font-bold">Upload Proof of Delivery</h2>
                            <p className="text-sm text-purple-100">Take or upload a photo</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePodFileChange}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                            {podPreview && (
                                <img src={podPreview} alt="POD Preview" className="w-full h-48 object-cover rounded-xl border-2 border-gray-200" />
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowPodModal(false);
                                        setPodFile(null);
                                        setPodPreview(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadPod}
                                    disabled={!podFile || uploadingPod}
                                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-semibold rounded-xl"
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

export default DriverPortalProfessional;
