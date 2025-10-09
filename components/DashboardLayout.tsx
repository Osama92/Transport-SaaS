import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import type { Notification } from '../types';

interface DashboardLayoutProps {
  onLogout: () => void;
  children: React.ReactNode;
  role: string;
  activeNav: string;
  onNavChange: (navItem: string) => void;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  onOpenProfileSettings: () => void;
  notifications: Notification[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
    onLogout, 
    children, 
    role, 
    activeNav, 
    onNavChange,
    dateRange,
    onDateRangeChange,
    onOpenProfileSettings,
    notifications,
}) => {
    return (
        <div className="flex h-screen bg-gray-100 dark:bg-slate-900 font-sans">
            <Sidebar onLogout={onLogout} role={role} activeNav={activeNav} onNavChange={onNavChange} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    role={role}
                    dateRange={dateRange}
                    onDateRangeChange={onDateRangeChange}
                    onNavChange={onNavChange}
                    onOpenProfileSettings={onOpenProfileSettings}
                    notifications={notifications}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-slate-900 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
