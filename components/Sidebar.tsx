import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Squares2X2Icon, MapPinIcon, ChartBarIcon, DocumentTextIcon, BellIcon, Cog8ToothIcon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon,
    UserGroupIcon, TruckIcon, MapIcon, BuildingOffice2Icon, ArchiveBoxIcon, WalletIcon, Bars3Icon, XMarkIcon, SignalIcon
} from './Icons';
import { HomeIcon, DriversIcon, VehiclesIcon, RoutesIcon, ClientsIcon, InvoicesIcon, AnalyticsIcon, PayrollIcon, SettingsIcon } from './NavIcons';

interface SidebarProps {
    onLogout: () => void;
    role: string;
    activeNav: string;
    onNavChange: (navItem: string) => void;
    isMobileMenuOpen?: boolean;
    onMobileMenuToggle?: () => void;
}

const baseNavItems = [
    { icon: <Squares2X2Icon className="w-6 h-6" />, name: 'Dashboard' },
    { icon: <MapPinIcon className="w-6 h-6" />, name: 'Map' },
    { icon: <TruckIcon className="w-6 h-6" />, name: 'Transporters' },
    { icon: <UserGroupIcon className="w-6 h-6" />, name: 'Contacts' },
    { icon: <ArchiveBoxIcon className="w-6 h-6" />, name: 'Materials' },
    { icon: <ChartBarIcon className="w-6 h-6" />, name: 'Analytics' },
    { icon: <BellIcon className="w-6 h-6" />, name: 'Notifications' },
    { icon: <Cog8ToothIcon className="w-6 h-6" />, name: 'Settings' },
];

const partnerNavItems = [
    { icon: <HomeIcon className="w-6 h-6" />, name: 'Dashboard' },
    { icon: <DriversIcon className="w-6 h-6" />, name: 'Drivers' },
    { icon: <VehiclesIcon className="w-6 h-6" />, name: 'Vehicles' },
    { icon: <RoutesIcon className="w-6 h-6" />, name: 'Routes' },
    { icon: <SignalIcon className="w-6 h-6" />, name: 'Fleet Tracking' },
    { icon: <ClientsIcon className="w-6 h-6" />, name: 'Clients' },
    { icon: <InvoicesIcon className="w-6 h-6" />, name: 'Invoices' },
    { icon: <WalletIcon className="w-6 h-6" />, name: 'Wallet' },
    { icon: <AnalyticsIcon className="w-6 h-6" />, name: 'Analytics' },
    { icon: <PayrollIcon className="w-6 h-6" />, name: 'Payroll' },
    { icon: <SettingsIcon className="w-6 h-6" />, name: 'Settings' },
];


const Sidebar: React.FC<SidebarProps> = ({ onLogout, role, activeNav, onNavChange, isMobileMenuOpen = false, onMobileMenuToggle }) => {
    const { t } = useTranslation();
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Close mobile menu on nav change
    const handleNavClick = (navItem: string) => {
        onNavChange(navItem);
        if (onMobileMenuToggle && isMobileMenuOpen) {
            onMobileMenuToggle();
        }
    };

    const getTranslatedNavItems = (items: typeof baseNavItems) => {
        return items.map(item => ({
            ...item,
            translatedName: t(`sidebar.${item.name.toLowerCase()}`)
        }));
    };

    const navItems = role === 'partner' ? getTranslatedNavItems(partnerNavItems) : getTranslatedNavItems(baseNavItems);

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onMobileMenuToggle}
                    aria-label="Close menu"
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 lg:z-10
                w-64 h-screen bg-white dark:bg-slate-800 flex flex-col
                shadow-2xl lg:shadow-lg border-r border-gray-200 dark:border-slate-700
                transform transition-transform duration-300 ease-in-out lg:transform-none
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
            {/* Logo & Mobile Close Button */}
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <img src="https://i.postimg.cc/nXNBx2N8/Glyde-I.png" alt="Glyde-I" className="w-10 h-10 object-contain" />
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Glyde Systems</h1>
                    </div>
                    {/* Mobile Close Button */}
                    {onMobileMenuToggle && (
                        <button
                            onClick={onMobileMenuToggle}
                            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            aria-label="Close menu"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3">
                <div className="space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.name}
                            onClick={() => handleNavClick(item.name)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                                activeNav === item.name
                                    ? 'bg-indigo-500 text-white shadow-md'
                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className={activeNav === item.name ? 'text-white' : 'text-gray-500 dark:text-gray-400'}>
                                {item.icon}
                            </span>
                            <span className="text-sm font-medium">{item.translatedName}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Theme Toggle and Logout */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 transition-all duration-200 text-left"
                >
                    <span className="text-gray-500 dark:text-gray-400">
                        {isDarkMode ? (
                            <MoonIcon className="w-6 h-6" />
                        ) : (
                            <SunIcon className="w-6 h-6" />
                        )}
                    </span>
                    <span className="text-sm font-medium">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200 text-left"
                >
                    <span>
                        <ArrowRightOnRectangleIcon className="w-6 h-6" />
                    </span>
                    <span className="text-sm font-medium">{t('sidebar.logout')}</span>
                </button>
            </div>
        </aside>
        </>
    );
};

export default Sidebar;