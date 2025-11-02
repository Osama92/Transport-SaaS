/**
 * Driver Portal Home Screen
 * Dashboard with KPIs, quick actions, and recent activity
 */

import React, { useState, useEffect } from 'react';
import type { Driver, DriverKPIMetrics, Route } from '../../types';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

interface DriverPortalHomeProps {
  driver: Driver;
  onNavigate: (screen: 'home' | 'routes' | 'fuel' | 'expenses' | 'wallet' | 'profile') => void;
}

const DriverPortalHome: React.FC<DriverPortalHomeProps> = ({ driver, onNavigate }) => {
  const [kpis, setKpis] = useState<DriverKPIMetrics | null>(null);
  const [recentRoutes, setRecentRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPendingRoutes, setHasPendingRoutes] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [driver.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadKPIMetrics(),
        loadRecentRoutes(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKPIMetrics = async () => {
    try {
      // Calculate KPIs from routes
      const routesRef = collection(db, 'routes');
      const q = query(
        routesRef,
        where('assignedDriverId', '==', driver.id),
        where('organizationId', '==', driver.organizationId)
      );
      const snapshot = await getDocs(q);

      const routes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));

      // Calculate metrics
      const completedRoutes = routes.filter(r => r.status === 'Completed');
      const pendingRoutes = routes.filter(r => r.status === 'Pending');
      const inProgressRoutes = routes.filter(r => r.status === 'In Progress');

      const totalDistance = routes.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
      const totalRevenue = routes.reduce((sum, r) => sum + (r.rate || 0), 0);
      const totalExpenses = routes.reduce((sum, r) => {
        const routeExpenses = r.expenses?.reduce((expSum, exp) => expSum + exp.amount, 0) || 0;
        return sum + routeExpenses;
      }, 0);

      const metrics: DriverKPIMetrics = {
        driverId: driver.id,
        period: 'monthly',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        endDate: new Date().toISOString(),
        totalRoutes: routes.length,
        completedRoutes: completedRoutes.length,
        pendingRoutes: pendingRoutes.length,
        canceledRoutes: 0,
        completionRate: routes.length > 0 ? (completedRoutes.length / routes.length) * 100 : 0,
        totalDistanceKm: totalDistance,
        totalDrivingHours: totalDistance / 50, // Estimate: 50km/h average
        averageDistancePerRoute: routes.length > 0 ? totalDistance / routes.length : 0,
        totalDeliveries: routes.reduce((sum, r) => sum + (r.stops || 0), 0),
        onTimeDeliveries: 0, // TODO: Calculate from actual delivery times
        lateDeliveries: 0,
        onTimeRate: 0,
        totalFuelLiters: 0, // TODO: Load from fuel logs
        averageFuelConsumption: 0,
        totalFuelCost: 0,
        totalRevenue,
        totalExpenses,
        netEarnings: totalRevenue - totalExpenses,
        walletBalance: driver.walletBalance || 0,
        incidentCount: 0,
        safetyScore: driver.safetyScore || 100,
        complianceScore: 100,
        podUploadRate: completedRoutes.length > 0
          ? (completedRoutes.filter(r => r.podUrl).length / completedRoutes.length) * 100
          : 0,
      };

      setKpis(metrics);
      const hasPending = pendingRoutes.length > 0;
      setHasPendingRoutes(hasPending);
      console.log('[DRIVER HOME] Pending routes check:', {
        pendingCount: pendingRoutes.length,
        hasPending,
        totalRoutes: routes.length
      });
    } catch (error) {
      console.error('Error loading KPIs:', error);
    }
  };

  const loadRecentRoutes = async () => {
    try {
      const routesRef = collection(db, 'routes');
      const q = query(
        routesRef,
        where('assignedDriverId', '==', driver.id),
        where('organizationId', '==', driver.organizationId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const routes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
      setRecentRoutes(routes);
    } catch (error) {
      console.error('Error loading recent routes:', error);
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
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {driver.name.split(' ')[0]}! 👋</h1>
        <p className="text-indigo-100">Here's your performance overview for this month</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Routes"
          value={kpis?.totalRoutes || 0}
          subtitle={`${kpis?.completedRoutes || 0} completed`}
          icon="📦"
          trend={kpis?.completionRate}
          trendLabel="Completion Rate"
          onClick={() => onNavigate('routes')}
          showBadge={hasPendingRoutes}
          badgeText={`${kpis?.pendingRoutes || 0} New`}
        />
        <KPICard
          title="Distance Covered"
          value={`${(kpis?.totalDistanceKm || 0).toLocaleString()} km`}
          subtitle={`Avg: ${Math.round(kpis?.averageDistancePerRoute || 0)} km/route`}
          icon="🛣️"
        />
        <KPICard
          title="Wallet Balance"
          value={formatCurrency(kpis?.walletBalance || 0)}
          subtitle="Available for withdrawal"
          icon="💰"
          onClick={() => onNavigate('wallet')}
        />
        <KPICard
          title="Safety Score"
          value={`${kpis?.safetyScore || 100}%`}
          subtitle={`${kpis?.incidentCount || 0} incidents`}
          icon="🛡️"
          trend={kpis?.safetyScore}
          trendLabel="Safety"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionButton
            icon="🚗"
            label="View Routes"
            onClick={() => onNavigate('routes')}
          />
          <QuickActionButton
            icon="⛽"
            label="Log Fuel"
            onClick={() => onNavigate('fuel')}
          />
          <QuickActionButton
            icon="🧾"
            label="Add Expense"
            onClick={() => onNavigate('expenses')}
          />
          <QuickActionButton
            icon="👤"
            label="My Profile"
            onClick={() => onNavigate('profile')}
          />
        </div>
      </div>

      {/* Recent Routes */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Routes</h2>
          <button
            onClick={() => onNavigate('routes')}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View All
          </button>
        </div>

        {recentRoutes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No routes assigned yet</p>
            <p className="text-sm mt-1">Check back later for new assignments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRoutes.map((route) => (
              <div
                key={route.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onNavigate('routes')}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {route.origin || 'Origin'} → {route.destination || 'Destination'}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(route.status)}`}>
                      {route.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>🚚 {route.vehicle}</span>
                    <span>📍 {Array.isArray(route.stops) ? route.stops.length : route.stops || 0} stops</span>
                    <span>📏 {route.distanceKm} km</span>
                    {route.status === 'Completed' && route.completionDate && (
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        ✅ {new Date(route.completionDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Monthly Summary</h2>
        <div className="space-y-3">
          <SummaryItem label="Total Routes" value={kpis?.totalRoutes || 0} />
          <SummaryItem label="Completed" value={kpis?.completedRoutes || 0} />
          <SummaryItem label="In Progress" value={(kpis?.totalRoutes || 0) - (kpis?.completedRoutes || 0) - (kpis?.pendingRoutes || 0)} />
          <SummaryItem label="Pending" value={kpis?.pendingRoutes || 0} />
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <SummaryItem
              label="Completion Rate"
              value={`${Math.round(kpis?.completionRate || 0)}%`}
              highlight
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
  showBadge?: boolean;
  badgeText?: string;
}> = ({ title, value, subtitle, icon, trend, trendLabel, onClick, showBadge, badgeText }) => (
  <div
    className={`relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 ${
      onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
    }`}
    onClick={onClick}
  >
    {/* Pulsing Badge */}
    {showBadge && badgeText && (
      <div className="absolute -top-2 -right-2 z-10">
        <span className="relative flex h-6 w-auto px-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-6 px-3 bg-indigo-600 text-white text-xs font-bold items-center justify-center">
            {badgeText}
          </span>
        </span>
      </div>
    )}

    <div className="flex items-center justify-between mb-3">
      <span className="text-2xl">{icon}</span>
      {trend !== undefined && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trend >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
          trend >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {Math.round(trend)}% {trendLabel}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{title}</p>
  </div>
);

// Quick Action Button
const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-md transition-all"
  >
    <span className="text-3xl">{icon}</span>
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
  </button>
);

// Summary Item
const SummaryItem: React.FC<{
  label: string;
  value: string | number;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between">
    <span className={`${highlight ? 'font-semibold' : ''} text-gray-700 dark:text-gray-300`}>{label}</span>
    <span className={`${highlight ? 'text-lg font-bold text-indigo-600 dark:text-indigo-400' : 'font-medium text-gray-900 dark:text-white'}`}>
      {value}
    </span>
  </div>
);

export default DriverPortalHome;
