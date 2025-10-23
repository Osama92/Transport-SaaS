/**
 * Driver Fuel Management Screen
 * Log fuel refills, track odometer, calculate fuel consumption
 */

import React, { useState, useEffect } from 'react';
import type { Driver, FuelLog, Vehicle } from '../../types';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/firebaseConfig';
import AddFuelLogModal from './AddFuelLogModal';

interface DriverFuelManagementProps {
  driver: Driver;
}

const DriverFuelManagement: React.FC<DriverFuelManagementProps> = ({ driver }) => {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    totalFuelCost: 0,
    totalLiters: 0,
    totalDistance: 0,
    averageConsumption: 0,
    averageKmPerLiter: 0,
  });

  useEffect(() => {
    loadData();
  }, [driver.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAssignedVehicle(),
        loadFuelLogs(),
      ]);
    } catch (error) {
      console.error('Error loading fuel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedVehicle = async () => {
    try {
      // Find vehicle assigned to this driver
      const vehiclesRef = collection(db, 'vehicles');
      const q = query(
        vehiclesRef,
        where('assignedDriverId', '==', driver.id),
        where('organizationId', '==', driver.organizationId),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const vehicleData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vehicle;
        setAssignedVehicle(vehicleData);
      }
    } catch (error) {
      console.error('Error loading assigned vehicle:', error);
    }
  };

  const loadFuelLogs = async () => {
    try {
      const fuelLogsRef = collection(db, 'fuelLogs');
      const q = query(
        fuelLogsRef,
        where('driverId', '==', driver.id),
        where('organizationId', '==', driver.organizationId),
        orderBy('refuelDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelLog));

      setFuelLogs(logs);

      // Calculate statistics
      if (logs.length > 0) {
        const totalCost = logs.reduce((sum, log) => sum + log.totalFuelCost, 0);
        const totalLiters = logs.reduce((sum, log) => sum + log.fuelQuantity, 0);
        const totalDistance = logs.reduce((sum, log) => sum + log.distanceTraveled, 0);
        const avgConsumption = totalDistance > 0 ? (totalLiters / totalDistance) * 100 : 0;
        const avgKmPerLiter = totalLiters > 0 ? totalDistance / totalLiters : 0;

        setStats({
          totalFuelCost: totalCost,
          totalLiters: totalLiters,
          totalDistance: totalDistance,
          averageConsumption: avgConsumption,
          averageKmPerLiter: avgKmPerLiter,
        });
      }
    } catch (error) {
      console.error('Error loading fuel logs:', error);
    }
  };

  const handleAddFuelLog = async (data: {
    currentOdometer: number;
    fuelQuantity: number;
    fuelCostPerLiter: number;
    stationName: string;
    location: string;
    receiptPhoto?: File;
  }) => {
    if (!assignedVehicle) {
      alert('No vehicle assigned to you');
      return;
    }

    try {
      // Get previous odometer reading
      const previousOdometer = assignedVehicle.telematics.odometer || 0;

      // Validate odometer reading
      if (data.currentOdometer <= previousOdometer) {
        throw new Error('Current odometer must be greater than previous reading');
      }

      // Calculate distance traveled
      const distanceTraveled = data.currentOdometer - previousOdometer;

      // Calculate fuel consumption metrics
      const totalFuelCost = data.fuelQuantity * data.fuelCostPerLiter;
      const fuelConsumption = (data.fuelQuantity / distanceTraveled) * 100; // Liters per 100km
      const kmPerLiter = distanceTraveled / data.fuelQuantity;

      // Upload receipt photo if provided
      let receiptUrl = '';
      if (data.receiptPhoto) {
        const receiptRef = ref(
          storage,
          `fuel-receipts/${driver.organizationId}/${driver.id}/${Date.now()}_${data.receiptPhoto.name}`
        );
        await uploadBytes(receiptRef, data.receiptPhoto);
        receiptUrl = await getDownloadURL(receiptRef);
      }

      // Create fuel log
      const fuelLogRef = collection(db, 'fuelLogs');
      await addDoc(fuelLogRef, {
        driverId: driver.id,
        organizationId: driver.organizationId,
        vehicleId: assignedVehicle.id,
        vehiclePlateNumber: assignedVehicle.plateNumber,
        previousOdometer,
        currentOdometer: data.currentOdometer,
        distanceTraveled,
        fuelQuantity: data.fuelQuantity,
        fuelCostPerLiter: data.fuelCostPerLiter,
        totalFuelCost,
        fuelConsumption,
        kmPerLiter,
        receiptPhotoUrl: receiptUrl,
        location: data.location,
        stationName: data.stationName,
        refuelDate: new Date().toISOString(),
        submittedAt: serverTimestamp(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Omit<FuelLog, 'id'>);

      alert('Fuel log added successfully! ⛽');
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('Error adding fuel log:', error);
      alert(error instanceof Error ? error.message : 'Failed to add fuel log');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
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
          <p className="text-gray-600 dark:text-gray-400">Loading fuel data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fuel & Vehicle</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track fuel consumption and vehicle metrics</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!assignedVehicle}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Refuel
        </button>
      </div>

      {/* Vehicle Info */}
      {assignedVehicle ? (
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100 mb-1">Assigned Vehicle</p>
              <h2 className="text-2xl font-bold mb-2">
                {assignedVehicle.make} {assignedVehicle.model} ({assignedVehicle.year})
              </h2>
              <p className="text-lg font-semibold">📋 {assignedVehicle.plateNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100 mb-1">Current Odometer</p>
              <p className="text-3xl font-bold">{assignedVehicle.telematics.odometer.toLocaleString()} km</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-200">No Vehicle Assigned</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Contact your manager to assign a vehicle to you</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="⛽"
          title="Total Fuel Cost"
          value={formatCurrency(stats.totalFuelCost)}
          subtitle={`${stats.totalLiters.toFixed(1)} liters`}
        />
        <StatCard
          icon="📏"
          title="Distance Covered"
          value={`${stats.totalDistance.toLocaleString()} km`}
          subtitle={`${fuelLogs.length} refuels`}
        />
        <StatCard
          icon="📊"
          title="Fuel Consumption"
          value={`${stats.averageConsumption.toFixed(2)} L/100km`}
          subtitle="Average"
        />
        <StatCard
          icon="🎯"
          title="Fuel Efficiency"
          value={`${stats.averageKmPerLiter.toFixed(2)} km/L`}
          subtitle="Average"
        />
      </div>

      {/* Fuel Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fuel Log History</h2>
        </div>

        {fuelLogs.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 text-lg">No fuel logs yet</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              Click "Log Refuel" to add your first fuel entry
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Odometer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fuel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Consumption</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {fuelLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(log.refuelDate).toLocaleDateString('en-NG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {log.vehiclePlateNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {log.previousOdometer.toLocaleString()} → {log.currentOdometer.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {log.distanceTraveled} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {log.fuelQuantity.toFixed(1)} L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        log.fuelConsumption < 10 ? 'text-green-600 dark:text-green-400' :
                        log.fuelConsumption < 15 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {log.fuelConsumption.toFixed(2)} L/100km
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {log.kmPerLiter.toFixed(2)} km/L
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(log.totalFuelCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.receiptPhotoUrl ? (
                        <a
                          href={log.receiptPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Fuel Log Modal */}
      {showAddModal && assignedVehicle && (
        <AddFuelLogModal
          vehicle={assignedVehicle}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddFuelLog}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  subtitle: string;
}> = ({ icon, title, value, subtitle }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-3">
      <span className="text-2xl">{icon}</span>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{title}</p>
  </div>
);

export default DriverFuelManagement;
