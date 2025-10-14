import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';

interface ManageFundsModalProps {
    currentBalance: number;
    onClose: () => void;
    onAddFunds: (amount: number, method: string) => Promise<void>;
}

const ManageFundsModal: React.FC<ManageFundsModalProps> = ({ currentBalance, onClose, onAddFunds }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'card' | 'manual'>('manual');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

        const numericAmount = parseFloat(amount.replace(/,/g, ''));

        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (numericAmount < 1000) {
            setError('Minimum top-up amount is ₦1,000');
            return;
        }

        setIsSubmitting(true);
        try {
            await onAddFunds(numericAmount, paymentMethod);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to add funds');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickAmount = (value: number) => {
        setAmount(value.toLocaleString());
    };

    return (
        <ModalBase isOpen={true} onClose={onClose} title="Manage Wallet Funds">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Balance Display */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
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

                {/* Amount Input */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Top-Up Amount
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">
                            ₦
                        </span>
                        <input
                            type="text"
                            value={amount}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                setAmount(value ? parseInt(value).toLocaleString() : '');
                            }}
                            placeholder="Enter amount"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-gray-100 text-lg font-semibold"
                        />
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Quick Select
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {quickAmounts.map((quickAmount) => (
                            <button
                                key={quickAmount}
                                type="button"
                                onClick={() => handleQuickAmount(quickAmount)}
                                className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-lg transition-colors">
                                {formatCurrency(quickAmount)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Method Selection */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Payment Method
                    </label>
                    <div className="space-y-2">
                        {/* Manual Top-Up (For Now) */}
                        <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            paymentMethod === 'manual'
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
                        }`}>
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="manual"
                                checked={paymentMethod === 'manual'}
                                onChange={(e) => setPaymentMethod(e.target.value as 'manual')}
                                className="w-4 h-4 text-indigo-600"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Manual Top-Up
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    For development/testing purposes
                                </p>
                            </div>
                        </label>

                        {/* Bank Transfer (Coming Soon) */}
                        <label className="flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg opacity-50 cursor-not-allowed">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="bank_transfer"
                                disabled
                                className="w-4 h-4 text-indigo-600"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Bank Transfer
                                    </p>
                                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded">
                                        Coming Soon
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Direct bank transfer with virtual account
                                </p>
                            </div>
                        </label>

                        {/* Card Payment (Coming Soon) */}
                        <label className="flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg opacity-50 cursor-not-allowed">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="card"
                                disabled
                                className="w-4 h-4 text-indigo-600"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Debit/Credit Card
                                    </p>
                                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded">
                                        Coming Soon
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Pay with Visa, Mastercard, or Verve
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Info Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-900/20 dark:border-blue-800">
                    <div className="flex gap-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                            <p className="font-semibold mb-1">Development Mode</p>
                            <p className="text-xs">
                                This is a manual top-up for testing. In production, this will integrate with Paystack/Flutterwave for real payment processing.
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
                        disabled={isSubmitting || !amount}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {isSubmitting ? 'Adding Funds...' : 'Add Funds'}
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default ManageFundsModal;
