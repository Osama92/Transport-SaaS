import React from 'react';
import { useTranslation } from 'react-i18next';
import ClientsTable from '../ClientsTable';
import { BuildingOffice2Icon } from '../Icons';
import type { Client } from '../../types';

interface ClientsScreenProps {
    clients: Client[];
    onAdd: () => void;
    onEdit: (client: Client) => void;
    onToggleStatus: (client: Client) => void;
    onDelete: (client: Client) => void;
}

const ClientsScreen: React.FC<ClientsScreenProps> = ({ clients, onAdd, onEdit, onToggleStatus, onDelete }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('clients.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.subtitle')}</p>
                </div>
                 <button onClick={onAdd} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <BuildingOffice2Icon className="w-5 h-5"/> {t('clients.addNew')}
                </button>
            </div>
            <ClientsTable 
                clients={clients} 
                showViewAllButton={false} 
                onEdit={onEdit}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
            />
        </div>
    );
};

export default ClientsScreen;