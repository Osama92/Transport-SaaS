import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import type { Driver } from '../../types';

interface EditDriverPayModalProps {
    driver: Driver | null;
    onClose: () => void;
    onSave: (driverId: number, newPayInfo: { baseSalary: number; pensionContributionRate: number; nhfContributionRate: number; }) => void;
}

/**
 * Calculate Nigerian PAYE tax based on 2026 reform
 */
const calculateNigerianPAYE = (annualGross: number, pensionRate: number, nhfRate: number): number => {
    const annualPension = annualGross * (pensionRate / 100);
    const annualNhf = annualGross * (nhfRate / 100);

    // 1. Calculate Consolidated Relief Allowance (CRA)
    const cra = 200000 + (0.20 * annualGross);

    // 2. Determine Total Reliefs
    const totalReliefs = cra + annualPension + annualNhf;

    // 3. Calculate Taxable Income
    let taxableIncome = annualGross - totalReliefs;
    if (taxableIncome <= 0) {
        return Math.max(0.01 * annualGross, 0);
    }

    // 4. Apply Tax Brackets
    let tax = 0;
    if (taxableIncome > 20000000) {
        tax += (taxableIncome - 20000000) * 0.35;
        taxableIncome = 20000000;
    }
    if (taxableIncome > 12000000) {
        tax += (taxableIncome - 12000000) * 0.30;
        taxableIncome = 12000000;
    }
    if (taxableIncome > 8000000) {
        tax += (taxableIncome - 8000000) * 0.25;
        taxableIncome = 8000000;
    }
    if (taxableIncome > 4000000) {
        tax += (taxableIncome - 4000000) * 0.20;
        taxableIncome = 4000000;
    }
    if (taxableIncome > 2000000) {
        tax += (taxableIncome - 2000000) * 0.15;
        taxableIncome = 2000000;
    }
    if (taxableIncome > 0) {
        tax += taxableIncome * 0.10;
    }

    // 5. Apply Minimum Tax Rule
    const minimumTax = 0.01 * annualGross;
    return Math.max(tax, minimumTax);
};

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
    const [pensionRate, setPensionRate] = useState(8); // Default 8%
    const [nhfRate, setNhfRate] = useState(2.5); // Default 2.5%

    useEffect(() => {
        if (driver) {
            // Check both payrollInfo and flat fields for backward compatibility
            const baseSalary = driver.payrollInfo?.baseSalary ?? driver.baseSalary ?? 0;
            const pension = driver.payrollInfo?.pensionContributionRate ?? driver.pensionContributionRate ?? 8;
            const nhf = driver.payrollInfo?.nhfContributionRate ?? driver.nhfContributionRate ?? 2.5;

            setSalary(baseSalary);
            setPensionRate(pension);
            setNhfRate(nhf);
        }
    }, [driver]);

    // Calculate real-time preview
    const calculations = useMemo(() => {
        if (salary <= 0) return null;

        const annualTax = calculateNigerianPAYE(salary, pensionRate, nhfRate);
        const annualPension = salary * (pensionRate / 100);
        const annualNhf = salary * (nhfRate / 100);
        const annualTotalDeductions = annualTax + annualPension + annualNhf;
        const annualNetPay = salary - annualTotalDeductions;

        return {
            monthlyGross: salary / 12,
            monthlyTax: annualTax / 12,
            monthlyPension: annualPension / 12,
            monthlyNhf: annualNhf / 12,
            monthlyTotalDeductions: annualTotalDeductions / 12,
            monthlyNetPay: annualNetPay / 12,
        };
    }, [salary, pensionRate, nhfRate]);

    if (!driver) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(driver.id, {
            baseSalary: salary,
            pensionContributionRate: pensionRate,
            nhfContributionRate: nhfRate,
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
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

                {/* Live Calculation Preview */}
                {calculations && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-3">Monthly Salary Breakdown</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-700 dark:text-gray-300">Gross Pay</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(calculations.monthlyGross)}</span>
                            </div>
                            <div className="border-t border-indigo-200 dark:border-indigo-800 pt-2">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Deductions:</p>
                                <div className="flex justify-between text-red-600 dark:text-red-400">
                                    <span className="ml-2">Tax (PAYE)</span>
                                    <span>{formatCurrency(calculations.monthlyTax)}</span>
                                </div>
                                <div className="flex justify-between text-red-600 dark:text-red-400">
                                    <span className="ml-2">Pension ({pensionRate}%)</span>
                                    <span>{formatCurrency(calculations.monthlyPension)}</span>
                                </div>
                                <div className="flex justify-between text-red-600 dark:text-red-400">
                                    <span className="ml-2">NHF ({nhfRate}%)</span>
                                    <span>{formatCurrency(calculations.monthlyNhf)}</span>
                                </div>
                                <div className="flex justify-between font-medium text-red-700 dark:text-red-300 mt-1 pt-1 border-t border-red-200 dark:border-red-800">
                                    <span className="ml-2">Total Deductions</span>
                                    <span>{formatCurrency(calculations.monthlyTotalDeductions)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between pt-2 border-t-2 border-indigo-300 dark:border-indigo-700">
                                <span className="font-bold text-indigo-900 dark:text-indigo-200">Net Pay</span>
                                <span className="font-bold text-lg text-indigo-900 dark:text-indigo-200">{formatCurrency(calculations.monthlyNetPay)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
                            * Based on Nigerian PAYE tax reform (2026) with progressive brackets
                        </p>
                    </div>
                )}

                 <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">{t('common.saveChanges')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default EditDriverPayModal;