import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import type { Route, Expense } from '../../types';

interface AddExpenseModalProps {
    onClose: () => void;
    route: Route | null;
    onSave: (routeId: string, newExpense: Expense) => void;
}

const InputField: React.FC<{label: string, id: string, name: string, type?: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean}> = 
    ({ label, id, name, type = 'text', value, onChange, required=false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={name} value={value} onChange={onChange} required={required} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);


const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose, route, onSave }) => {
    const { t } = useTranslation();
    const [expense, setExpense] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Fuel' as Expense['type'],
        description: '',
        amount: ''
    });

    if (!route) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setExpense(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newExpense: Expense = {
            id: `E${Date.now()}`,
            ...expense,
            amount: Number(expense.amount),
        };
        onSave(route.id, newExpense);
    };

    return (
        <ModalBase title={t('addExpense.title', { routeId: route.id })} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('addExpense.type')}</label>
                        <select id="type" name="type" value={expense.type} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                            <option value="Fuel">{t('addExpense.types.fuel')}</option>
                            <option value="Tolls">{t('addExpense.types.tolls')}</option>
                            <option value="Maintenance">{t('addExpense.types.maintenance')}</option>
                            <option value="Other">{t('addExpense.types.other')}</option>
                        </select>
                    </div>
                    <InputField label={t('common.date')} id="date" name="date" type="date" value={expense.date} onChange={handleChange} required />
                </div>
                <InputField label={t('addExpense.amount')} id="amount" name="amount" type="number" value={expense.amount} onChange={handleChange} required />
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.description')}</label>
                    <textarea id="description" name="description" value={expense.description} onChange={handleChange} rows={3} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" required></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">{t('addExpense.saveButton')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default AddExpenseModal;