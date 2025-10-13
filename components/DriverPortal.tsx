import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { startRoute, completeRoute } from '../services/firestore/routes';
import type { Driver, Route, Payslip } from '../types';

interface DriverPortalProps {
    driver: Driver;
    onLogout: () => void;
}

const DriverPortal: React.FC<DriverPortalProps> = ({ driver, onLogout }) => {
    const [activeRoute, setActiveRoute] = useState<Route | null>(null);
    const [completedRoutes, setCompletedRoutes] = useState<Route[]>([]);
    const [activeView, setActiveView] = useState<'dashboard' | 'history' | 'earnings' | 'profile'>('dashboard');
    const [loading, setLoading] = useState(true);

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
                setActiveRoute({
                    id: routeDoc.id,
                    ...routeDoc.data()
                } as Route);
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

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        {activeRoute.status === 'Pending' && (
                                            <button
                                                onClick={handleStartRoute}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Start Route
                                            </button>
                                        )}
                                        {activeRoute.status === 'In Progress' && (
                                            <button
                                                onClick={handleCompleteRoute}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Complete Route
                                            </button>
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
                <div className="grid grid-cols-4 max-w-4xl mx-auto">
                    <button
                        onClick={() => setActiveView('dashboard')}
                        className={`flex flex-col items-center justify-center py-3 ${
                            activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-xs mt-1">Home</span>
                    </button>
                    <button
                        onClick={() => setActiveView('history')}
                        className={`flex flex-col items-center justify-center py-3 ${
                            activeView === 'history' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs mt-1">History</span>
                    </button>
                    <button
                        onClick={() => setActiveView('earnings')}
                        className={`flex flex-col items-center justify-center py-3 ${
                            activeView === 'earnings' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs mt-1">Earnings</span>
                    </button>
                    <button
                        onClick={() => setActiveView('profile')}
                        className={`flex flex-col items-center justify-center py-3 ${
                            activeView === 'profile' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs mt-1">Profile</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DriverPortal;
