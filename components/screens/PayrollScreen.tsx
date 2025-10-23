import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PayrollRun } from '../../types';
import { EnvelopeIcon, CalendarDaysIcon } from '../Icons';
import CalendarPopover from '../CalendarPopover';

interface PayrollScreenProps {
    payrollRuns: PayrollRun[];
    onViewDetails: (run: PayrollRun) => void;
    onRunNewPayroll: () => void;
    onDeletePayrollRun: (run: PayrollRun) => void;
    statusFilter: PayrollRun['status'] | 'All';
    onStatusFilterChange: (status: PayrollRun['status'] | 'All') => void;
    dateFilter: { start: Date | null, end: Date | null };
    onDateFilterChange: (range: { start: Date | null, end: Date | null }) => void;
}

const StatusBadge: React.FC<{ status: PayrollRun['status'] }> = ({ status }) => {
    const statusClasses = {
        'Paid': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Processed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        'Draft': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status]}`}>{status}</span>;
};

const FilterButton: React.FC<{
    label: PayrollRun['status'] | 'All';
    activeFilter: PayrollRun['status'] | 'All';
    onClick: (status: PayrollRun['status'] | 'All') => void;
}> = ({ label, activeFilter, onClick }) => (
    <button
        onClick={() => onClick(label)}
        className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            activeFilter === label 
            ? 'bg-indigo-500 text-white' 
            : 'text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
        }`}
    >
        {label}
    </button>
);


const PayrollScreen: React.FC<PayrollScreenProps> = ({
    payrollRuns,
    onViewDetails,
    onRunNewPayroll,
    onDeletePayrollRun,
    statusFilter,
    onStatusFilterChange,
    dateFilter,
    onDateFilterChange
}) => {
    const { t } = useTranslation();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const calculateTotal = (payslips: PayrollRun['payslips']) => {
        if (!payslips || payslips.length === 0) return 0;
        return payslips.reduce((sum, item) => sum + item.netPay, 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('screens.payroll.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('screens.payroll.subtitle')}</p>
                </div>
                <button onClick={onRunNewPayroll} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <EnvelopeIcon className="w-5 h-5"/> {t('screens.payroll.runNew')}
                </button>
            </div>
            
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Status:</span>
                    <FilterButton label="All" activeFilter={statusFilter} onClick={onStatusFilterChange} />
                    <FilterButton label="Draft" activeFilter={statusFilter} onClick={onStatusFilterChange} />
                    <FilterButton label="Processed" activeFilter={statusFilter} onClick={onStatusFilterChange} />
                    <FilterButton label="Paid" activeFilter={statusFilter} onClick={onStatusFilterChange} />
                </div>
                <div className="relative ml-auto" ref={calendarRef}>
                    <button onClick={() => setIsCalendarOpen(prev => !prev)} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600">
                        <CalendarDaysIcon className="w-5 h-5"/>
                        <span>{dateFilter.start && dateFilter.end ? `${dateFilter.start.toLocaleDateString()} - ${dateFilter.end.toLocaleDateString()}` : 'Filter by Date'}</span>
                    </button>
                    {isCalendarOpen && (
                        <CalendarPopover
                            initialRange={{ start: dateFilter.start || new Date(), end: dateFilter.end || new Date() }}
                            onApply={(range) => {
                                onDateFilterChange(range);
                                setIsCalendarOpen(false);
                            }}
                            onClose={() => setIsCalendarOpen(false)}
                        />
                    )}
                </div>
                { (dateFilter.start || dateFilter.end) && (
                    <button onClick={() => onDateFilterChange({ start: null, end: null })} className="text-sm font-medium text-indigo-600 hover:underline">
                        Clear Date
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b text-gray-500 dark:border-slate-700 dark:text-gray-400">
                            <tr>
                                <th className="py-3 px-4 font-medium">{t('screens.payroll.period')}</th>
                                <th className="py-3 px-4 font-medium">{t('screens.payroll.payDate')}</th>
                                <th className="py-3 px-4 font-medium">{t('screens.payroll.payslips')}</th>
                                <th className="py-3 px-4 font-medium">{t('screens.payroll.totalAmount')}</th>
                                <th className="py-3 px-4 font-medium">{t('common.status')}</th>
                                <th className="py-3 px-4 font-medium text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollRuns.map((run) => (
                                <tr key={run.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="py-4 px-4 font-semibold text-gray-800 dark:text-gray-100">
                                        {run.periodStart} - {run.periodEnd}
                                    </td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{run.payDate}</td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{run.payslips?.length || 0}</td>
                                    <td className="py-4 px-4 font-semibold text-gray-800 dark:text-gray-100">
                                        {formatCurrency(run.totalNetPay || calculateTotal(run.payslips))}
                                    </td>
                                    <td className="py-4 px-4"><StatusBadge status={run.status} /></td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => onViewDetails(run)} className="text-sm font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800/50 dark:hover:bg-indigo-900/20">
                                                {t('common.details')}
                                            </button>
                                            {run.status === 'Draft' && (
                                                <button
                                                    onClick={() => onDeletePayrollRun(run)}
                                                    className="text-sm font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:text-red-400 dark:border-red-800/50 dark:hover:bg-red-900/20">
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {payrollRuns.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <h3 className="text-lg font-semibold">No payroll runs match your filters</h3>
                            <p className="mt-1">Try adjusting your status or date range.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PayrollScreen;