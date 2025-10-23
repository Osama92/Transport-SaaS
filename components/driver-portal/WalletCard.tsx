/**
 * Wallet Card Component
 * Displays driver's wallet balance and virtual account details
 */

import React, { useState } from 'react';
import type { Driver } from '../../types';

interface WalletCardProps {
  driver: Driver;
  onWithdraw: () => void;
  onViewTransactions: () => void;
}

const WalletCard: React.FC<WalletCardProps> = ({ driver, onWithdraw, onViewTransactions }) => {
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleCopyAccount = async () => {
    if (driver.paystack?.virtualAccountNumber) {
      try {
        await navigator.clipboard.writeText(driver.paystack.virtualAccountNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const walletBalance = driver.walletBalance || 0;
  const hasVirtualAccount = driver.paystack?.virtualAccountNumber;

  return (
    <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 text-white">
      {/* Balance Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-indigo-100 text-sm">Wallet Balance</p>
          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-4xl font-bold mb-1">{formatCurrency(walletBalance)}</h2>
        <p className="text-indigo-100 text-xs">Available for withdrawal</p>
      </div>

      {/* Virtual Account Section */}
      {hasVirtualAccount && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Your Virtual Account</h3>
            <button
              onClick={() => setShowAccountDetails(!showAccountDetails)}
              className="text-xs text-indigo-100 hover:text-white transition-colors"
            >
              {showAccountDetails ? 'Hide' : 'Show'}
            </button>
          </div>

          {showAccountDetails && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-indigo-100 mb-1">Account Number</p>
                <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                  <span className="font-mono text-lg font-semibold">
                    {driver.paystack.virtualAccountNumber}
                  </span>
                  <button
                    onClick={handleCopyAccount}
                    className="ml-2 p-1.5 hover:bg-white/10 rounded transition-colors"
                    title="Copy account number"
                  >
                    {copied ? (
                      <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-indigo-100 mb-1">Bank Name</p>
                <p className="font-semibold">{driver.paystack.virtualAccountBank || 'Wema Bank'}</p>
              </div>

              <div className="pt-2 border-t border-white/20">
                <p className="text-xs text-indigo-100">
                  💡 Share this account number to receive payments
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onWithdraw}
          disabled={walletBalance === 0}
          className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed
                   backdrop-blur-sm rounded-xl py-3 px-4 transition-all duration-200
                   flex flex-col items-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold">Withdraw</span>
        </button>

        <button
          onClick={onViewTransactions}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 px-4
                   transition-all duration-200 flex flex-col items-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-semibold">History</span>
        </button>
      </div>

      {/* Transaction Limits Info */}
      {driver.transactionLimits && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs text-indigo-100 mb-2">Transaction Limits:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-indigo-100">Daily</p>
              <p className="font-semibold">{formatCurrency(driver.transactionLimits.dailyWithdrawalLimit)}</p>
            </div>
            <div>
              <p className="text-indigo-100">Per Transaction</p>
              <p className="font-semibold">{formatCurrency(driver.transactionLimits.singleTransactionLimit)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletCard;
