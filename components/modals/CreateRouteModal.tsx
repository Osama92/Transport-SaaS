import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';

interface CreateRouteModalProps {
    onClose: () => void;
    onAddRoute: (routeData: { distanceKm: number, rate: number, stops: number }) => void;
}

const InputField: React.FC<{label: string, id: string, placeholder: string, type?: string, required?: boolean, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, id, placeholder, type = 'text', required = false, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} placeholder={placeholder} required={required} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const CreateRouteModal: React.FC<CreateRouteModalProps> = ({ onClose, onAddRoute }) => {
    const { t } = useTranslation();
    const [distance, setDistance] = useState('');
    const [rate, setRate] = useState('');
    const [stops, setStops] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddRoute({
            distanceKm: Number(distance),
            rate: Number(rate),
            stops: Number(stops),
        });
    };

    return (
        <ModalBase title={t('modals.createRoute.title')} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField 
                    label={t('modals.createRoute.distance')}
                    id="distance" 
                    type="number" 
                    placeholder="e.g., 150" 
                    value={distance} 
                    onChange={(e) => setDistance(e.target.value)} 
                    required 
                />
                <InputField 
                    label={t('modals.createRoute.stops')}
                    id="stops" 
                    type="number" 
                    placeholder="e.g., 12" 
                    value={stops} 
                    onChange={(e) => setStops(e.target.value)} 
                    required 
                />
                <InputField 
                    label={t('modals.createRoute.rate')}
                    id="rate" 
                    type="number" 
                    placeholder="e.g., 250.00" 
                    value={rate} 
                    onChange={(e) => setRate(e.target.value)} 
                    required 
                />
                
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">{t('modals.createRoute.saveButton')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default CreateRouteModal;