import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    BellIcon, CalendarDaysIcon, GlobeAltIcon, ChevronDownIcon,
    UserCircleIcon, CreditCardIcon
} from './Icons';
import NotificationPanel from './NotificationPanel';
import CalendarPopover from './CalendarPopover';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../types';

interface HeaderProps {
    role: string;
    dateRange: { start: Date; end: Date };
    onDateRangeChange: (range: { start: Date; end: Date }) => void;
    onNavChange: (nav: string) => void;
    onOpenProfileSettings: () => void;
    notifications: Notification[];
}

const Header: React.FC<HeaderProps> = ({ role, dateRange, onDateRangeChange, onNavChange, onOpenProfileSettings, notifications }) => {
    const { t, i18n } = useTranslation();
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const { currentUser } = useAuth();

    const notificationRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const languageMenuRef = useRef<HTMLDivElement>(null);
    
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
            if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
                setIsLanguageMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleNotifications = () => {
        // On mobile (screen width < 768px), navigate directly to notifications page
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            onNavChange('Notifications');
            setIsNotificationOpen(false);
        } else {
            // On desktop, show popup
            setIsNotificationOpen(prev => !prev);
        }
        setIsCalendarOpen(false);
        setIsProfileMenuOpen(false);
        setIsLanguageMenuOpen(false);
    }
    
    const toggleCalendar = () => {
        setIsCalendarOpen(prev => !prev);
        setIsNotificationOpen(false);
        setIsProfileMenuOpen(false);
        setIsLanguageMenuOpen(false);
    }

    const toggleProfileMenu = () => {
        setIsProfileMenuOpen(prev => !prev);
        setIsNotificationOpen(false);
        setIsCalendarOpen(false);
        setIsLanguageMenuOpen(false);
    }

    const toggleLanguageMenu = () => {
        setIsLanguageMenuOpen(prev => !prev);
        setIsNotificationOpen(false);
        setIsCalendarOpen(false);
        setIsProfileMenuOpen(false);
    }

    const handleApplyDateRange = (range: { start: Date; end: Date }) => {
        onDateRangeChange(range);
        setIsCalendarOpen(false);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('header.greeting.morning');
        if (hour < 18) return t('header.greeting.afternoon');
        return t('header.greeting.evening');
    };
    
    const userName = currentUser?.displayName?.split(' ')[0] || 'there';
    
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setIsLanguageMenuOpen(false);
    };


    return (
        <header className="sticky top-0 z-10 bg-gray-100 dark:bg-slate-900 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 flex items-center justify-between border-b border-gray-200 dark:border-slate-700">
            {/* Left Side - Greeting */}
            <div className="flex items-center min-w-0 flex-shrink">
                <div className="min-w-0">
                    <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
                        {getGreeting()}, {userName}! <span className="hidden sm:inline">👋</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('header.summary')}</p>
                </div>
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 ml-2 sm:ml-4 flex-shrink-0">
                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={toggleNotifications}
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white relative rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Notifications"
                    >
                        <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    {isNotificationOpen && <NotificationPanel notifications={notifications} onViewAll={() => { onNavChange('Notifications'); setIsNotificationOpen(false); }} />}
                </div>

                {/* Calendar - Hide on very small screens */}
                <div className="relative hidden xs:block" ref={calendarRef}>
                    <button
                        onClick={toggleCalendar}
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Calendar"
                    >
                        <CalendarDaysIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                    {isCalendarOpen && (
                        <CalendarPopover
                            initialRange={dateRange}
                            onApply={handleApplyDateRange}
                            onClose={() => setIsCalendarOpen(false)}
                        />
                    )}
                </div>

                {/* Language - Show on all screens */}
                <div className="relative" ref={languageMenuRef}>
                    <button
                        onClick={toggleLanguageMenu}
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Change Language"
                    >
                        <GlobeAltIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                    {isLanguageMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 z-20">
                            <div className="p-2">
                                <button onClick={() => changeLanguage('en')} className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700">
                                    {t('languages.en')}
                                </button>
                                <button onClick={() => changeLanguage('ig')} className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700">
                                    {t('languages.ig')}
                                </button>
                                <button onClick={() => changeLanguage('yo')} className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700">
                                    {t('languages.yo')}
                                </button>
                                <button onClick={() => changeLanguage('ha')} className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700">
                                    {t('languages.ha')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Menu - Responsive */}
                <div className="relative" ref={profileMenuRef}>
                    <button
                        className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 cursor-pointer p-1 sm:p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        onClick={toggleProfileMenu}
                        aria-label="User Menu"
                    >
                        <img
                            src={currentUser?.photoURL || "https://picsum.photos/seed/placeholder/40/40"}
                            alt="User Avatar"
                            className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-slate-600"
                        />
                        {/* Hide name/role on mobile, show on tablet+ */}
                        <div className="hidden md:block">
                            <p className="font-semibold text-xs lg:text-sm text-gray-800 dark:text-gray-100 truncate max-w-[100px] lg:max-w-[150px]">
                                {currentUser?.displayName || 'John Doe'}
                            </p>
                            <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 capitalize">{role}</p>
                        </div>
                        <ChevronDownIcon className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isProfileMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 sm:w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-20">
                            {/* Mobile: Show user info in dropdown */}
                            <div className="md:hidden p-3 border-b border-gray-200 dark:border-slate-700">
                                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                                    {currentUser?.displayName || 'John Doe'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">{role}</p>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={() => { onNavChange('Settings'); setIsProfileMenuOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <UserCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400"/>
                                    {t('header.profileSettings')}
                                </button>
                                <button
                                    onClick={() => { onNavChange('Manage Subscription'); setIsProfileMenuOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <CreditCardIcon className="w-5 h-5 text-gray-500 dark:text-gray-400"/>
                                    {t('header.manageSubscription')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;