import React, { useState, useEffect } from 'react';
import ModalBase from './ModalBase';
import type { Transporter } from '../../types';
import { useTranslation } from 'react-i18next';
import StarRating from '../StarRating';

interface EditTransporterModalProps {
    onClose: () => void;
    onSave: (transporter: Transporter) => void;
    client: Transporter | null;
}

const InputField: React.FC<{label: string, id: string, name: string, type?: string, placeholder: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, id, name, type = 'text', placeholder, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={name} placeholder={placeholder} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" required />
    </div>
);

const EditTransporterModal: React.FC<EditTransporterModalProps> = ({ onClose, onSave, client }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<Transporter | null>(client);

    useEffect(() => {
        setFormData(client);
    }, [client]);
    
    if (!formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? ({...prev, [name]: value}) : null);
    };

    const handleRatingChange = (newRating: number) => {
        setFormData(prev => prev ? ({...prev, rating: newRating }) : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    return (
        <ModalBase title={t('modals.editTransporter.title')} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField label={t('common.name')} id="name" name="name" placeholder="e.g., FastLane Logistics" value={formData.name} onChange={handleChange} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label={t('common.email')} id="contactEmail" name="contactEmail" type="email" placeholder="e.g., contact@fastlane.com" value={formData.contactEmail} onChange={handleChange} />
                    <InputField label={t('common.phone')} id="contactPhone" name="contactPhone" type="tel" placeholder="e.g., (555) 123-4567" value={formData.contactPhone} onChange={handleChange} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('components.transportersTable.rating')}</label>
                    <StarRating rating={formData.rating} onRatingChange={handleRatingChange} />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">{t('common.saveChanges')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default EditTransporterModal;