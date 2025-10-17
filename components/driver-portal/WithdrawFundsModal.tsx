/**
 * Withdraw Funds Modal
 * Allows drivers to withdraw money to their bank account
 */

import React, { useState, useEffect } from 'react';
import type { Driver } from '../../types';
import { paystackWalletService } from '../../services/paystack/paystackWalletService';
import { debitDriverWallet, getTotalWithdrawnInPeriod } from '../../services/firestore/walletTransactions';

interface WithdrawFundsModalProps {
  driver: Driver;
  onClose: () => void;
  onSuccess: () => void;
}

const WithdrawFundsModal: React.FC<WithdrawFundsModalProps> = ({ driver, onClose, onSuccess }) => {
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'amount' | 'confirm' | 'processing'>('amount');
  const [dailyWithdrawn, setDailyWithdrawn] = useState(0);
  const [monthlyWithdrawn, setMonthlyWithdrawn] = useState(0);

  const walletBalance = driver.walletBalance || 0;
  const limits = driver.transactionLimits || {
    dailyWithdrawalLimit: 50000,
    singleTransactionLimit: 20000,
    monthlyWithdrawalLimit: 500000
  };

  // Load withdrawal limits
  useEffect(() => {
    loadWithdrawalStats();
  }, []);

  const loadWithdrawalStats = async () => {
    try {
      // Get today's withdrawals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyResult = await getTotalWithdrawnInPeriod(driver.id, today);
      if (dailyResult.success) {
        setDailyWithdrawn(dailyResult.total || 0);
      }

      // Get this month's withdrawals
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyResult = await getTotalWithdrawnInPeriod(driver.id, monthStart);
      if (monthlyResult.success) {
        setMonthlyWithdrawn(monthlyResult.total || 0);
      }
    } catch (err) {
      console.error('Failed to load withdrawal stats:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const validateAmount = (): string | null => {
    if (amount <= 0) {
      return 'Please enter an amount';
    }

    if (amount > walletBalance) {
      return `Insufficient balance. Available: ${formatCurrency(walletBalance)}`;
    }

    if (amount > limits.singleTransactionLimit) {
      return `Exceeds single transaction limit of ${formatCurrency(limits.singleTransactionLimit)}`;
    }

    const newDailyTotal = dailyWithdrawn + amount;
    if (newDailyTotal > limits.dailyWithdrawalLimit) {
      return `Exceeds daily limit. Remaining today: ${formatCurrency(limits.dailyWithdrawalLimit - dailyWithdrawn)}`;
    }

    const newMonthlyTotal = monthlyWithdrawn + amount;
    if (newMonthlyTotal > limits.monthlyWithdrawalLimit) {
      return `Exceeds monthly limit. Remaining this month: ${formatCurrency(limits.monthlyWithdrawalLimit - monthlyWithdrawn)}`;
    }

    return null;
  };

  const handleContinue = () => {
    const validationError = validateAmount();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if bank account is set up
    if (!driver.bankInfo?.accountNumber) {
      setError('Please add your bank account details in Settings first');
      return;
    }

    setError('');
    setStep('confirm');
  };

  const handleWithdraw = async () => {
    setStep('processing');
    setLoading(true);
    setError('');

    try {
      // Step 1: Debit wallet in Firestore (atomic operation)
      const debitResult = await debitDriverWallet(
        driver.id,
        amount,
        `Withdrawal to ${driver.bankInfo?.bankName} ${driver.bankInfo?.accountNumber}`,
        {
          accountNumber: driver.bankInfo?.accountNumber,
          accountName: driver.bankInfo?.accountName,
          bankName: driver.bankInfo?.bankName,
          bankCode: driver.bankInfo?.bankCode
        },
        {
          source: 'withdrawal',
          ipAddress: 'driver_portal'
        }
      );

      if (!debitResult.success) {
        throw new Error(debitResult.error || 'Failed to debit wallet');
      }

      // Step 2: Initiate Paystack transfer
      if (!driver.paystack?.recipientCode) {
        // Create recipient if not exists
        if (driver.bankInfo?.accountNumber && driver.bankInfo?.bankCode) {
          const recipientResult = await paystackWalletService.createTransferRecipient(
            driver.id,
            {
              accountNumber: driver.bankInfo.accountNumber,
              accountName: driver.bankInfo.accountName || driver.name,
              bankCode: driver.bankInfo.bankCode
            }
          );

          if (!recipientResult.success) {
            throw new Error('Failed to set up transfer recipient');
          }
        }
      }

      const recipientCode = driver.paystack?.recipientCode;
      if (!recipientCode) {
        throw new Error('Transfer recipient not found');
      }

      // Initiate transfer (amount in kobo)
      const transferResult = await paystackWalletService.initiateTransfer(
        driver.id,
        recipientCode,
        amount * 100,
        'Wallet withdrawal'
      );

      if (!transferResult.success) {
        throw new Error(transferResult.error || 'Transfer failed');
      }

      // Success!
      alert(`Withdrawal of ${formatCurrency(amount)} initiated successfully! You'll receive the money shortly.`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError(err instanceof Error ? err.message : 'Withdrawal failed. Please try again.');
      setStep('amount');
      setLoading(false);
    }
  };

  const presetAmounts = [5000, 10000, 20000];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {step === 'amount' && 'Withdraw Funds'}
            {step === 'confirm' && 'Confirm Withdrawal'}
            {step === 'processing' && 'Processing...'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* Amount Entry Step */}
        {step === 'amount' && (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(walletBalance)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Withdrawal Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">₦</span>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => {
                    setAmount(Math.max(0, parseInt(e.target.value) || 0));
                    setError('');
                  }}
                  className="pl-8 w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-lg
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                  min="0"
                  max={walletBalance}
                />
              </div>
            </div>

            {/* Preset Amounts */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick amounts:</p>
              <div className="grid grid-cols-3 gap-2">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    disabled={preset > walletBalance}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors
                      ${amount === preset
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank Account Info */}
            {driver.bankInfo?.accountNumber && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Withdrawing to:</p>
                <p className="font-medium text-gray-900 dark:text-white">{driver.bankInfo.accountName || driver.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {driver.bankInfo.bankName} - {driver.bankInfo.accountNumber}
                </p>
              </div>
            )}

            {/* Limits Info */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-2">Withdrawal Limits:</p>
              <div className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
                <p>• Daily: {formatCurrency(dailyWithdrawn)} / {formatCurrency(limits.dailyWithdrawalLimit)}</p>
                <p>• Per Transaction: {formatCurrency(limits.singleTransactionLimit)}</p>
                <p>• Monthly: {formatCurrency(monthlyWithdrawn)} / {formatCurrency(limits.monthlyWithdrawalLimit)}</p>
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={loading || amount === 0}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium
                       hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors"
            >
              Continue
            </button>
          </>
        )}

        {/* Confirmation Step */}
        {step === 'confirm' && (
          <>
            <div className="mb-6 space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Withdrawal Amount</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">To</span>
                  <span className="font-medium text-gray-900 dark:text-white">{driver.bankInfo?.accountName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Bank</span>
                  <span className="font-medium text-gray-900 dark:text-white">{driver.bankInfo?.bankName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Account</span>
                  <span className="font-medium text-gray-900 dark:text-white">{driver.bankInfo?.accountNumber}</span>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Please confirm the details above. This transaction cannot be reversed.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('amount')}
                disabled={loading}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 rounded-lg font-medium
                         hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium
                         hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
              >
                Confirm Withdrawal
              </button>
            </div>
          </>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="py-12 text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Processing withdrawal...</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we process your request</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawFundsModal;
