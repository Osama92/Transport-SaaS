import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeftIcon, CreditCardIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon } from '../Icons';
import type { SubscriptionPayment } from '../../types';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

interface PaymentHistoryScreenProps {
    onBack: () => void;
}

const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({ onBack }) => {
    const { organization } = useAuth();
    const [paymentHistory, setPaymentHistory] = useState<SubscriptionPayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (organization?.id) {
            fetchPaymentHistory();
        }
    }, [organization?.id]);

    const fetchPaymentHistory = async () => {
        if (!organization?.id) return;

        try {
            setLoading(true);
            const paymentsRef = collection(db, 'subscriptionPayments');
            const q = query(
                paymentsRef,
                where('organizationId', '==', organization.id),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            const payments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SubscriptionPayment));

            setPaymentHistory(payments);
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscription = organization?.subscription;
    const currentPlan = subscription?.plan || 'trial';

    // Calculate subscription metrics
    const totalPayments = paymentHistory.filter(p => p.status === 'success').length;
    const lifetimeValue = paymentHistory
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + p.amount, 0);
    const failedPayments = paymentHistory.filter(p => p.status === 'failed').length;

    // Get plan display info
    const getPlanInfo = (planKey: string) => {
        const plans: Record<string, { name: string; color: string; bgColor: string }> = {
            trial: { name: 'Trial', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
            basic: { name: 'Basic', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
            pro: { name: 'Pro', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
            enterprise: { name: 'Enterprise', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' }
        };
        return plans[planKey.toLowerCase()] || plans.trial;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
            case 'failed':
                return <XCircleIcon className="w-5 h-5 text-red-600" />;
            case 'pending':
                return <ClockIcon className="w-5 h-5 text-yellow-600" />;
            default:
                return <ClockIcon className="w-5 h-5 text-gray-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { text: string; className: string }> = {
            active: { text: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
            trial: { text: 'Trial', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
            inactive: { text: 'Inactive', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
            cancelled: { text: 'Cancelled', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
            attention: { text: 'Attention Required', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
        };
        return badges[status] || badges.inactive;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Payment History
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                View your subscription payment history and billing details
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Subscription Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Subscription Summary
                            </h2>

                            {/* Plan Badge */}
                            <div className="mb-6">
                                <span className={`inline-flex items-center px-4 py-2 rounded-lg text-lg font-semibold ${getPlanInfo(currentPlan).bgColor} ${getPlanInfo(currentPlan).color}`}>
                                    {getPlanInfo(currentPlan).name} Plan
                                </span>
                            </div>

                            {/* Status Badge */}
                            <div className="mb-6">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(subscription?.status || 'inactive').className}`}>
                                    {getStatusBadge(subscription?.status || 'inactive').text}
                                </span>
                            </div>

                            {/* Subscription Details */}
                            <div className="space-y-4">
                                {subscription?.amount && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            ₦{subscription.amount.toLocaleString()}/{subscription.billingInterval || 'month'}
                                        </p>
                                    </div>
                                )}

                                {subscription?.nextPaymentDate && subscription.status === 'active' && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Next Payment</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatDate(subscription.nextPaymentDate)}
                                        </p>
                                    </div>
                                )}

                                {subscription?.trialEndsAt && subscription.status === 'trial' && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <p className="text-sm text-blue-900 dark:text-blue-200">
                                            <span className="font-semibold">Trial Ends:</span> {formatDate(subscription.trialEndsAt)}
                                        </p>
                                    </div>
                                )}

                                {subscription?.pendingDowngrade && (
                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                                                    Downgrade Scheduled
                                                </p>
                                                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                                    Your plan will change to <span className="font-semibold capitalize">{subscription.pendingDowngrade.newPlan}</span> on {formatDate(subscription.pendingDowngrade.effectiveDate)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Subscription Metrics */}
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 space-y-3">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Billing Statistics
                                </h3>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Payments</span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{totalPayments}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Lifetime Value</span>
                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        ₦{lifetimeValue.toLocaleString()}
                                    </span>
                                </div>

                                {failedPayments > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Failed Payments</span>
                                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{failedPayments}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Payment History Timeline */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <CreditCardIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Transaction History
                                </h2>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : paymentHistory.length === 0 ? (
                                <div className="text-center py-12">
                                    <CreditCardIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400">No payment history yet</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                        Payments will appear here once you subscribe to a paid plan
                                    </p>
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Timeline Line */}
                                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700"></div>

                                    {/* Timeline Items */}
                                    <div className="space-y-6">
                                        {paymentHistory.map((payment, index) => (
                                            <div key={payment.id} className="relative flex gap-4">
                                                {/* Timeline Icon */}
                                                <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 flex items-center justify-center">
                                                    {getStatusIcon(payment.status)}
                                                </div>

                                                {/* Content Card */}
                                                <div className="flex-1 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                                {payment.metadata?.type === 'upgrade' ? 'Plan Upgrade' :
                                                                 payment.metadata?.type === 'downgrade' ? 'Plan Downgrade' :
                                                                 payment.metadata?.type === 'prorated' ? 'Prorated Charge' :
                                                                 'Subscription Payment'}
                                                            </h3>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                                                {payment.plan} Plan
                                                                {payment.metadata?.type === 'upgrade' && payment.metadata.previousPlan && (
                                                                    <span className="ml-1">
                                                                        (from <span className="capitalize">{payment.metadata.previousPlan}</span>)
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                                ₦{payment.amount.toLocaleString()}
                                                            </p>
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                payment.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                                payment.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                            }`}>
                                                                {payment.status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                                        <div>
                                                            <p className="text-gray-500 dark:text-gray-500">Reference</p>
                                                            <p className="text-gray-900 dark:text-white font-mono text-xs">
                                                                {payment.paystackReference}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 dark:text-gray-500">Channel</p>
                                                            <p className="text-gray-900 dark:text-white capitalize">
                                                                {payment.channel}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 dark:text-gray-500">Date</p>
                                                            <p className="text-gray-900 dark:text-white">
                                                                {formatDateTime(payment.paidAt || payment.createdAt)}
                                                            </p>
                                                        </div>
                                                        {payment.failureReason && (
                                                            <div className="col-span-2">
                                                                <p className="text-gray-500 dark:text-gray-500">Failure Reason</p>
                                                                <p className="text-red-600 dark:text-red-400">
                                                                    {payment.failureReason}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentHistoryScreen;
