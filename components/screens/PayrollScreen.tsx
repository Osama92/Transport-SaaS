import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PayrollRun, Bonus, DriverExpense } from '../../types';
import { EnvelopeIcon, CalendarDaysIcon, BanknotesIcon } from '../Icons';
import CalendarPopover from '../CalendarPopover';
import { getBonusesByOrganization, approveBonus, rejectBonus } from '../../services/firestore/bonuses';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

interface PayrollScreenProps {
    payrollRuns: PayrollRun[];
    onViewDetails: (run: PayrollRun) => void;
    onRunNewPayroll: () => void;
    onDeletePayrollRun: (run: PayrollRun) => void;
    statusFilter: PayrollRun['status'] | 'All';
    onStatusFilterChange: (status: PayrollRun['status'] | 'All') => void;
    dateFilter: { start: Date | null, end: Date | null };
    onDateFilterChange: (range: { start: Date | null, end: Date | null }) => void;
    isDeletingPayroll?: boolean;
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
    onDateFilterChange,
    isDeletingPayroll = false
}) => {
    const { t } = useTranslation();
    const { organizationId, currentUser } = useAuth();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'payroll' | 'bonuses'>('payroll');

    // Bonuses state
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [bonusesLoading, setBonusesLoading] = useState(false);
    const [bonusFilter, setBonusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Paid'>('All');
    const [processingBonusId, setProcessingBonusId] = useState<string | null>(null);

    // Driver Expenses state
    const [driverExpenses, setDriverExpenses] = useState<DriverExpense[]>([]);
    const [expensesLoading, setExpensesLoading] = useState(false);
    const [processingExpenseId, setProcessingExpenseId] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load bonuses and expenses when tab is switched
    useEffect(() => {
        if (activeTab === 'bonuses') {
            loadBonusesAndExpenses();
        }
    }, [activeTab, organizationId]);

    const loadBonuses = async () => {
        if (!organizationId) return;

        try {
            setBonusesLoading(true);
            const fetchedBonuses = await getBonusesByOrganization(organizationId);
            setBonuses(fetchedBonuses);
        } catch (error) {
            console.error('Error loading bonuses:', error);
            alert('Failed to load bonuses');
        } finally {
            setBonusesLoading(false);
        }
    };

    const loadDriverExpenses = async () => {
        if (!organizationId) return;

        try {
            setExpensesLoading(true);
            const expensesRef = collection(db, 'driverExpenses');
            const q = query(
                expensesRef,
                where('organizationId', '==', organizationId),
                orderBy('expenseDate', 'desc')
            );
            const snapshot = await getDocs(q);
            const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverExpense));
            setDriverExpenses(expensesData);
        } catch (error) {
            console.error('Error loading driver expenses:', error);
            alert('Failed to load driver expenses');
        } finally {
            setExpensesLoading(false);
        }
    };

    const loadBonusesAndExpenses = async () => {
        await Promise.all([loadBonuses(), loadDriverExpenses()]);
    };

    const handleApproveBonus = async (bonus: Bonus) => {
        if (!currentUser?.uid || !organizationId) return;

        const confirmed = window.confirm(
            `Approve bonus of ₦${bonus.amount.toLocaleString()} for ${bonus.driverName}?\n\n` +
            `Reason: ${bonus.reason}\n` +
            `Pay Period: ${bonus.payPeriod}\n\n` +
            `This bonus will be included in the next payroll run.`
        );

        if (!confirmed) return;

        try {
            setProcessingBonusId(bonus.id);
            await approveBonus(bonus.id, currentUser.uid, organizationId);
            alert('Bonus approved successfully!');
            await loadBonuses();
        } catch (error) {
            console.error('Error approving bonus:', error);
            alert('Failed to approve bonus. Please try again.');
        } finally {
            setProcessingBonusId(null);
        }
    };

    const handleRejectBonus = async (bonus: Bonus) => {
        if (!currentUser?.uid || !organizationId) return;

        const reason = prompt(
            `Reject bonus of ₦${bonus.amount.toLocaleString()} for ${bonus.driverName}?\n\n` +
            `Please provide a reason for rejection (optional):`
        );

        if (reason === null) return; // User cancelled

        try {
            setProcessingBonusId(bonus.id);
            await rejectBonus(bonus.id, currentUser.uid, organizationId, reason || undefined);
            alert('Bonus rejected and removed.');
            await loadBonuses();
        } catch (error) {
            console.error('Error rejecting bonus:', error);
            alert('Failed to reject bonus. Please try again.');
        } finally {
            setProcessingBonusId(null);
        }
    };

    const handleApproveExpense = async (expense: DriverExpense) => {
        if (!currentUser?.uid || !organizationId) return;

        const confirmed = window.confirm(
            `Approve expense of ₦${expense.amount.toLocaleString()}?\n\n` +
            `Driver: ${expense.driverName || 'Unknown'}\n` +
            `Type: ${expense.type}\n` +
            `Description: ${expense.description}\n\n` +
            `This amount will be added to the driver's wallet balance.`
        );

        if (!confirmed) return;

        try {
            setProcessingExpenseId(expense.id);
            const expenseRef = doc(db, 'driverExpenses', expense.id);
            await updateDoc(expenseRef, {
                status: 'approved',
                approvedBy: currentUser.uid,
                approvedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            alert('Expense approved successfully!');
            await loadDriverExpenses();
        } catch (error) {
            console.error('Error approving expense:', error);
            alert('Failed to approve expense. Please try again.');
        } finally {
            setProcessingExpenseId(null);
        }
    };

    const handleRejectExpense = async (expense: DriverExpense) => {
        if (!currentUser?.uid || !organizationId) return;

        const reason = prompt(
            `Reject expense of ₦${expense.amount.toLocaleString()}?\n\n` +
            `Please provide a reason for rejection:`
        );

        if (reason === null || reason.trim() === '') return; // User cancelled or didn't provide reason

        try {
            setProcessingExpenseId(expense.id);
            const expenseRef = doc(db, 'driverExpenses', expense.id);
            await updateDoc(expenseRef, {
                status: 'rejected',
                rejectionReason: reason.trim(),
                rejectedBy: currentUser.uid,
                rejectedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            alert('Expense rejected.');
            await loadDriverExpenses();
        } catch (error) {
            console.error('Error rejecting expense:', error);
            alert('Failed to reject expense. Please try again.');
        } finally {
            setProcessingExpenseId(null);
        }
    };

    const calculateTotal = (payslips: PayrollRun['payslips']) => {
        if (!payslips || payslips.length === 0) return 0;
        return payslips.reduce((sum, item) => sum + item.netPay, 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const getBonusStatusBadge = (status: string) => {
        const styles = {
            Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            Approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            Paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    const getBonusTypeBadge = (type: string) => {
        const styles = {
            'One-Time': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            'Recurring': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {type}
            </span>
        );
    };

    const getExpenseTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            'Tolls': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            'Parking': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
            'Maintenance': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
            'Meals': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'Accommodation': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
            'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
                {type}
            </span>
        );
    };

    const getExpenseStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            'approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            'reimbursed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const filteredBonuses = bonuses.filter(bonus => {
        if (bonusFilter === 'All') return true;
        return bonus.status === bonusFilter;
    });

    const pendingBonusCount = bonuses.filter(b => b.status === 'Pending').length;
    const approvedBonusCount = bonuses.filter(b => b.status === 'Approved').length;
    const paidBonusCount = bonuses.filter(b => b.status === 'Paid').length;

    // Expense counts
    const pendingExpenseCount = driverExpenses.filter(e => e.status === 'pending').length;
    const approvedExpenseCount = driverExpenses.filter(e => e.status === 'approved').length;
    const reimbursedExpenseCount = driverExpenses.filter(e => e.status === 'reimbursed').length;

    // Combined items (bonuses + expenses) filtered by status
    type CombinedItem = (Bonus & { itemType: 'bonus' }) | (DriverExpense & { itemType: 'expense' });
    const combinedItems: CombinedItem[] = [
        ...bonuses.map(b => ({ ...b, itemType: 'bonus' as const })),
        ...driverExpenses.map(e => ({ ...e, itemType: 'expense' as const }))
    ];

    const filteredCombinedItems = combinedItems.filter(item => {
        if (bonusFilter === 'All') return true;
        if (item.itemType === 'bonus') {
            return item.status === bonusFilter;
        } else {
            // Map expense status to bonus filter
            if (bonusFilter === 'Pending') return item.status === 'pending';
            if (bonusFilter === 'Approved') return item.status === 'approved' || item.status === 'reimbursed';
            return false;
        }
    });

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('screens.payroll.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activeTab === 'payroll' ? t('screens.payroll.subtitle') : 'Manage driver bonuses, expenses and approvals'}
                    </p>
                </div>
                <button onClick={onRunNewPayroll} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <EnvelopeIcon className="w-5 h-5"/> {t('screens.payroll.runNew')}
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-1 flex gap-1">
                <button
                    onClick={() => setActiveTab('payroll')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'payroll'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                >
                    <EnvelopeIcon className="w-5 h-5" />
                    Payroll Runs
                </button>
                <button
                    onClick={() => setActiveTab('bonuses')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors relative ${
                        activeTab === 'bonuses'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                >
                    <BanknotesIcon className="w-5 h-5" />
                    Bonuses & Expenses
                    {(pendingBonusCount + pendingExpenseCount) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {pendingBonusCount + pendingExpenseCount}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'payroll' ? (
                <>
                    {/* Payroll Filters */}
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

                    {/* Payroll Table */}
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
                                                            disabled={isDeletingPayroll}
                                                            className="text-sm font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:text-red-400 dark:border-red-800/50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                                            {isDeletingPayroll && (
                                                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            )}
                                                            {isDeletingPayroll ? 'Deleting...' : 'Delete'}
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
                </>
            ) : (
                <>
                    {/* Bonuses & Expenses Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{bonuses.length + driverExpenses.length}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{bonuses.length} bonuses, {driverExpenses.length} expenses</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <BanknotesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{pendingBonusCount + pendingExpenseCount}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{pendingBonusCount} bonuses, {pendingExpenseCount} expenses</p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{approvedBonusCount + approvedExpenseCount}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{approvedBonusCount} bonuses, {approvedExpenseCount} expenses</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid / Reimbursed</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{paidBonusCount + reimbursedExpenseCount}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{paidBonusCount} bonuses, {reimbursedExpenseCount} expenses</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bonus & Expense Filter Tabs */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-1 flex gap-1">
                        {(['All', 'Pending', 'Approved', 'Paid'] as const).map((status) => {
                            const getCount = () => {
                                if (status === 'Pending') return pendingBonusCount + pendingExpenseCount;
                                if (status === 'Approved') return approvedBonusCount + approvedExpenseCount;
                                if (status === 'Paid') return paidBonusCount + reimbursedExpenseCount;
                                return combinedItems.length;
                            };

                            return (
                                <button
                                    key={status}
                                    onClick={() => setBonusFilter(status)}
                                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        bonusFilter === status
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {status}
                                    {status !== 'All' && (
                                        <span className="ml-1.5 text-xs opacity-75">
                                            ({getCount()})
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Bonuses & Expenses Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                        {(bonusesLoading || expensesLoading) ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : filteredCombinedItems.length === 0 ? (
                            <div className="text-center py-12">
                                <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No items found</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {bonusFilter === 'All' ? 'No bonuses or expenses have been created yet.' : `No ${bonusFilter.toLowerCase()} bonuses or expenses.`}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                    <thead className="bg-gray-50 dark:bg-slate-900">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                        {filteredCombinedItems.map((item) => {
                                            const isBonus = item.itemType === 'bonus';
                                            const isExpense = item.itemType === 'expense';
                                            const isPending = isBonus ? item.status === 'Pending' : item.status === 'pending';

                                            return (
                                                <tr key={`${item.itemType}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    {/* Item Type */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                            isBonus
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                                        }`}>
                                                            {isBonus ? '💰 Bonus' : '📝 Expense'}
                                                        </span>
                                                    </td>

                                                    {/* Driver */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {isBonus ? item.driverName : (item.driverName || 'Unknown')}
                                                        </div>
                                                    </td>

                                                    {/* Amount */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            ₦{item.amount.toLocaleString()}
                                                        </div>
                                                    </td>

                                                    {/* Description/Reason */}
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900 dark:text-gray-300 max-w-xs truncate"
                                                             title={isBonus ? item.reason : item.description}>
                                                            {isBonus ? item.reason : item.description}
                                                        </div>
                                                    </td>

                                                    {/* Type */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {isBonus ? getBonusTypeBadge(item.type) : getExpenseTypeBadge(item.type)}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {isBonus ? getBonusStatusBadge(item.status) : getExpenseStatusBadge(item.status)}
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {isBonus ? formatDate(item.createdAt) : formatDate(item.expenseDate)}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        {isPending && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => isBonus ? handleApproveBonus(item as Bonus) : handleApproveExpense(item as DriverExpense)}
                                                                    disabled={isBonus ? processingBonusId === item.id : processingExpenseId === item.id}
                                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {(isBonus ? processingBonusId === item.id : processingExpenseId === item.id) ? (
                                                                        <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => isBonus ? handleRejectBonus(item as Bonus) : handleRejectExpense(item as DriverExpense)}
                                                                    disabled={isBonus ? processingBonusId === item.id : processingExpenseId === item.id}
                                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {(isBonus ? processingBonusId === item.id : processingExpenseId === item.id) ? (
                                                                        <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    )}
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                        {!isPending && isBonus && item.status === 'Approved' && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                Awaiting payroll
                                                            </span>
                                                        )}
                                                        {!isPending && isBonus && item.status === 'Paid' && item.approvedAt && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                Paid {formatDate(item.approvedAt)}
                                                            </div>
                                                        )}
                                                        {!isPending && isExpense && item.status === 'approved' && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                Approved
                                                            </span>
                                                        )}
                                                        {!isPending && isExpense && item.status === 'reimbursed' && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                Reimbursed
                                                            </div>
                                                        )}
                                                        {!isPending && isExpense && item.status === 'rejected' && item.rejectionReason && (
                                                            <div className="text-xs text-red-600 dark:text-red-400" title={item.rejectionReason}>
                                                                Rejected
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PayrollScreen;
