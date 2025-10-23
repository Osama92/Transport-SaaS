import React, { useState, useEffect } from 'react';
import { getOrganizationVirtualAccount } from '../services/firestore/organizationWallet';
import { useAuth } from '../contexts/AuthContext';

interface OrganizationVirtualAccountProps {
  onClose?: () => void;
}

const OrganizationVirtualAccount: React.FC<OrganizationVirtualAccountProps> = ({ onClose }) => {
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<{
    accountNumber: string;
    accountName: string;
    bankName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchVirtualAccount = async () => {
      if (!organizationId) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const account = await getOrganizationVirtualAccount(organizationId);
        setVirtualAccount(account);
      } catch (err: any) {
        console.error('Error fetching virtual account:', err);
        setError(err.message || 'Failed to load virtual account');
      } finally {
        setLoading(false);
      }
    };

    fetchVirtualAccount();
  }, [organizationId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
          Creating your virtual account...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!virtualAccount) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Fund Your Wallet
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Transfer money to this account to automatically credit your wallet
        </p>
      </div>

      {/* Virtual Account Details */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white space-y-4">
        {/* Bank Name */}
        <div>
          <p className="text-xs opacity-80 uppercase tracking-wide mb-1">Bank Name</p>
          <p className="text-lg font-semibold">{virtualAccount.bankName}</p>
        </div>

        {/* Account Number */}
        <div>
          <p className="text-xs opacity-80 uppercase tracking-wide mb-1">Account Number</p>
          <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold tracking-wider">{virtualAccount.accountNumber}</p>
            <button
              onClick={() => copyToClipboard(virtualAccount.accountNumber)}
              className="ml-3 p-2 hover:bg-white/20 rounded-lg transition-colors">
              {copied ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Account Name */}
        <div>
          <p className="text-xs opacity-80 uppercase tracking-wide mb-1">Account Name</p>
          <p className="text-lg font-semibold">{virtualAccount.accountName}</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            1
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Transfer Money</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Use your banking app to transfer to the account number above
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            2
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Automatic Credit</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Your wallet balance will update automatically within 30-60 seconds
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            3
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Start Using Funds</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Use your wallet balance for payroll, invoices, and other operations
            </p>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex gap-2">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold mb-1">Important</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>This account is permanently linked to your organization</li>
              <li>Payments are processed instantly 24/7</li>
              <li>Minimum top-up: ₦100</li>
              <li>No maximum limit</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
          Close
        </button>
      )}
    </div>
  );
};

export default OrganizationVirtualAccount;
