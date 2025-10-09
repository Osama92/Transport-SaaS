import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Squares2X2Icon, MapPinIcon, ChartBarIcon, DocumentTextIcon, BellIcon, Cog8ToothIcon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon,
    UserGroupIcon, TruckIcon, MapIcon, BuildingOffice2Icon, ArchiveBoxIcon, WalletIcon
} from './Icons';

interface SidebarProps {
    onLogout: () => void;
    role: string;
    activeNav: string;
    onNavChange: (navItem: string) => void;
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
    { icon: <Squares2X2Icon className="w-6 h-6" />, name: 'Dashboard' },
    { icon: <UserGroupIcon className="w-6 h-6" />, name: 'Drivers' },
    { icon: <TruckIcon className="w-6 h-6" />, name: 'Vehicles' },
    { icon: <MapIcon className="w-6 h-6" />, name: 'Routes' },
    { icon: <BuildingOffice2Icon className="w-6 h-6" />, name: 'Clients' },
    { icon: <DocumentTextIcon className="w-6 h-6" />, name: 'Invoices' },
    { icon: <ChartBarIcon className="w-6 h-6" />, name: 'Analytics' },
    { icon: <WalletIcon className="w-6 h-6" />, name: 'Payroll' },
    { icon: <Cog8ToothIcon className="w-6 h-6" />, name: 'Settings' },
];


const Sidebar: React.FC<SidebarProps> = ({ onLogout, role, activeNav, onNavChange }) => {
    const { t } = useTranslation();
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const getTranslatedNavItems = (items: typeof baseNavItems) => {
        return items.map(item => ({
            ...item,
            translatedName: t(`sidebar.${item.name.toLowerCase()}`)
        }));
    };

    const navItems = role === 'partner' ? getTranslatedNavItems(partnerNavItems) : getTranslatedNavItems(baseNavItems);

    return (
        <aside className="w-20 bg-white dark:bg-slate-800 p-4 flex flex-col items-center justify-between shadow-lg">
            <div className="flex flex-col items-center gap-8">
                {/* Logo */}
                <img src="https://i.postimg.cc/nXNBx2N8/Glyde-I.png" alt="Glyde-I" className="w-12 h-12" />

                {/* Navigation */}
                <nav className="flex flex-col gap-4">
                    {navItems.map(item => (
                        <div key={item.name} className="group relative">
                            <button
                                onClick={() => onNavChange(item.name)}
                                className={`p-3 rounded-lg transition-colors duration-200 ${
                                    activeNav === item.name
                                        ? 'bg-indigo-500 text-white'
                                        : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-500 dark:hover:bg-slate-700'
                                }`}
                                aria-label={item.translatedName}
                            >
                                {item.icon}
                            </button>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {item.translatedName}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col items-center gap-4">
                <div 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-14 h-8 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center p-1 cursor-pointer transition-all duration-300"
                >
                    <div className={`w-6 h-6 bg-white dark:bg-slate-900 rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : ''}`}>
                         {isDarkMode ? <MoonIcon className="w-4 h-4 text-indigo-400 m-1" /> : <SunIcon className="w-4 h-4 text-yellow-500 m-1"/>}
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="p-3 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
                    aria-label={t('sidebar.logout')}
                >
                    <ArrowRightOnRectangleIcon className="w-6 h-6" />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;