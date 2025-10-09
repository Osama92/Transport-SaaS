import React, { useState, useEffect } from 'react';
import ModalBase from './ModalBase';
import type { Client } from '../../types';
import { useTranslation } from 'react-i18next';

interface EditClientModalProps {
    onClose: () => void;
    onSave: (client: Client) => void;
    client: Client | null;
}

const InputField: React.FC<{label: string, id: string, name: string, type?: string, placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, id, name, type = 'text', placeholder, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={name} placeholder={placeholder} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const EditClientModal: React.FC<EditClientModalProps> = ({ onClose, onSave, client }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<Client | null>(client);

    useEffect(() => {
        setFormData(client);
    }, [client]);
    
    if (!formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? ({...prev, [name]: value}) : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    return (
        <ModalBase title={t('modals.editClient.title')} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField label={t('clients.headerCompany')} id="name" name="name" placeholder="e.g., GlobalTech Inc." value={formData.name} onChange={handleChange} />
                <InputField label={t('clients.headerContact')} id="contactPerson" name="contactPerson" placeholder="e.g., Jane Smith" value={formData.contactPerson} onChange={handleChange} />
                <InputField label={t('common.email')} id="email" name="email" type="email" placeholder="e.g., contact@globaltech.com" value={formData.email} onChange={handleChange} />
                <InputField label={t('common.phone')} id="phone" name="phone" type="tel" placeholder="e.g., (555) 987-6543" value={formData.phone} onChange={handleChange} />
                <InputField label={t('common.address')} id="address" name="address" placeholder="e.g., 123 Business Rd, Suite 400" value={formData.address} onChange={handleChange} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label={t('modals.addClient.tin')} id="tin" name="tin" placeholder="e.g., 12345678-0001" value={formData.tin || ''} onChange={handleChange} />
                    <InputField label={t('modals.addClient.cac')} id="cacNumber" name="cacNumber" placeholder="e.g., RC123456" value={formData.cacNumber || ''} onChange={handleChange} />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">{t('common.saveChanges')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default EditClientModal;