import React, { useState, useEffect } from 'react';
import { Bonus } from '../../types';
import { getBonusesByOrganization, approveBonus, rejectBonus } from '../../services/firestore/bonuses';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface BonusManagementScreenProps {}

const BonusManagementScreen: React.FC<BonusManagementScreenProps> = () => {
    const { t } = useTranslation();
    const { organizationId, currentUser } = useAuth();
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Paid'>('All');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadBonuses();
    }, [organizationId]);

    const loadBonuses = async () => {
        if (!organizationId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const fetchedBonuses = await getBonusesByOrganization(organizationId);
            setBonuses(fetchedBonuses);
        } catch (error) {
            console.error('Error loading bonuses:', error);
            alert('Failed to load bonuses');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (bonus: Bonus) => {
        if (!currentUser?.uid || !organizationId) return;

        const confirmed = window.confirm(
            `Approve bonus of ₦${bonus.amount.toLocaleString()} for ${bonus.driverName}?\n\n` +
            `Reason: ${bonus.reason}\n` +
            `Pay Period: ${bonus.payPeriod}\n\n` +
            `This bonus will be included in the next payroll run.`
        );

        if (!confirmed) return;

        try {
            setProcessingId(bonus.id);
            await approveBonus(bonus.id, currentUser.uid, organizationId);
            alert('Bonus approved successfully!');
            await loadBonuses();
        } catch (error) {
            console.error('Error approving bonus:', error);
            alert('Failed to approve bonus. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (bonus: Bonus) => {
        if (!currentUser?.uid || !organizationId) return;

        const reason = prompt(
            `Reject bonus of ₦${bonus.amount.toLocaleString()} for ${bonus.driverName}?\n\n` +
            `Please provide a reason for rejection (optional):`
        );

        if (reason === null) return; // User cancelled

        try {
            setProcessingId(bonus.id);
            await rejectBonus(bonus.id, currentUser.uid, organizationId, reason || undefined);
            alert('Bonus rejected and removed.');
            await loadBonuses();
        } catch (error) {
            console.error('Error rejecting bonus:', error);
            alert('Failed to reject bonus. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredBonuses = bonuses.filter(bonus => {
        if (filter === 'All') return true;
        return bonus.status === filter;
    });

    const getStatusBadge = (status: string) => {
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

    const getTypeBadge = (type: string) => {
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

    const pendingCount = bonuses.filter(b => b.status === 'Pending').length;
    const approvedCount = bonuses.filter(b => b.status === 'Approved').length;
    const paidCount = bonuses.filter(b => b.status === 'Paid').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Bonus Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Review and approve driver bonuses
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bonuses</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{bonuses.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{pendingCount}</p>
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
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{approvedCount}</p>
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
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{paidCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-1 flex gap-1">
                {(['All', 'Pending', 'Approved', 'Paid'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            filter === status
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {status}
                        {status !== 'All' && (
                            <span className="ml-1.5 text-xs opacity-75">
                                ({status === 'Pending' ? pendingCount : status === 'Approved' ? approvedCount : paidCount})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Bonuses Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredBonuses.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No bonuses found</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {filter === 'All' ? 'No bonuses have been created yet.' : `No ${filter.toLowerCase()} bonuses.`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                            <thead className="bg-gray-50 dark:bg-slate-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pay Period</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {filteredBonuses.map((bonus) => (
                                    <tr key={bonus.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{bonus.driverName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">₦{bonus.amount.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-gray-300 max-w-xs truncate" title={bonus.reason}>
                                                {bonus.reason}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">{bonus.payPeriod}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getTypeBadge(bonus.type)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(bonus.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDate(bonus.createdAt)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {bonus.status === 'Pending' && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleApprove(bonus)}
                                                        disabled={processingId === bonus.id}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processingId === bonus.id ? (
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
                                                        onClick={() => handleReject(bonus)}
                                                        disabled={processingId === bonus.id}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processingId === bonus.id ? (
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
                                            {bonus.status === 'Approved' && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    Awaiting payroll
                                                </span>
                                            )}
                                            {bonus.status === 'Paid' && bonus.approvedAt && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Paid {formatDate(bonus.approvedAt)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BonusManagementScreen;
