import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Notification, NotificationType } from '../../types';
import * as Icons from '../Icons';

// Helper component to map string names to actual Icon components
const IconMap: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    ArchiveBoxIcon: Icons.ArchiveBoxIcon,
    UserPlusIcon: Icons.UserPlusIcon,
    TruckIcon: Icons.TruckIcon,
    Cog8ToothIcon: Icons.Cog8ToothIcon,
    ExclamationCircleIcon: Icons.ExclamationCircleIcon,
};

const NotificationIcon: React.FC<{ iconName: string; className: string }> = ({ iconName, className }) => {
    const IconComponent = IconMap[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
};


interface AllNotificationsScreenProps {
    notifications: Notification[];
    onUpdateNotification: (id: number | string, updates: Partial<Notification>) => void;
    onDeleteNotification: (id: number | string) => void;
    onReadAll: () => void;
}

type FilterType = 'all' | 'unread' | NotificationType;

const AllNotificationsScreen: React.FC<AllNotificationsScreenProps> = ({ 
    notifications, 
    onUpdateNotification, 
    onDeleteNotification,
    onReadAll
}) => {
    const { t } = useTranslation();
    const [filter, setFilter] = useState<FilterType>('all');

    const filteredNotifications = useMemo(() => {
        let sorted = [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (filter === 'all') {
            return sorted;
        }
        if (filter === 'unread') {
            return sorted.filter(n => !n.read);
        }
        return sorted.filter(n => n.type === filter);
    }, [notifications, filter]);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };
    
    const filters: {key: FilterType, label: string}[] = [
        { key: 'all', label: t('screens.notifications.all') },
        { key: 'unread', label: t('screens.notifications.unread') },
        { key: 'Order', label: t('screens.notifications.orders') },
        { key: 'Driver', label: t('screens.notifications.drivers') },
        { key: 'Vehicle', label: t('screens.notifications.vehicles') },
        { key: 'System', label: t('screens.notifications.system') },
    ];

    const iconClassMap: { [key: string]: string } = {
        Order: "w-6 h-6 text-blue-500",
        Driver: "w-6 h-6 text-green-500",
        Vehicle: "w-6 h-6 text-orange-500",
        System: "w-6 h-6 text-gray-500",
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('screens.notifications.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('screens.notifications.subtitle')}</p>
                </div>
                <button 
                    onClick={onReadAll} 
                    className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <Icons.CheckCircleIcon className="w-5 h-5"/> {t('screens.notifications.markAllRead')}
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                <div className="p-4 border-b dark:border-slate-700 flex flex-wrap items-center gap-2">
                    {filters.map(f => (
                         <button 
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                                filter === f.key
                                ? 'bg-indigo-500 text-white' 
                                : 'text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {filteredNotifications.length > 0 ? filteredNotifications.map(item => (
                        <div key={item.id} className={`group flex items-start gap-4 p-4 transition-colors ${!item.read ? 'bg-indigo-50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                            {!item.read && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-3 flex-shrink-0" aria-label="Unread"></div>}
                            <div className={`p-2 rounded-lg ${item.iconBg} ${item.read ? 'ml-5.5' : ''}`}>
                                <NotificationIcon iconName={item.icon} className={iconClassMap[item.type] || "w-6 h-6 text-gray-500"} />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{item.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                                <p className="text-xs text-gray-400 mt-1">{formatTimestamp(item.timestamp)}</p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onUpdateNotification(item.id, { read: !item.read })} title={item.read ? t('screens.notifications.markAsUnread') : t('screens.notifications.markAsRead')} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600">
                                    <Icons.EyeIcon className="w-5 h-5" />
                                </button>
                                 <button onClick={() => onDeleteNotification(item.id)} title={t('screens.notifications.delete')} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20">
                                    <Icons.TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                             <Icons.BellIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600" />
                            <h3 className="mt-2 text-lg font-semibold">{t('screens.notifications.noNotificationsTitle')}</h3>
                            <p className="text-sm">{t('screens.notifications.noNotificationsSubtitle')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AllNotificationsScreen;