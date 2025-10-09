import React from 'react';
import { useTranslation } from 'react-i18next';
import TransportersTable from '../TransportersTable';
import { UserPlusIcon } from '../Icons';
import type { Transporter } from '../../types';

interface TransportersScreenProps {
    transporters: Transporter[];
    isLoading: boolean;
    error: string | null;
    onAdd: () => void;
    onEdit: (transporter: Transporter) => void;
    onToggleStatus: (transporter: Transporter) => void;
    onDelete: (transporter: Transporter) => void;
}

const TransportersScreen: React.FC<TransportersScreenProps> = ({ transporters, isLoading, error, onAdd, onEdit, onToggleStatus, onDelete }) => {
    const { t } = useTranslation();

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            );
        }

        return (
            <TransportersTable 
                transporters={transporters} 
                onEdit={onEdit}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
            />
        );
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('screens.transporters.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('screens.transporters.subtitle')}</p>
                </div>
                 <button onClick={onAdd} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <UserPlusIcon className="w-5 h-5"/> {t('screens.transporters.addNew')}
                </button>
            </div>
            {renderContent()}
        </div>
    );
};

export default TransportersScreen;