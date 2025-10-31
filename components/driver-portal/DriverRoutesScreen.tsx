/**
 * Driver Routes Screen
 * View assigned routes, complete routes, upload POD
 */

import React, { useState, useEffect } from 'react';
import type { Driver, Route, ProofOfDelivery } from '../../types';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/firebaseConfig';
import ProofOfDeliveryModal from './ProofOfDeliveryModal';

interface DriverRoutesScreenProps {
  driver: Driver;
}

const DriverRoutesScreen: React.FC<DriverRoutesScreenProps> = ({ driver }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Pending' | 'In Progress' | 'Completed'>('all');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showPODModal, setShowPODModal] = useState(false);

  useEffect(() => {
    loadRoutes();
  }, [driver.id]);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      console.log('[DRIVER ROUTES] Loading routes for driver:', {
        driverId: driver.id,
        driverName: driver.name,
        organizationId: driver.organizationId
      });

      const routesRef = collection(db, 'routes');
      // Use assignedDriverId (not driverId) to match the route creation logic
      const q = query(
        routesRef,
        where('assignedDriverId', '==', driver.id),
        where('organizationId', '==', driver.organizationId)
      );
      const snapshot = await getDocs(q);
      console.log('[DRIVER ROUTES] Found routes count:', snapshot.docs.length);
      const routesData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('[DRIVER ROUTES] Route:', {
          id: doc.id,
          origin: data.origin,
          destination: data.destination,
          status: data.status,
          assignedDriverId: data.assignedDriverId
        });
        return { id: doc.id, ...data } as Route;
      });

      // Sort by status priority: In Progress > Pending > Completed
      routesData.sort((a, b) => {
        const statusPriority = { 'In Progress': 0, 'Pending': 1, 'Completed': 2 };
        return statusPriority[a.status] - statusPriority[b.status];
      });

      setRoutes(routesData);
    } catch (error) {
      console.error('Error loading routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoute = async (route: Route) => {
    try {
      const routeRef = doc(db, 'routes', route.id);
      await updateDoc(routeRef, {
        status: 'In Progress',
        updatedAt: serverTimestamp(),
      });

      // Update driver status
      const driverRef = doc(db, 'drivers', driver.id);
      await updateDoc(driverRef, {
        currentRouteId: route.id,
        currentRouteStatus: 'In Progress',
        status: 'On-route',
        updatedAt: serverTimestamp(),
      });

      // Update vehicle status
      const vehicleId = (route as any).assignedVehicleId || route.vehicleId;
      if (vehicleId) {
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        await updateDoc(vehicleRef, {
          currentRouteId: route.id,
          currentRouteStatus: 'In Progress',
          status: 'On the Move',
          updatedAt: serverTimestamp(),
        });
      }

      alert('Route started successfully! 🚀');
      loadRoutes();
    } catch (error) {
      console.error('Error starting route:', error);
      alert('Failed to start route. Please try again.');
    }
  };

  const handleCompleteRoute = (route: Route) => {
    setSelectedRoute(route);
    setShowPODModal(true);
  };

  const handlePODSubmit = async (podData: {
    recipientName: string;
    deliveryNotes: string;
    deliveryPhoto?: File;
    odometerReading?: number;
  }) => {
    if (!selectedRoute) return;

    try {
      let photoUrl = '';

      // Upload photo if provided
      if (podData.deliveryPhoto) {
        const photoRef = ref(storage, `pod/${driver.organizationId}/${selectedRoute.id}/${Date.now()}_${podData.deliveryPhoto.name}`);
        await uploadBytes(photoRef, podData.deliveryPhoto);
        photoUrl = await getDownloadURL(photoRef);
      }

      // Create POD document
      const podRef = collection(db, 'proofOfDelivery');
      const podVehicleId = (selectedRoute as any).assignedVehicleId || selectedRoute.vehicleId;
      await addDoc(podRef, {
        routeId: selectedRoute.id,
        driverId: driver.id,
        organizationId: driver.organizationId,
        vehicleId: podVehicleId,
        recipientName: podData.recipientName,
        deliveryPhotoUrl: photoUrl,
        deliveryNotes: podData.deliveryNotes,
        deliveryStatus: 'successful',
        deliveryTimestamp: serverTimestamp(),
        odometerReading: podData.odometerReading,
        verified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Omit<ProofOfDelivery, 'id'>);

      // Update route status
      const routeRef = doc(db, 'routes', selectedRoute.id);
      await updateDoc(routeRef, {
        status: 'Completed',
        progress: 100,
        podUrl: photoUrl,
        completionDate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });

      // Update driver status
      const driverRef = doc(db, 'drivers', driver.id);
      await updateDoc(driverRef, {
        currentRouteId: null,
        currentRouteStatus: null,
        status: 'Idle',
        updatedAt: serverTimestamp(),
      });

      // Update vehicle status
      const vehicleId = (selectedRoute as any).assignedVehicleId || selectedRoute.vehicleId;
      if (vehicleId) {
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        await updateDoc(vehicleRef, {
          currentRouteId: null,
          currentRouteStatus: null,
          status: 'Idle',
          updatedAt: serverTimestamp(),
        });

        // Update vehicle odometer if provided
        if (podData.odometerReading) {
          await updateDoc(vehicleRef, {
            'telematics.odometer': podData.odometerReading,
          });
        }
      }

      alert('Route completed successfully! ✅');
      setShowPODModal(false);
      setSelectedRoute(null);
      loadRoutes();
    } catch (error) {
      console.error('Error completing route:', error);
      alert('Failed to complete route. Please try again.');
    }
  };

  const filteredRoutes = filter === 'all' ? routes : routes.filter(r => r.status === filter);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">My Routes</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Manage your assigned routes</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
        {(['all', 'Pending', 'In Progress', 'Completed'] as const).map((status) => {
          const count = status === 'all' ? routes.length : routes.filter(r => r.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {status === 'all' ? 'All' : status} ({count})
            </button>
          );
        })}
      </div>

      {/* Routes List */}
      {filteredRoutes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg">No routes found</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            {filter === 'all'
              ? 'You have no assigned routes yet'
              : `You have no ${filter.toLowerCase()} routes`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                      {route.origin || 'Origin'} → {route.destination || 'Destination'}
                    </h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(route.status)} self-start`}>
                      {route.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-500">Vehicle</span>
                      <span className="font-medium">🚚 {route.vehicle}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-500">Stops</span>
                      <span className="font-medium">📍 {route.stops}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-500">Distance</span>
                      <span className="font-medium">📏 {route.distanceKm} km</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {route.status !== 'Pending' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-medium text-gray-900 dark:text-white">{route.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${route.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stops */}
              {route.stopAddresses && route.stopAddresses.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Stops:</p>
                  <div className="space-y-1">
                    {route.stopAddresses.map((stop, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">{index + 1}.</span>
                        <span className="text-gray-600 dark:text-gray-400">{stop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {route.status === 'Pending' && (
                  <button
                    onClick={() => handleStartRoute(route)}
                    className="w-full sm:flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm md:text-base"
                  >
                    Start Route 🚀
                  </button>
                )}
                {route.status === 'In Progress' && (
                  <button
                    onClick={() => handleCompleteRoute(route)}
                    className="w-full sm:flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm md:text-base"
                  >
                    Complete & Upload POD ✅
                  </button>
                )}
                {route.status === 'Completed' && route.podUrl && (
                  <button
                    onClick={() => window.open(route.podUrl, '_blank')}
                    className="w-full sm:flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm md:text-base"
                  >
                    View POD 📄
                  </button>
                )}
              </div>

              {/* Completion Info */}
              {route.status === 'Completed' && route.completionDate && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Completed on {new Date(route.completionDate).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* POD Modal */}
      {showPODModal && selectedRoute && (
        <ProofOfDeliveryModal
          route={selectedRoute}
          onClose={() => {
            setShowPODModal(false);
            setSelectedRoute(null);
          }}
          onSubmit={handlePODSubmit}
        />
      )}
    </div>
  );
};

export default DriverRoutesScreen;
