import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import PaystackWalletFunding from '../PaystackWalletFunding';
import OrganizationVirtualAccount from '../OrganizationVirtualAccount';

interface ManageFundsModalProps {
    currentBalance: number;
    driverId?: string;
    driverName?: string;
    driverEmail?: string;
    organizationId?: string;
    onClose: () => void;
    onAddFunds: (amount: number, method: string) => Promise<void>;
    onSuccess?: () => void;
}

const ManageFundsModal: React.FC<ManageFundsModalProps> = ({
    currentBalance,
    driverId,
    driverName,
    driverEmail,
    organizationId,
    onClose,
    onAddFunds,
    onSuccess
}) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'virtual_account' | 'paystack' | 'bank_transfer' | 'card' | 'manual'>('virtual_account');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPaystackModal, setShowPaystackModal] = useState(false);
    const [showVirtualAccount, setShowVirtualAccount] = useState(false);

    const isOrganizationWallet = !driverId; // If no driverId, it's an organization wallet

    const quickAmounts = [10000, 50000, 100000, 500000, 1000000];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // If virtual account is selected for organization, show virtual account details
        // No amount validation needed - user transfers any amount they want
        if (paymentMethod === 'virtual_account' && isOrganizationWallet) {
            setShowVirtualAccount(true);
            return;
        }

        // For other payment methods that require amount, validate
        const numericAmount = parseFloat(amount.replace(/,/g, ''));

        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (numericAmount < 100) {
            setError('Minimum top-up amount is ₦100');
            return;
        }

        // If Paystack payment method is selected and we have driver info, show Paystack modal
        if (paymentMethod === 'paystack' && driverId && driverName && organizationId) {
            setShowPaystackModal(true);
            return;
        }

        // If we get here, show error - all valid payment methods should be handled above
        setError('Please select a valid payment method');
    };

    const handleQuickAmount = (value: number) => {
        setAmount(value.toLocaleString());
    };

    return (
        <>
        <ModalBase isOpen={true} onClose={onClose} title="Fund Your Wallet">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Balance Display */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                    <p className="text-sm opacity-90 mb-1">Current Available Balance</p>
                    <h2 className="text-3xl font-bold">{formatCurrency(currentBalance)}</h2>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 dark:bg-red-900/20 dark:border-red-800">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                )}

                {/* Payment Method Selection */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Payment Method
                    </label>
                    <div className="space-y-2">
                        {/* Virtual Account (LIVE - Recommended for Organizations) */}
                        {isOrganizationWallet && (
                            <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentMethod === 'virtual_account'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
                            }`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="virtual_account"
                                    checked={paymentMethod === 'virtual_account'}
                                    onChange={(e) => setPaymentMethod(e.target.value as 'virtual_account')}
                                    className="w-4 h-4 text-green-600"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Virtual Account (LIVE)
                                        </p>
                                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                            Recommended
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Instant bank transfer - automatic credit
                                    </p>
                                </div>
                            </label>
                        )}

                        {/* Paystack Payment (Active for Drivers) */}
                        {!isOrganizationWallet && (
                            <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentMethod === 'paystack'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
                            }`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="paystack"
                                    checked={paymentMethod === 'paystack'}
                                    onChange={(e) => setPaymentMethod(e.target.value as 'paystack')}
                                    className="w-4 h-4 text-green-600"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Paystack (Recommended)
                                        </p>
                                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                            Active
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Pay with card, bank transfer, or USSD
                                    </p>
                                </div>
                            </label>
                        )}

                    </div>
                </div>

                {/* Info Note */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 dark:bg-green-900/20 dark:border-green-800">
                    <div className="flex gap-2">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-green-800 dark:text-green-300">
                            <p className="font-semibold mb-1">Live Payment - Production Ready</p>
                            <p className="text-xs">
                                Secure payments via Paystack. Your wallet will be credited automatically within 30-60 seconds.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl">
                        {isOrganizationWallet && paymentMethod === 'virtual_account'
                            ? 'View Account Details'
                            : 'Continue to Payment'}
                    </button>
                </div>
            </form>
        </ModalBase>

        {/* Paystack Payment Modal */}
        {showPaystackModal && driverId && driverName && organizationId && (
            <PaystackWalletFunding
                driverId={driverId}
                driverName={driverName}
                driverEmail={driverEmail || ''}
                organizationId={organizationId}
                onSuccess={() => {
                    setShowPaystackModal(false);
                    if (onSuccess) onSuccess();
                    onClose();
                }}
                onClose={() => setShowPaystackModal(false)}
            />
        )}

        {/* Virtual Account Modal */}
        {showVirtualAccount && isOrganizationWallet && (
            <ModalBase isOpen={true} onClose={() => setShowVirtualAccount(false)} title="Fund Wallet - Live">
                <OrganizationVirtualAccount onClose={() => {
                    setShowVirtualAccount(false);
                    onClose();
                }} />
            </ModalBase>
        )}
        </>
    );
};

export default ManageFundsModal;
