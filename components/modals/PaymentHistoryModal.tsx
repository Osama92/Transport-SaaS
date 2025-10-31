import React, { useState, useEffect } from 'react';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { getPaymentHistory } from '../../services/firestore/subscriptionPayments';
import type { SubscriptionPayment } from '../../types';
import { Timestamp } from 'firebase/firestore';

interface PaymentHistoryModalProps {
    onClose: () => void;
    onViewPlans: () => void;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ onClose, onViewPlans }) => {
    const { organizationId } = useAuth();
    const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPayments = async () => {
            if (!organizationId) {
                setLoading(false);
                return;
            }

            try {
                // Fetch payment history from Firestore using the proper service
                const paymentData = await getPaymentHistory(organizationId);
                setPayments(paymentData);
            } catch (error) {
                console.error('Error fetching payments:', error);
                setError('Failed to load payment history');
                setPayments([]); // Empty array, no fallback mock data
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, [organizationId]);

    // Format date from Firestore Timestamp or ISO string
    const formatDate = (date: any): string => {
        if (!date) return 'N/A';

        try {
            let dateObj: Date;

            if (date instanceof Timestamp) {
                dateObj = date.toDate();
            } else if (typeof date === 'string') {
                dateObj = new Date(date);
            } else if (date.toDate && typeof date.toDate === 'function') {
                dateObj = date.toDate();
            } else {
                return 'N/A';
            }

            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return 'N/A';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return (
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs font-medium rounded-full">
                        Success
                    </span>
                );
            case 'failed':
                return (
                    <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs font-medium rounded-full">
                        Failed
                    </span>
                );
            case 'pending':
                return (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs font-medium rounded-full">
                        Pending
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <ModalBase title="Payment History" onClose={onClose}>
            <div className="space-y-4">
                {/* Header with View Plans button */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        View all your subscription payments
                    </p>
                    <button
                        onClick={onViewPlans}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600"
                    >
                        View Plans
                    </button>
                </div>

                {/* Error Display */}
                {error && !loading && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                )}

                {/* Payment History Table */}
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading payments...</p>
                    </div>
                ) : payments.length === 0 && !error ? (
                    <div className="text-center py-8">
                        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">No payment history yet</p>
                        <button
                            onClick={onViewPlans}
                            className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
                        >
                            Subscribe to a plan
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Plan</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Amount</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                            {formatDate(payment.paidAt || payment.createdAt)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 font-medium capitalize">
                                            {payment.plan || 'N/A'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-semibold">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                            {payment.paystackReference || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Info Banner */}
                {!loading && payments.length > 0 && (
                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            <span className="font-semibold">Need a receipt?</span> Contact support with your payment reference for an official receipt.
                        </p>
                    </div>
                )}
            </div>
        </ModalBase>
    );
};

export default PaymentHistoryModal;
