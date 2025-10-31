/**
 * Driver Wallet Screen
 * Simplified wallet view for drivers - reuses existing wallet components
 */

import React from 'react';
import type { Driver } from '../../types';
import WalletCard from './WalletCard';
import TransactionHistory from './TransactionHistory';
import WithdrawFundsModal from './WithdrawFundsModal';

interface DriverWalletScreenProps {
  driver: Driver;
}

const DriverWalletScreen: React.FC<DriverWalletScreenProps> = ({ driver }) => {
  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleWithdrawSuccess = () => {
    setShowWithdrawModal(false);
    setRefreshKey(prev => prev + 1); // Trigger refresh
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Wallet</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your earnings and withdrawals</p>
      </div>

      {/* Wallet Card */}
      <WalletCard
        key={refreshKey}
        driver={driver}
        onWithdraw={() => setShowWithdrawModal(true)}
        onViewHistory={() => setShowHistory(true)}
      />

      {/* Virtual Account Info */}
      {driver.paystack?.virtualAccountNumber && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Funding Details</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bank Name</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {driver.paystack.virtualAccountBank || 'Wema Bank'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {driver.paystack.virtualAccountNumber}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Transfer money to this account to fund your wallet
            </p>
          </div>
        </div>
      )}

      {/* Bank Account Info */}
      {driver.bankInfo?.accountNumber && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Withdrawal Bank Account</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bank Name</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {driver.bankInfo.bankName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {driver.bankInfo.accountNumber}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Account Name</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {driver.bankInfo.accountName || driver.name}
              </p>
            </div>
            {driver.bankInfo.verified && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Verified</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction History Button */}
      <button
        onClick={() => setShowHistory(true)}
        className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300
                 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
      >
        View Full Transaction History 📜
      </button>

      {/* Modals */}
      {showWithdrawModal && (
        <WithdrawFundsModal
          driver={driver}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={handleWithdrawSuccess}
        />
      )}

      {showHistory && (
        <TransactionHistory
          driverId={driver.id}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default DriverWalletScreen;
