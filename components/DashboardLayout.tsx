import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TrialBanner from './TrialBanner';
import { Bars3Icon } from './Icons';
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
  onSubscribeClick?: () => void;
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
    onSubscribeClick,
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showRipple, setShowRipple] = useState(false);

    const toggleMobileMenu = () => {
        // Trigger ripple animation
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 600);

        // Toggle menu
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-slate-900 font-sans">
            {/* Floating Action Button (FAB) - Bottom Right - Mobile Only */}
            <button
                onClick={toggleMobileMenu}
                className={`
                    fixed bottom-6 right-6 z-30 lg:hidden
                    w-14 h-14 rounded-full
                    bg-gradient-to-br from-indigo-500 to-indigo-600
                    hover:from-indigo-600 hover:to-indigo-700
                    text-white
                    flex items-center justify-center
                    transition-all duration-300 ease-out
                    active:scale-95
                    ${isMobileMenuOpen ? 'rotate-90 scale-110' : 'scale-100 fab-pulse'}
                `}
                style={{
                    boxShadow: isMobileMenuOpen
                        ? '0 20px 35px -5px rgba(99, 102, 241, 0.4), 0 15px 20px -5px rgba(99, 102, 241, 0.2)'
                        : '0 10px 25px -5px rgba(99, 102, 241, 0.3), 0 10px 10px -5px rgba(99, 102, 241, 0.1)'
                }}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
                {/* Click Ripple Effect */}
                {showRipple && (
                    <span className="absolute inset-0 rounded-full bg-white/30 ripple-effect" />
                )}

                {/* Pulse Ring (when closed) */}
                {!isMobileMenuOpen && (
                    <span className="absolute -inset-1 rounded-full border-2 border-indigo-400/50 animate-ping" />
                )}

                {/* Icon with smooth transition */}
                <span className="relative z-10 transition-transform duration-300 ease-out">
                    {isMobileMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </span>
            </button>

            {/* Sidebar */}
            <Sidebar
                onLogout={onLogout}
                role={role}
                activeNav={activeNav}
                onNavChange={onNavChange}
                isMobileMenuOpen={isMobileMenuOpen}
                onMobileMenuToggle={toggleMobileMenu}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    role={role}
                    dateRange={dateRange}
                    onDateRangeChange={onDateRangeChange}
                    onNavChange={onNavChange}
                    onOpenProfileSettings={onOpenProfileSettings}
                    notifications={notifications}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-slate-900 px-4 sm:px-6 pb-8 scrollbar-hide">
                    <TrialBanner onSubscribeClick={onSubscribeClick} />
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
