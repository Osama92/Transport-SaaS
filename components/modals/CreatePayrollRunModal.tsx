import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';

interface CreatePayrollRunModalProps {
    onClose: () => void;
    onConfirm: (periodStart: string, periodEnd: string) => void;
}

const InputField: React.FC<{label: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = 
    ({ label, id, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input 
            type="date" 
            id={id} 
            name={id} 
            value={value} 
            onChange={onChange} 
            required 
            className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" 
        />
    </div>
);

const CreatePayrollRunModal: React.FC<CreatePayrollRunModalProps> = ({ onClose, onConfirm }) => {
    const { t } = useTranslation();
    const [periodStart, setPeriodStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [periodEnd, setPeriodEnd] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (new Date(periodStart) >= new Date(periodEnd)) {
            setError('The start date must be before the end date.');
            return;
        }
        onConfirm(periodStart, periodEnd);
    };

    return (
        <ModalBase title={t('modals.createPayrollRun.title')} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('modals.createPayrollRun.subtitle')}</p>
                {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md dark:bg-red-900/20 dark:text-red-300">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label={t('modals.createPayrollRun.periodStart')} id="periodStart" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                    <InputField label={t('modals.createPayrollRun.periodEnd')} id="periodEnd" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">{t('modals.createPayrollRun.createButton')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default CreatePayrollRunModal;