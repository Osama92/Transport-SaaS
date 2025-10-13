import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import type { Driver } from '../../types';

interface EditDriverModalProps {
    driver: Driver;
    onClose: () => void;
    onSave: (driverId: string, updates: Partial<Driver>) => void;
}

const InputField: React.FC<{
    label: string;
    id: string;
    name: string;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}> = ({ label, id, name, type = 'text', value, onChange, required = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
        </label>
        <input
            type={type}
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
        />
    </div>
);

const EditDriverModal: React.FC<EditDriverModalProps> = ({ driver, onClose, onSave }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: driver.name || '',
        email: driver.email || '',
        phone: driver.phone || '',
        licenseNumber: driver.licenseNumber || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(driver.id, formData);
        onClose();
    };

    return (
        <ModalBase title="Edit Driver Details" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField
                    label="Driver Name"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <InputField
                    label="Email"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                <InputField
                    label="Phone"
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                />
                <InputField
                    label="License Number"
                    id="licenseNumber"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    required
                />

                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700"
                    >
                        Save Changes
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default EditDriverModal;
