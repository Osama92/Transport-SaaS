import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { updateDoc, doc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

interface PaystackWalletFundingProps {
    driverId: string;
    driverName: string;
    driverEmail: string;
    organizationId: string;
    onSuccess?: () => void;
    onClose: () => void;
}

const PaystackWalletFunding: React.FC<PaystackWalletFundingProps> = ({
    driverId,
    driverName,
    driverEmail,
    organizationId,
    onSuccess,
    onClose
}) => {
    const [amount, setAmount] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    // Ensure email is valid for Paystack
    const getValidEmail = () => {
        // Check if driverEmail is valid
        if (driverEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverEmail)) {
            return driverEmail;
        }
        // Generate a valid test email for drivers without email
        const cleanDriverId = driverId.replace(/[^a-zA-Z0-9]/g, '');
        return `driver.${cleanDriverId}@transportco.test`;
    };

    // Paystack configuration
    const config = {
        reference: `wallet_${driverId.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`,
        email: getValidEmail(),
        amount: amount * 100, // Paystack expects amount in kobo
        publicKey: 'pk_test_6fe37e69c71f587a79bce67cadc887f0e36a40a9', // Your public key from .env
        currency: 'NGN',
        metadata: {
            custom_fields: [
                {
                    display_name: "Driver ID",
                    variable_name: "driver_id",
                    value: driverId
                },
                {
                    display_name: "Driver Name",
                    variable_name: "driver_name",
                    value: driverName
                },
                {
                    display_name: "Organization ID",
                    variable_name: "organization_id",
                    value: organizationId
                }
            ]
        }
    };

    const onPaystackSuccess = async (reference: any) => {
        console.log('Payment successful:', reference);
        setLoading(true);

        try {
            // Update driver wallet balance
            const driverRef = doc(db, 'drivers', driverId);
            await updateDoc(driverRef, {
                walletBalance: increment(amount),
                updatedAt: serverTimestamp()
            });

            // Create transaction record
            const transactionsRef = collection(db, 'walletTransactions');
            await addDoc(transactionsRef, {
                driverId,
                organizationId,
                type: 'credit',
                amount,
                reference: reference.reference,
                status: 'success',
                paymentMethod: 'paystack',
                description: 'Wallet funding via Paystack',
                metadata: {
                    driverName,
                    transactionId: reference.trans,
                    paystackReference: reference.reference
                },
                createdAt: serverTimestamp()
            });

            alert(`₦${amount.toLocaleString()} has been added to ${driverName}'s wallet successfully!`);

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (error) {
            console.error('Error updating wallet:', error);
            alert('Payment received but failed to update wallet. Please contact support.');
        } finally {
            setLoading(false);
        }
    };

    const onPaystackClose = () => {
        console.log('Payment modal closed');
    };

    const initializePayment = usePaystackPayment(config);

    const handlePayment = () => {
        if (amount < 100) {
            alert('Minimum funding amount is ₦100');
            return;
        }

        if (amount > 500000) {
            alert('Maximum funding amount is ₦500,000');
            return;
        }

        try {
            console.log('Initializing payment with config:', {
                reference: config.reference,
                email: config.email,
                amount: config.amount,
                currency: config.currency
            });
            initializePayment(onPaystackSuccess, onPaystackClose);
        } catch (error) {
            console.error('Payment initialization error:', error);
            alert('Failed to initialize payment. Please try again.');
        }
    };

    const presetAmounts = [1000, 5000, 10000, 20000, 50000];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Fund Wallet
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Funding wallet for:</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{driverName}</p>
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (₦)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                        <input
                            type="number"
                            value={amount || ''}
                            onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                            className="pl-8 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                                     focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Enter amount"
                            min="100"
                            max="500000"
                        />
                    </div>
                </div>

                {/* Preset Amounts */}
                <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quick amounts:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {presetAmounts.map((preset) => (
                            <button
                                key={preset}
                                onClick={() => setAmount(preset)}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors
                                    ${amount === preset
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                ₦{preset.toLocaleString()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            ₦{amount.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Payment Method:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            Card/Bank Transfer
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600
                                 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50
                                 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePayment}
                        disabled={loading || amount < 100}
                        className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg
                                 hover:bg-green-700 disabled:bg-gray-400 transition-colors
                                 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Pay with Paystack
                            </>
                        )}
                    </button>
                </div>

                {/* Security Notice */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex gap-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                             fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd"
                                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd" />
                        </svg>
                        <div className="text-xs text-blue-800 dark:text-blue-200">
                            <p className="font-medium mb-1">Secure Payment</p>
                            <p>Your payment is processed securely through Paystack. We never store your card details.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaystackWalletFunding;