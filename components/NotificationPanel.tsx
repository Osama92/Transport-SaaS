import React from 'react';
import type { Notification } from '../types';
import * as Icons from './Icons';

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

interface NotificationPanelProps {
    onViewAll: () => void;
    notifications: Notification[];
}

const timeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};


const NotificationPanel: React.FC<NotificationPanelProps> = ({ onViewAll, notifications }) => {
    const recentNotifications = notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 4);

    const iconClassMap: { [key: string]: string } = {
        Order: "w-6 h-6 text-blue-500",
        Driver: "w-6 h-6 text-green-500",
        Vehicle: "w-6 h-6 text-orange-500",
        System: "w-6 h-6 text-gray-500",
    }

    return (
        <div className="absolute top-full right-0 md:right-0 mt-3 w-[calc(100vw-2rem)] md:w-80 max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 z-20 -translate-x-1/2 md:translate-x-0 left-1/2 md:left-auto">
            <div className="p-4 border-b dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Notifications</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
                {recentNotifications.length > 0 ? recentNotifications.map((item) => (
                    <div key={item.id} className={`flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${!item.read ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                        <div className={`p-2 rounded-lg ${item.iconBg}`}>
                            <NotificationIcon iconName={item.icon} className={iconClassMap[item.type] || "w-6 h-6 text-gray-500"} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{item.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                        </div>
                        <p className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(item.timestamp)}</p>
                    </div>
                )) : (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        You're all caught up!
                    </div>
                )}
            </div>
            <div className="p-2 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl text-center border-t dark:border-slate-700">
                <button onClick={onViewAll} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 w-full py-1">
                    View All Notifications
                </button>
            </div>
        </div>
    );
};

export default NotificationPanel;