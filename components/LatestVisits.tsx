import React from 'react';
import type { Visit } from '../types';
import { CalendarDaysIcon, ClockIcon, Bars3Icon } from './Icons';
import { useTranslation } from 'react-i18next';

interface LatestVisitsProps {
    visits: Visit[];
}

const VisitItem: React.FC<{ visit: Visit }> = ({ visit }) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
            <img src={visit.avatar} alt={visit.name} className="w-10 h-10 rounded-full" />
            <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{visit.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{visit.role}</p>
            </div>
        </div>
        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4" />
                <span>{visit.time}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
                <CalendarDaysIcon className="w-4 h-4" />
                <span>{visit.date}</span>
            </div>
        </div>
    </div>
);


const LatestVisits: React.FC<LatestVisitsProps> = ({ visits }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('dashboard.latest_visits_title')}</h3>
                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
                    <Bars3Icon className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-grow divide-y divide-gray-100 dark:divide-slate-700">
                {visits.map((visit, index) => (
                    <VisitItem key={index} visit={visit} />
                ))}
            </div>
        </div>
    );
};

export default LatestVisits;