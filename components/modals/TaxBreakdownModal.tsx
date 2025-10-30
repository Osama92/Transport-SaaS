import React from 'react';
import ModalBase from './ModalBase';

interface TaxBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    taxData: {
        grossIncome: number;
        cra: number;
        nhfContribution: number;
        nhisContribution: number;
        pensionContribution: number;
        loanInterest: number;
        lifeInsurance: number;
        annualRent: number;
        totalDeductions: number;
        taxableIncome: number;
        taxBreakdown: Array<{bracket: string; rate: string; amount: number}>;
        totalTax: number;
        netAnnualPay: number;
        monthlyPay: number;
        monthlyTax: number;
        effectiveTaxRate: number;
    };
}

const TaxBreakdownModal: React.FC<TaxBreakdownModalProps> = ({ isOpen, onClose, taxData }) => {
    if (!isOpen) return null;
    const formatCurrency = (amount: number) => {
        return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    return (
        <ModalBase title="PAYE Calculation - New Law" onClose={onClose} zIndex="z-[60]">
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Income Breakdown Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Income Breakdown</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Gross Annual Income</span>
                            <span className="font-semibold text-blue-900 dark:text-blue-300">{formatCurrency(taxData.grossIncome)}</span>
                        </div>
                        {taxData.nhfContribution > 0 && (
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>NHF Contribution</span>
                                <span>{formatCurrency(taxData.nhfContribution)}</span>
                            </div>
                        )}
                        {taxData.nhisContribution > 0 && (
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>NHIS Contribution</span>
                                <span>{formatCurrency(taxData.nhisContribution)}</span>
                            </div>
                        )}
                        {taxData.pensionContribution > 0 && (
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Pension Contribution</span>
                                <span>{formatCurrency(taxData.pensionContribution)}</span>
                            </div>
                        )}
                        {taxData.loanInterest > 0 && (
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Interest on Loan (Owner Occupied House)</span>
                                <span>{formatCurrency(taxData.loanInterest)}</span>
                            </div>
                        )}
                        {taxData.lifeInsurance > 0 && (
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Life Insurance Premium</span>
                                <span>{formatCurrency(taxData.lifeInsurance)}</span>
                            </div>
                        )}
                        {taxData.annualRent > 0 && (
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Annual Rent</span>
                                <span>{formatCurrency(taxData.annualRent)}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-blue-300 dark:border-blue-700">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Taxable Income</span>
                            <span className="font-semibold text-blue-900 dark:text-blue-300">{formatCurrency(taxData.taxableIncome)}</span>
                        </div>
                    </div>
                </div>

                {/* Tax Brackets Section */}
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Tax Brackets</h3>
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-700 dark:text-gray-400 pb-2 border-b border-gray-300 dark:border-slate-600">
                            <span>Taxable Income</span>
                            <span className="text-center">Tax Due</span>
                            <span className="text-right">Amount</span>
                        </div>
                        {taxData.taxBreakdown.map((bracket, index) => {
                            const isActive = bracket.amount > 0 || bracket.rate === '0%';
                            return (
                                <div
                                    key={index}
                                    className={`grid grid-cols-3 gap-2 text-sm py-1 ${
                                        isActive
                                            ? 'text-gray-900 dark:text-gray-100'
                                            : 'text-gray-400 dark:text-gray-600'
                                    }`}
                                >
                                    <span>{bracket.bracket}</span>
                                    <span className="text-center font-medium">{bracket.rate}</span>
                                    <span className="text-right font-semibold">
                                        {bracket.amount > 0 ? formatCurrency(bracket.amount) : '₦0'}
                                    </span>
                                </div>
                            );
                        })}
                        <div className="grid grid-cols-3 gap-2 text-sm font-bold pt-2 border-t border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100">
                            <span>Total</span>
                            <span className="text-center"></span>
                            <span className="text-right text-green-600 dark:text-green-400">{formatCurrency(taxData.totalTax)}</span>
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3">Summary - New Law</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Monthly Salary</span>
                            <span className="font-semibold text-green-900 dark:text-green-300">{formatCurrency(taxData.monthlyPay)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Monthly PAYE Tax</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(taxData.monthlyTax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Effective Tax Rate</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{formatPercentage(taxData.effectiveTaxRate)}</span>
                        </div>
                    </div>
                </div>

                {/* Info Footer */}
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="flex items-start gap-2">
                        <span className="text-yellow-600 dark:text-yellow-400">ℹ️</span>
                        <span>
                            This calculation is based on the NEW Nigerian PIT law (2025+).
                            Your actual tax payable may differ based on additional reliefs and allowances.
                            Source: <a href="https://fiscalreforms.ng/index.php/pit-calculator/" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">fiscalreforms.ng</a>
                        </span>
                    </p>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default TaxBreakdownModal;
