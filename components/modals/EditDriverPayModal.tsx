import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import type { Driver } from '../../types';
import { calculateNigerianPAYE } from '../../firebase/config';
import TaxBreakdownModal from './TaxBreakdownModal';

interface EditDriverPayModalProps {
    driver: Driver | null;
    onClose: () => void;
    onSave: (driverId: number, newPayInfo: {
        baseSalary: number;
        pensionContribution?: number;
        nhfContribution?: number;
        nhisContribution?: number;
        annualRent?: number;
        loanInterest?: number;
        lifeInsurance?: number;
    }) => void;
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
    const [pensionContribution, setPensionContribution] = useState(0);
    const [nhfContribution, setNhfContribution] = useState(0);
    const [nhisContribution, setNhisContribution] = useState(0);
    const [annualRent, setAnnualRent] = useState(0);
    const [loanInterest, setLoanInterest] = useState(0);
    const [lifeInsurance, setLifeInsurance] = useState(0);
    const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
    const [taxData, setTaxData] = useState<any>(null);

    useEffect(() => {
        if (driver) {
            // Check both payrollInfo and flat fields for backward compatibility
            const baseSalary = driver.payrollInfo?.baseSalary ?? driver.baseSalary ?? 0;
            const pension = driver.payrollInfo?.pensionContribution ?? 0;
            const nhf = driver.payrollInfo?.nhfContribution ?? 0;
            const nhis = driver.payrollInfo?.nhisContribution ?? 0;
            const rent = driver.payrollInfo?.annualRent ?? 0;
            const loan = driver.payrollInfo?.loanInterest ?? 0;
            const insurance = driver.payrollInfo?.lifeInsurance ?? 0;

            setSalary(baseSalary);
            setPensionContribution(pension);
            setNhfContribution(nhf);
            setNhisContribution(nhis);
            setAnnualRent(rent);
            setLoanInterest(loan);
            setLifeInsurance(insurance);
        }
    }, [driver]);

    // Calculate real-time preview
    const calculations = useMemo(() => {
        if (salary <= 0) return null;

        const taxCalculation = calculateNigerianPAYE(
            salary,
            pensionContribution,
            nhfContribution,
            nhisContribution,
            loanInterest,
            lifeInsurance,
            annualRent
        );

        const annualTax = taxCalculation.totalTax;
        const annualTotalDeductions = annualTax + pensionContribution + nhfContribution;
        const annualNetPay = salary - annualTotalDeductions;

        return {
            monthlyGross: salary / 12,
            monthlyTax: annualTax / 12,
            monthlyPension: pensionContribution / 12,
            monthlyNhf: nhfContribution / 12,
            monthlyTotalDeductions: annualTotalDeductions / 12,
            monthlyNetPay: annualNetPay / 12,
        };
    }, [salary, pensionContribution, nhfContribution, nhisContribution, loanInterest, lifeInsurance, annualRent]);

    if (!driver) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(driver.id, {
            baseSalary: salary,
            pensionContribution: pensionContribution > 0 ? pensionContribution : undefined,
            nhfContribution: nhfContribution > 0 ? nhfContribution : undefined,
            nhisContribution: nhisContribution > 0 ? nhisContribution : undefined,
            annualRent: annualRent > 0 ? annualRent : undefined,
            loanInterest: loanInterest > 0 ? loanInterest : undefined,
            lifeInsurance: lifeInsurance > 0 ? lifeInsurance : undefined,
        });
    };

    const handlePreviewTax = () => {
        if (!salary || salary <= 0) {
            return;
        }

        const calculation = calculateNigerianPAYE(
            salary,
            pensionContribution,
            nhfContribution,
            nhisContribution,
            loanInterest,
            lifeInsurance,
            annualRent
        );

        setTaxData(calculation);
        setShowTaxBreakdown(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <>
            {showTaxBreakdown && taxData && (
                <TaxBreakdownModal
                    isOpen={showTaxBreakdown}
                    onClose={() => setShowTaxBreakdown(false)}
                    taxData={taxData}
                />
            )}
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

                    {/* NOTE: Bonuses are now managed via the "Add Bonus" button in the Drivers screen */}

                    {/* All Deductions (Optional) */}
                    <div className="border-t pt-4 mt-4 dark:border-slate-700">
                        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Deductions (Optional - All amounts in Naira)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                label="Pension Contribution (Annual ₦)"
                                id="pensionContribution"
                                type="number"
                                value={pensionContribution}
                                onChange={(e) => setPensionContribution(Number(e.target.value))}
                                addon="₦"
                            />
                            <InputField
                                label="NHF Contribution (Annual ₦)"
                                id="nhfContribution"
                                type="number"
                                value={nhfContribution}
                                onChange={(e) => setNhfContribution(Number(e.target.value))}
                                addon="₦"
                            />
                            <InputField
                                label="NHIS Contribution (Annual ₦)"
                                id="nhisContribution"
                                type="number"
                                value={nhisContribution}
                                onChange={(e) => setNhisContribution(Number(e.target.value))}
                                addon="₦"
                            />
                            <InputField
                                label="Annual Rent (₦)"
                                id="annualRent"
                                type="number"
                                value={annualRent}
                                onChange={(e) => setAnnualRent(Number(e.target.value))}
                                addon="₦"
                            />
                            <InputField
                                label="Loan Interest (Annual ₦)"
                                id="loanInterest"
                                type="number"
                                value={loanInterest}
                                onChange={(e) => setLoanInterest(Number(e.target.value))}
                                addon="₦"
                            />
                            <InputField
                                label="Life Insurance Premium (Annual ₦)"
                                id="lifeInsurance"
                                type="number"
                                value={lifeInsurance}
                                onChange={(e) => setLifeInsurance(Number(e.target.value))}
                                addon="₦"
                            />
                        </div>

                        {/* Preview Tax Calculation Button */}
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={handlePreviewTax}
                                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Preview Tax Calculation
                            </button>
                        </div>
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
                                {pensionContribution > 0 && (
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                        <span className="ml-2">Pension</span>
                                        <span>{formatCurrency(calculations.monthlyPension)}</span>
                                    </div>
                                )}
                                {nhfContribution > 0 && (
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                        <span className="ml-2">NHF</span>
                                        <span>{formatCurrency(calculations.monthlyNhf)}</span>
                                    </div>
                                )}
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
        </>
    );
};

export default EditDriverPayModal;