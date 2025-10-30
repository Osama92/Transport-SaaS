import React, { useState } from 'react';
import DriversTable from '../DriversTable';
import { UserPlusIcon, UserGroupIcon, ChartPieIcon } from '../Icons';
import type { Driver } from '../../types';
import DriverAnalytics from '../analytics/DriverAnalytics';

interface DriversScreenProps {
    setActiveModal: (modal: 'addDriver') => void;
    drivers: Driver[];
    onSendFunds: (driver: Driver) => void;
    onManageWallet?: (driver: Driver) => void;
    onViewDetails: (driver: Driver) => void;
    onRemove: (driver: Driver) => void;
    onEditPay: (driver: Driver) => void;
    onEditDriver?: (driver: Driver) => void;
    onAddBonus?: () => void;
    dateRange: { start: Date, end: Date };
    selectedDriver1: string;
    onDriver1Change: (id: string) => void;
    selectedDriver2: string;
    onDriver2Change: (id: string) => void;
}

const DriversScreen: React.FC<DriversScreenProps> = (props) => {
    const {
        setActiveModal, drivers, onSendFunds, onManageWallet, onViewDetails, onRemove, onEditPay, onEditDriver, onAddBonus,
        dateRange, selectedDriver1, onDriver1Change, selectedDriver2, onDriver2Change
    } = props;
    const [activeTab, setActiveTab] = useState<'all' | 'analytics'>('all');

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Drivers</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage, analyze, and view details for all registered drivers.</p>
                </div>
                <div className="flex items-center gap-2">
                    {onAddBonus && (
                        <button onClick={onAddBonus} className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Add Bonus
                        </button>
                    )}
                    <button onClick={() => setActiveModal('addDriver')} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                        <UserPlusIcon className="w-5 h-5"/> Add New Driver
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'all'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <UserGroupIcon className="w-5 h-5" />
                        All Drivers
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'analytics'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <ChartPieIcon className="w-5 h-5" />
                        Analytics
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'all' && (
                    <DriversTable
                        drivers={drivers}
                        showViewAllButton={false}
                        onSendFunds={onSendFunds}
                        onManageWallet={onManageWallet}
                        onViewDetails={onViewDetails}
                        onRemove={onRemove}
                        onEditPay={onEditPay}
                        onEditDriver={onEditDriver}
                    />
                )}
                {activeTab === 'analytics' && (
                    <DriverAnalytics
                        drivers={drivers}
                        dateRange={dateRange}
                        selectedDriver1={selectedDriver1}
                        onDriver1Change={onDriver1Change}
                        selectedDriver2={selectedDriver2}
                        onDriver2Change={onDriver2Change}
                    />
                )}
            </div>
        </div>
    );
};

export default DriversScreen;