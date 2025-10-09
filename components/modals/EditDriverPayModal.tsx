import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import type { Driver } from '../../types';

interface EditDriverPayModalProps {
    driver: Driver | null;
    onClose: () => void;
    onSave: (driverId: number, newPayInfo: { baseSalary: number; pensionContributionRate: number; nhfContributionRate: number; }) => void;
}

const InputField: React.FC<{ label: string; id: string; type: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; addon?: string }> = 
    ({ label, id, type, value, onChange, addon }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <div className="relative">
            {addon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 dark:text-gray-400 sm:text-sm">{addon}</span></div>}
            <input
                type={type}
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                className={`w-full py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 ${addon ? 'pl-7 pr-4' : 'px-4'}`}
                required
            />
        </div>
    </div>
);


const EditDriverPayModal: React.FC<EditDriverPayModalProps> = ({ driver, onClose, onSave }) => {
    const { t } = useTranslation();
    const [salary, setSalary] = useState(0);
    const [pensionRate, setPensionRate] = useState(0);
    const [nhfRate, setNhfRate] = useState(0);

    useEffect(() => {
        if (driver) {
            setSalary(driver.baseSalary || 0);
            setPensionRate(driver.pensionContributionRate || 0);
            setNhfRate(driver.nhfContributionRate || 0);
        }
    }, [driver]);

    if (!driver) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(driver.id, {
            baseSalary: salary,
            pensionContributionRate: pensionRate,
            nhfContributionRate: nhfRate,
        });
    };

    return (
        <ModalBase title={t('screens.payroll.editPayTitle', { name: driver.name })} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <InputField
                    label={t('screens.payroll.annualSalary')}
                    id="baseSalary"
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    addon="₦"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <InputField
                        label={t('screens.payroll.pensionRate')}
                        id="pensionRate"
                        type="number"
                        value={pensionRate}
                        onChange={(e) => setPensionRate(Number(e.target.value))}
                        addon="%"
                    />
                     <InputField
                        label={t('screens.payroll.nhfRate')}
                        id="nhfRate"
                        type="number"
                        value={nhfRate}
                        onChange={(e) => setNhfRate(Number(e.target.value))}
                        addon="%"
                    />
                </div>
                 <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">{t('common.saveChanges')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default EditDriverPayModal;