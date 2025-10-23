import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import ModalBase from './ModalBase';
import { ExclamationCircleIcon, MagnifyingGlassIcon } from '../Icons';
import { getDriversByOrganization } from '../../services/firestore/drivers';
import type { Driver } from '../../types';

interface SendToDriverModalProps {
    currentBalance: number;
    onClose: () => void;
    onSuccess?: () => void;
}

const SendToDriverModal: React.FC<SendToDriverModalProps> = ({ currentBalance, onClose, onSuccess }) => {
    const { organizationId } = useAuth();
    const [step, setStep] = useState<'select' | 'amount' | 'confirm' | 'processing' | 'success' | 'error'>('select');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDrivers = async () => {
            if (!organizationId) return;

            try {
                const fetchedDrivers = await getDriversByOrganization(organizationId);
                // Only show active drivers
                setDrivers(fetchedDrivers.filter(d => d.status === 'Active'));
            } catch (err) {
                console.error('Error fetching drivers:', err);
                setError('Failed to load drivers');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDrivers();
    }, [organizationId]);

    const filteredDrivers = drivers.filter(driver =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(value);
    };

    const handleSelectDriver = (driver: Driver) => {
        setSelectedDriver(driver);
        setStep('amount');
    };

    const handleAmountSubmit = (e: React.FormEvent) => {
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

        setStep('confirm');
    };

    const handleConfirmTransfer = async () => {
        setStep('processing');
        setError(null);

        try {
            const numericAmount = parseFloat(amount.replace(/,/g, ''));

            // Call Firebase Cloud Function to transfer to driver
            const functions = getFunctions();
            const transferToDriver = httpsCallable(functions, 'transferToDriver');

            const result = await transferToDriver({
                organizationId,
                driverId: selectedDriver?.id,
                amount: numericAmount,
                description: description || `Transfer to ${selectedDriver?.name}`,
            });

            const data = result.data as { success: boolean; message?: string; reference?: string };

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
            } else if (err.code === 'functions/not-found') {
                setError('Driver not found');
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

    const quickAmounts = [5000, 10000, 20000, 50000, 100000];

    return (
        <ModalBase isOpen={true} onClose={onClose} title="Send to Driver">
            {step === 'select' && (
                <div className="space-y-6">
                    {/* Balance Display */}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white">
                        <p className="text-sm opacity-90 mb-1">Available Balance</p>
                        <h2 className="text-3xl font-bold">{formatCurrency(currentBalance)}</h2>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Search drivers by name, email, or phone..."
                        />
                    </div>

                    {/* Drivers List */}
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading drivers...</p>
                            </div>
                        ) : filteredDrivers.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-600 dark:text-gray-400">No active drivers found</p>
                            </div>
                        ) : (
                            filteredDrivers.map(driver => (
                                <button
                                    key={driver.id}
                                    onClick={() => handleSelectDriver(driver)}
                                    className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-300 font-semibold text-lg">
                                            {driver.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-white">{driver.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {driver.email || driver.phone}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Wallet</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(driver.walletBalance || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {step === 'amount' && selectedDriver && (
                <form onSubmit={handleAmountSubmit} className="space-y-6">
                    {/* Selected Driver */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Sending to</p>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-300 font-semibold text-lg">
                                {selectedDriver.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedDriver.email || selectedDriver.phone}</p>
                            </div>
                        </div>
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
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">₦</span>
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/,/g, '');
                                    if (!isNaN(Number(value)) || value === '') {
                                        setAmount(value ? Number(value).toLocaleString() : '');
                                    }
                                }}
                                className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {/* Quick Amounts */}
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick amounts</p>
                        <div className="grid grid-cols-5 gap-2">
                            {quickAmounts.map(quickAmount => (
                                <button
                                    key={quickAmount}
                                    type="button"
                                    onClick={() => setAmount(quickAmount.toLocaleString())}
                                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                                >
                                    {quickAmount / 1000}k
                                </button>
                            ))}
                        </div>
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
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Salary, bonus, commission..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setStep('select')}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                </form>
            )}

            {step === 'confirm' && selectedDriver && (
                <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                            Confirm Transfer Details
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            This will deduct from your wallet and add to the driver's wallet.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Amount</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(parseFloat(amount.replace(/,/g, '')))}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Recipient</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{selectedDriver.name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">Driver Current Balance</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedDriver.walletBalance || 0)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">New Balance (After)</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency((selectedDriver.walletBalance || 0) + parseFloat(amount.replace(/,/g, '')))}
                            </span>
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
                            onClick={() => setStep('amount')}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmTransfer}
                            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Confirm Transfer
                        </button>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Processing Transfer...</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Transferring funds to driver's wallet</p>
                </div>
            )}

            {step === 'success' && selectedDriver && (
                <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transfer Successful!</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(parseFloat(amount.replace(/,/g, '')))} has been sent to {selectedDriver.name}
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
                                setStep('amount');
                                setError(null);
                            }}
                            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}
        </ModalBase>
    );
};

export default SendToDriverModal;
