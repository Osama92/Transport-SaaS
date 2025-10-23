/**
 * Driver Portal Dashboard
 * Main hub for driver with navigation to all driver features
 */

import React, { useState, useEffect } from 'react';
import type { Driver } from '../../types';
import DriverPortalHome from './DriverPortalHome';
import DriverRoutesScreen from './DriverRoutesScreen';
import DriverFuelManagement from './DriverFuelManagement';
import DriverExpensesScreen from './DriverExpensesScreen';
import DriverProfileScreen from './DriverProfileScreen';
import DriverWalletScreen from './DriverWalletScreen';

interface DriverPortalDashboardProps {
  driver: Driver;
  onLogout: () => void;
}

type NavItem = 'home' | 'routes' | 'fuel' | 'expenses' | 'wallet' | 'profile';

const DriverPortalDashboard: React.FC<DriverPortalDashboardProps> = ({ driver, onLogout }) => {
  const [activeNav, setActiveNav] = useState<NavItem>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-refresh driver data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh driver data from Firestore
      // This will be handled by parent component
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [driver.id]);

  const navItems = [
    { id: 'home' as NavItem, label: 'Dashboard', icon: HomeIcon },
    { id: 'routes' as NavItem, label: 'My Routes', icon: RouteIcon },
    { id: 'fuel' as NavItem, label: 'Fuel & Vehicle', icon: FuelIcon },
    { id: 'expenses' as NavItem, label: 'Expenses', icon: ReceiptIcon },
    { id: 'wallet' as NavItem, label: 'Wallet', icon: WalletIcon },
    { id: 'profile' as NavItem, label: 'Profile', icon: UserIcon },
  ];

  const renderContent = () => {
    switch (activeNav) {
      case 'home':
        return <DriverPortalHome driver={driver} onNavigate={setActiveNav} />;
      case 'routes':
        return <DriverRoutesScreen driver={driver} />;
      case 'fuel':
        return <DriverFuelManagement driver={driver} />;
      case 'expenses':
        return <DriverExpensesScreen driver={driver} />;
      case 'wallet':
        return <DriverWalletScreen driver={driver} />;
      case 'profile':
        return <DriverProfileScreen driver={driver} onLogout={onLogout} />;
      default:
        return <DriverPortalHome driver={driver} onNavigate={setActiveNav} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <MenuIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Driver Portal</h1>
          </div>
          <img
            src={driver.avatar || driver.photo}
            alt={driver.name}
            className="w-10 h-10 rounded-full border-2 border-indigo-500"
          />
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 z-50
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <img
              src={driver.avatar || driver.photo}
              alt={driver.name}
              className="w-12 h-12 rounded-full border-2 border-indigo-500"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{driver.name}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{driver.phone}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogoutIcon className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {renderContent()}
      </main>
    </div>
  );
};

// Icons
const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const RouteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const FuelIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ReceiptIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
  </svg>
);

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export default DriverPortalDashboard;
