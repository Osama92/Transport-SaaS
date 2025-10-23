import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    ArrowsRightLeftIcon,
    BanknotesIcon,
    DocumentArrowDownIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
} from '../Icons';
import type { WalletTransaction } from '../../types';
import { getTransactionsByOrganization } from '../../services/firestore/transactions';
import ReceivePaymentModal from '../modals/ReceivePaymentModal';
import SendToBankModal from '../modals/SendToBankModal';
import SendToDriverModal from '../modals/SendToDriverModal';

interface WalletScreenProps {
    onBack?: () => void;
}

type ModalType = 'receive' | 'sendBank' | 'sendDriver' | null;

const WalletScreen: React.FC<WalletScreenProps> = ({ onBack }) => {
    const { organization, organizationId } = useAuth();
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
    const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('30days');
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [paystackBalanceInfo, setPaystackBalanceInfo] = useState<string | null>(null);
    const [checkingBalance, setCheckingBalance] = useState(false);

    // Fetch real transactions from Firestore
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!organizationId) return;

            setLoading(true);
            try {
                const fetchedTransactions = await getTransactionsByOrganization(organizationId, 100);
                setTransactions(fetchedTransactions);
                setFilteredTransactions(fetchedTransactions);
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [organizationId]);

    // Calculate wallet statistics
    // Note: Organization stores balance at both walletBalance (flat) and wallet.balance (nested)
    // Using flat structure for compatibility with existing dashboard
    const walletBalance = organization?.walletBalance || organization?.wallet?.balance || 0;
    const totalReceived = transactions
        .filter(t => t.type === 'credit' && t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalSent = transactions
        .filter(t => t.type === 'debit' && t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0);
    const pendingAmount = transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

    // Debug: Log wallet data
    useEffect(() => {
        console.log('🔍 Wallet Debug:', {
            organization,
            walletBalance,
            organizationId,
            hasWallet: !!organization?.wallet,
            walletData: organization?.wallet
        });
    }, [organization, walletBalance, organizationId]);

    // Filter transactions
    useEffect(() => {
        let filtered = transactions;

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        // Filter by date range
        const now = new Date();
        if (dateRange !== 'all') {
            const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
            const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(t => new Date(t.createdAt || '') >= cutoffDate);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.paystackReference?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredTransactions(filtered);
    }, [transactions, filterType, dateRange, searchTerm]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleExportCSV = () => {
        const headers = ['Date', 'Reference', 'Type', 'Description', 'Amount', 'Status', 'Balance After'];
        const rows = filteredTransactions.map(t => [
            formatDate(t.createdAt || ''),
            t.reference,
            t.type.toUpperCase(),
            t.description,
            t.amount,
            t.status,
            t.balanceAfter,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'text-green-600 bg-green-100';
            case 'pending':
                return 'text-yellow-600 bg-yellow-100';
            case 'failed':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const handleCheckPaystackBalance = async () => {
        setCheckingBalance(true);
        setPaystackBalanceInfo(null);
        try {
            const functions = getFunctions();
            const checkBalance = httpsCallable(functions, 'checkPaystackBalance');
            const result = await checkBalance({});
            const data = result.data as { success: boolean; balances: Array<{ currency: string; balance: number; balanceFormatted: string }> };

            if (data.success && data.balances.length > 0) {
                const ngnBalance = data.balances.find(b => b.currency === 'NGN');
                if (ngnBalance) {
                    setPaystackBalanceInfo(`Paystack Transfer Balance: ${ngnBalance.balanceFormatted}`);
                } else {
                    setPaystackBalanceInfo('No NGN balance found');
                }
            }
        } catch (error: any) {
            console.error('Balance check error:', error);
            setPaystackBalanceInfo('Error checking Paystack balance: ' + error.message);
        } finally {
            setCheckingBalance(false);
        }
    };

    return (
        <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
            {/* Header - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">Wallet & Transactions</h1>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your payments and view transaction history</p>
                    {paystackBalanceInfo && (
                        <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                            {paystackBalanceInfo}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={handleCheckPaystackBalance}
                        disabled={checkingBalance}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                    >
                        <BanknotesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline">{checkingBalance ? 'Checking...' : 'Check Balance'}</span>
                        <span className="sm:hidden">{checkingBalance ? '...' : 'Balance'}</span>
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm"
                    >
                        <DocumentArrowDownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline">Export CSV</span>
                        <span className="sm:hidden">Export</span>
                    </button>
                </div>
            </div>

            {/* Balance Cards - Mobile Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {/* Current Balance */}
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 sm:p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-xs sm:text-sm">Current Balance</p>
                            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 sm:mt-2">{formatCurrency(walletBalance)}</h3>
                        </div>
                        <BanknotesIcon className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-indigo-200" />
                    </div>
                    <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-indigo-100">
                        Available: {formatCurrency(walletBalance - pendingAmount)}
                    </div>
                </div>

                {/* Total Received */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Received</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">{formatCurrency(totalReceived)}</h3>
                        </div>
                        <ArrowDownTrayIcon className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
                    </div>
                    <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {transactions.filter(t => t.type === 'credit').length} transactions
                    </div>
                </div>

                {/* Total Sent */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Sent</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">{formatCurrency(totalSent)}</h3>
                        </div>
                        <ArrowUpTrayIcon className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
                    </div>
                    <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {transactions.filter(t => t.type === 'debit').length} transactions
                    </div>
                </div>

                {/* Pending */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Pending</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">{formatCurrency(pendingAmount)}</h3>
                        </div>
                        <ArrowsRightLeftIcon className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500" />
                    </div>
                    <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {transactions.filter(t => t.status === 'pending').length} transactions
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <button
                        onClick={() => setActiveModal('receive')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
                    >
                        <ArrowDownTrayIcon className="h-6 w-6 text-green-600" />
                        <div className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">Receive Payment</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Show account details</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveModal('sendBank')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                        <ArrowUpTrayIcon className="h-6 w-6 text-blue-600" />
                        <div className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">Send to Bank</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Withdraw to account</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveModal('sendDriver')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                        <ArrowsRightLeftIcon className="h-6 w-6 text-purple-600" />
                        <div className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">Send to Driver</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Fund driver wallet</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Filters and Search - Mobile Responsive */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by reference, description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                            />
                        </div>
                    </div>

                    {/* Type Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                    >
                        <option value="all">All Types</option>
                        <option value="credit">Money In</option>
                        <option value="debit">Money Out</option>
                    </select>

                    {/* Date Range Filter */}
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as any)}
                        className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                    >
                        <option value="all">All Time</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="90days">Last 90 Days</option>
                    </select>
                </div>
            </div>

            {/* Transaction List - Scrollable on Mobile */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        Transaction History ({filteredTransactions.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 sm:p-12 text-center text-gray-500 text-sm">Loading transactions...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center text-gray-500 text-sm">No transactions found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Date & Time
                                    </th>
                                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Reference
                                    </th>
                                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Balance
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                                            {formatDate(transaction.createdAt || '')}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                            <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                                                {transaction.reference}
                                            </div>
                                            {transaction.paystackReference && (
                                                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                                    {transaction.paystackReference}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                                            <div className="text-xs sm:text-sm text-gray-900 dark:text-white max-w-[120px] sm:max-w-xs truncate">
                                                {transaction.description}
                                            </div>
                                            {transaction.metadata?.source && (
                                                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                    {transaction.metadata.source.replace('_', ' ')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                            {transaction.type === 'credit' ? (
                                                <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                                                    <ArrowDownTrayIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                    <span className="hidden sm:inline">Money In</span>
                                                    <span className="sm:hidden">In</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-red-100 text-red-800">
                                                    <ArrowUpTrayIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                    <span className="hidden sm:inline">Money Out</span>
                                                    <span className="sm:hidden">Out</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                            <span className={`text-xs sm:text-sm font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                            <span className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm text-gray-900 dark:text-white font-medium">
                                            {formatCurrency(transaction.balanceAfter)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {activeModal === 'receive' && (
                <ReceivePaymentModal
                    onClose={() => setActiveModal(null)}
                />
            )}

            {activeModal === 'sendBank' && (
                <SendToBankModal
                    currentBalance={walletBalance}
                    onClose={() => setActiveModal(null)}
                    onSuccess={async () => {
                        // Refresh transactions after successful transfer
                        if (organizationId) {
                            const fetchedTransactions = await getTransactionsByOrganization(organizationId, 100);
                            setTransactions(fetchedTransactions);
                            setFilteredTransactions(fetchedTransactions);
                        }
                    }}
                />
            )}

            {activeModal === 'sendDriver' && (
                <SendToDriverModal
                    currentBalance={walletBalance}
                    onClose={() => setActiveModal(null)}
                    onSuccess={async () => {
                        // Refresh transactions after successful transfer
                        if (organizationId) {
                            const fetchedTransactions = await getTransactionsByOrganization(organizationId, 100);
                            setTransactions(fetchedTransactions);
                            setFilteredTransactions(fetchedTransactions);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default WalletScreen;
