import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import ModalBase from './ModalBase';
import { ExclamationCircleIcon } from '../Icons';

interface SendToBankModalProps {
    currentBalance: number;
    onClose: () => void;
    onSuccess?: () => void;
}

interface BankAccount {
    accountNumber: string;
    bankCode: string;
    accountName?: string;
}

const SendToBankModal: React.FC<SendToBankModalProps> = ({ currentBalance, onClose, onSuccess }) => {
    const { organization, organizationId } = useAuth();
    const [step, setStep] = useState<'details' | 'confirm' | 'processing' | 'success' | 'error'>('details');
    const [amount, setAmount] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isResolvingAccount, setIsResolvingAccount] = useState(false);

    // Nigerian Banks - Complete list including fintechs
    const nigerianBanks = [
        { code: '044', name: 'Access Bank' },
        { code: '063', name: 'Access Bank (Diamond)' },
        { code: '050', name: 'Ecobank Nigeria' },
        { code: '070', name: 'Fidelity Bank' },
        { code: '011', name: 'First Bank of Nigeria' },
        { code: '214', name: 'First City Monument Bank' },
        { code: '058', name: 'Guaranty Trust Bank' },
        { code: '030', name: 'Heritage Bank' },
        { code: '301', name: 'Jaiz Bank' },
        { code: '082', name: 'Keystone Bank' },
        { code: '50211', name: 'Kuda Bank' },
        { code: '076', name: 'Polaris Bank' },
        { code: '101', name: 'Providus Bank' },
        { code: '221', name: 'Stanbic IBTC Bank' },
        { code: '068', name: 'Standard Chartered' },
        { code: '232', name: 'Sterling Bank' },
        { code: '100', name: 'Suntrust Bank' },
        { code: '032', name: 'Union Bank of Nigeria' },
        { code: '033', name: 'United Bank for Africa' },
        { code: '215', name: 'Unity Bank' },
        { code: '035', name: 'Wema Bank' },
        { code: '057', name: 'Zenith Bank' },
        // Fintech Banks
        { code: '50515', name: 'Moniepoint MFB' },
        { code: '999992', name: 'OPay' },
        { code: '999991', name: 'PalmPay' },
        { code: '090267', name: 'Kuda Microfinance Bank' },
        { code: '50746', name: 'VFD Microfinance Bank' },
        { code: '090405', name: 'Moniepoint Microfinance Bank' },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(value);
    };

    const handleResolveAccount = async () => {
        if (!accountNumber || accountNumber.length !== 10) {
            setError('Please enter a valid 10-digit account number');
            return;
        }

        if (!bankCode) {
            setError('Please select a bank');
            return;
        }

        setIsResolvingAccount(true);
        setError(null);

        try {
            // Call Firebase Cloud Function to resolve account via Paystack API
            const functions = getFunctions();
            const resolveBankAccount = httpsCallable(functions, 'resolveBankAccount');

            const result = await resolveBankAccount({
                accountNumber,
                bankCode,
            });

            const data = result.data as { success: boolean; accountName?: string; accountNumber?: string };

            if (data.success && data.accountName) {
                setResolvedAccountName(data.accountName);
                setError(null);
            } else {
                setError('Could not verify account. Please check details.');
            }
        } catch (err: any) {
            console.error('Account resolution error:', err);

            // Handle specific Firebase Function errors
            if (err.code === 'functions/invalid-argument') {
                setError(err.message || 'Invalid account number or bank code');
            } else if (err.code === 'functions/not-found') {
                setError('Account not found. Please verify the account number.');
            } else if (err.code === 'functions/unauthenticated') {
                setError('Authentication required. Please log in again.');
            } else {
                setError('Failed to verify account. Please try again.');
            }
        } finally {
            setIsResolvingAccount(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const numericAmount = parseFloat(amount.replace(/,/g, ''));

        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (numericAmount > currentBalance) {
            setError(`Insufficient balance. Available: ${formatCurrency(currentBalance)}`);
            return;
        }

        if (numericAmount < 100) {
            setError('Minimum transfer amount is ₦100');
            return;
        }

        if (!resolvedAccountName) {
            setError('Please verify the account first');
            return;
        }

        setStep('confirm');
    };

    const handleConfirmTransfer = async () => {
        setStep('processing');
        setError(null);

        try {
            const numericAmount = parseFloat(amount.replace(/,/g, ''));
            const selectedBank = nigerianBanks.find(b => b.code === bankCode);

            // Call Firebase Cloud Function to initiate transfer
            const functions = getFunctions();
            const initiateBankTransfer = httpsCallable(functions, 'initiateBankTransfer');

            const result = await initiateBankTransfer({
                organizationId,
                amount: numericAmount,
                accountNumber,
                bankCode,
                accountName: resolvedAccountName,
                bankName: selectedBank?.name || '',
                description: description || 'Bank transfer',
            });

            const data = result.data as { success: boolean; message?: string; transactionId?: string };

            if (data.success) {
                setStep('success');
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 2000);
            } else {
                setError(data.message || 'Transfer failed. Please try again.');
                setStep('error');
            }
        } catch (err: any) {
            console.error('Transfer error:', err);

            // Handle specific Firebase Function errors
            if (err.code === 'functions/invalid-argument') {
                setError(err.message || 'Invalid transfer details');
            } else if (err.code === 'functions/failed-precondition') {
                setError(err.message || 'Insufficient balance');
            } else if (err.code === 'functions/unauthenticated') {
                setError('Authentication required. Please log in again.');
            } else if (err.code === 'functions/internal') {
                setError(err.message || 'Transfer failed. Please try again.');
            } else {
                setError('Failed to process transfer. Please try again.');
            }

            setStep('error');
        }
    };

    return (
        <ModalBase isOpen={true} onClose={onClose} title="Send to Bank Account">
            {step === 'details' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Balance Display */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                        <p className="text-sm opacity-90 mb-1">Available Balance</p>
                        <h2 className="text-3xl font-bold">{formatCurrency(currentBalance)}</h2>
                    </div>

                    {/* Info Alert */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            <span className="font-semibold">Important:</span> Bank transfers require your Paystack account to have sufficient transfer balance. If you encounter balance errors, please contact support@paystack.com to enable automatic settlement to Paystack Balance for your virtual account payments.
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                            <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Amount to Send
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                ₦
                            </span>
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/,/g, '');
                                    if (!isNaN(Number(value)) || value === '') {
                                        setAmount(value ? Number(value).toLocaleString() : '');
                                    }
                                }}
                                className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {/* Bank Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Bank
                        </label>
                        <select
                            value={bankCode}
                            onChange={(e) => {
                                setBankCode(e.target.value);
                                setResolvedAccountName(null);
                            }}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            required
                        >
                            <option value="">Select Bank</option>
                            {nigerianBanks.map(bank => (
                                <option key={bank.code} value={bank.code}>{bank.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Account Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Account Number
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length <= 10) {
                                        setAccountNumber(value);
                                        setResolvedAccountName(null);
                                    }
                                }}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="0123456789"
                                maxLength={10}
                                required
                            />
                            <button
                                type="button"
                                onClick={handleResolveAccount}
                                disabled={isResolvingAccount || accountNumber.length !== 10 || !bankCode}
                                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                            >
                                {isResolvingAccount ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                        {resolvedAccountName && (
                            <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                                ✓ {resolvedAccountName}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Payment for..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                </form>
            )}

            {step === 'confirm' && (
                <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                            Confirm Transfer Details
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Please review the details below carefully before confirming.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Amount</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(parseFloat(amount.replace(/,/g, '')))}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Bank</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {nigerianBanks.find(b => b.code === bankCode)?.name}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Account Number</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{accountNumber}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Account Name</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{resolvedAccountName}</span>
                        </div>
                        {description && (
                            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Description</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{description}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setStep('details')}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmTransfer}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Confirm Transfer
                        </button>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Processing Transfer...</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we process your transfer</p>
                </div>
            )}

            {step === 'success' && (
                <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transfer Successful!</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(parseFloat(amount.replace(/,/g, '')))} has been sent to {resolvedAccountName}
                    </p>
                </div>
            )}

            {step === 'error' && (
                <div className="space-y-6">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                            Transfer Failed
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300">
                            {error || 'Something went wrong. Please try again.'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setStep('details');
                                setError(null);
                            }}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}
        </ModalBase>
    );
};

export default SendToBankModal;
