import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, EllipsisHorizontalIcon } from './Icons';

interface StatCardProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    value: string;
    change?: string;
    changeType?: 'increase' | 'decrease';
    description: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconBg, title, value, change, changeType, description }) => {

    return (
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
                <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg ${iconBg}`}>
                    {icon}
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                    <EllipsisHorizontalIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"/>
                </button>
            </div>
            <div className="mt-3 sm:mt-4">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100 my-1">{value}</h2>
            </div>
            <div className="mt-3 sm:mt-4 border-t pt-3 sm:pt-4 flex justify-between items-center text-xs sm:text-sm dark:border-slate-700">
                <p className="text-gray-500 dark:text-gray-400">{description}</p>
                {change && changeType && (
                    <div className={`flex items-center font-semibold ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                        {changeType === 'increase' ? <ArrowUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> : <ArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
                        <span>{change}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;