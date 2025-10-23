import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ModalBase from './ModalBase';
import { Square2StackIcon, QrCodeIcon } from '../Icons';

interface ReceivePaymentModalProps {
    onClose: () => void;
}

const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({ onClose }) => {
    const { organization } = useAuth();
    const [copied, setCopied] = useState<string | null>(null);

    // Virtual account data is stored in organization.wallet
    const virtualAccount = organization?.wallet?.virtualAccountNumber ? {
        accountNumber: organization.wallet.virtualAccountNumber,
        accountName: organization.wallet.virtualAccountName,
        bankName: organization.wallet.bankName || 'Titan Trust Bank'
    } : null;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    if (!virtualAccount) {
        return (
            <ModalBase isOpen={true} onClose={onClose} title="Receive Payment">
                <div className="p-6 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                        Virtual account is being set up. Please check back soon.
                    </p>
                </div>
            </ModalBase>
        );
    }

    return (
        <ModalBase isOpen={true} onClose={onClose} title="Receive Payment">
            <div className="space-y-6">
                {/* Balance Display */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white text-center">
                    <p className="text-sm opacity-90 mb-1">Your Virtual Account</p>
                    <h2 className="text-2xl font-bold">
                        {(organization?.walletBalance || organization?.wallet?.balance || 0).toLocaleString('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                            minimumFractionDigits: 0
                        })}
                    </h2>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        How to receive payments
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        Share your virtual account details below with customers. Any transfers to this account will instantly reflect in your wallet.
                    </p>
                </div>

                {/* Account Details */}
                <div className="space-y-4">
                    {/* Bank Name */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Bank Name
                        </label>
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {virtualAccount.bankName || 'Titan Trust Bank'}
                            </span>
                        </div>
                    </div>

                    {/* Account Number */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Account Number
                        </label>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-wider">
                                {virtualAccount.accountNumber}
                            </span>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(virtualAccount.accountNumber || '', 'account')}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                <Square2StackIcon className="w-5 h-5" />
                                <span className="text-sm font-medium">
                                    {copied === 'account' ? 'Copied!' : 'Copy'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Account Name */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Account Name
                        </label>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {virtualAccount.accountName || organization?.companyName}
                            </span>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(virtualAccount.accountName || organization?.companyName || '', 'name')}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                <Square2StackIcon className="w-5 h-5" />
                                <span className="text-sm font-medium">
                                    {copied === 'name' ? 'Copied!' : 'Copy'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* QR Code Placeholder */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <QrCodeIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        QR Code Coming Soon
                    </p>
                </div>

                {/* Note */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        <span className="font-semibold">Note:</span> This is a dedicated virtual account. All transfers are instant and automatic.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const details = `Bank: ${virtualAccount.bankName || 'Titan Trust Bank'}\nAccount: ${virtualAccount.accountNumber}\nName: ${virtualAccount.accountName || organization?.companyName}`;
                            copyToClipboard(details, 'all');
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                        {copied === 'all' ? 'Copied All!' : 'Copy All Details'}
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default ReceivePaymentModal;
