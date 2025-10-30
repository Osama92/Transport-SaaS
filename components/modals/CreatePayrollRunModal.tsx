import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';

interface CreatePayrollRunModalProps {
    onClose: () => void;
    onConfirm: (periodStart: string, periodEnd: string) => void;
    isCreating?: boolean;
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

const CreatePayrollRunModal: React.FC<CreatePayrollRunModalProps> = ({ onClose, onConfirm, isCreating = false }) => {
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
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isCreating}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isCreating && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isCreating ? 'Creating...' : t('modals.createPayrollRun.createButton')}
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default CreatePayrollRunModal;