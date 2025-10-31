import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PaystackButton } from 'react-paystack';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/firebaseConfig';
import ProgressStepper from './ProgressStepper';
import PricingCard from './PricingCard';
import { subscriptionData } from '../firebase/config';
import { ArrowLeftIcon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { updateOrganizationSubscription } from '../services/firestore/organizations';

const functions = getFunctions(app);

interface SubscriptionPageProps {
    roleId: string;
    onComplete: () => void;
    onBack: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ roleId, onComplete, onBack }) => {
    const { t } = useTranslation();
    const { currentUser, organizationId, setOrganization, organization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string>('');
    const [selectedPlan, setSelectedPlan] = useState<any>(null);

    // Get all plans for the role
    const allPlans = subscriptionData[roleId as keyof typeof subscriptionData] || subscriptionData.individual;

    // Check if user should see trial plan
    const shouldHideTrial =
        organization?.subscription?.trialEndsAt || // Has used trial
        organization?.subscription?.convertedFromTrial || // Converted from trial
        (organization?.subscription?.status === 'active' && organization?.subscription?.plan && organization.subscription.plan !== 'trial') || // Has active non-trial plan
        (organization?.subscription?.plan && organization.subscription.plan !== 'trial'); // Has any non-trial plan

    // Filter out trial plan if user has already used it or is an active subscriber
    const plans = shouldHideTrial
        ? allPlans.filter(plan => plan.key !== 'trial')
        : allPlans;

    // Paystack public key from environment
    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

    // Check if Paystack is configured
    const isPaystackConfigured = paystackPublicKey && paystackPublicKey !== 'pk_test_your_public_key_here';

    const handleSelectPlan = (plan: any) => {
        setSelectedPlan(plan);
    };

    const handlePaymentSuccess = async (reference: any) => {
        if (!organizationId) {
            console.error('No organization ID found');
            setError('Organization not found. Please try again.');
            return;
        }

        setVerifying(true);
        setLoading(true);
        setError('');

        try {
            console.log('Payment successful! Verifying...', reference);

            // Call Firebase Function to verify payment server-side
            const verifyPayment = httpsCallable(functions, 'verifySubscriptionPayment');
            const result = await verifyPayment({
                reference: reference.reference,
                organizationId
            });

            const data = result.data as { success: boolean; plan: string; message: string };

            if (!data.success) {
                throw new Error(data.message || 'Payment verification failed');
            }

            console.log('Payment verified successfully:', data);

            // Update local organization state
            if (organization) {
                setOrganization({
                    ...organization,
                    subscription: {
                        ...organization.subscription,
                        plan: data.plan as any,
                        status: 'active',
                        startDate: new Date().toISOString(),
                        paystackReference: reference.reference,
                    },
                });
            }

            // Success - proceed to dashboard
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (error: any) {
            console.error('Payment verification failed:', error);
            const errorMessage = error.message || 'Payment verification failed. Please contact support with your payment reference.';
            setError(errorMessage);

            // Show error for 5 seconds then allow retry
            setTimeout(() => {
                setSelectedPlan(null);
                setError('');
            }, 5000);
        } finally {
            setLoading(false);
            setVerifying(false);
        }
    };

    const handlePaymentClose = () => {
        console.log('Payment closed');
        setSelectedPlan(null);
    };

    // Paystack configuration
    const getPaystackConfig = () => {
        if (!selectedPlan || !currentUser) return null;

        return {
            reference: `SUB_${organizationId}_${Date.now()}`,
            email: currentUser.email || '',
            amount: selectedPlan.price * 100, // Convert to kobo
            publicKey: paystackPublicKey,
            metadata: {
                organizationId,
                plan: selectedPlan.key,
                planName: selectedPlan.name,
            },
        };
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8 font-sans">
            <div className="w-full max-w-5xl mx-auto">
                <ProgressStepper currentStep={2} totalSteps={3} />
                
                <div className="text-center my-12">
                    <h1 className="text-4xl font-bold text-gray-800 mb-3">{t('subscription.choosePlanTitle')}</h1>
                    <p className="text-lg text-gray-500">{t('subscription.choosePlanSubtitle', { roleId })}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <PricingCard
                            key={plan.key}
                            plan={plan}
                            onSelect={() => handleSelectPlan(plan)}
                            role={roleId}
                            disabled={loading}
                        />
                    ))}
                </div>

                {/* Verification Overlay */}
                {verifying && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4">
                            <div className="text-center">
                                <div className="mb-4">
                                    <svg className="animate-spin h-16 w-16 text-green-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    Verifying Payment...
                                </h3>
                                <p className="text-gray-600">
                                    Please wait while we confirm your subscription payment
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && !verifying && (
                    <div className="mt-8 max-w-md mx-auto">
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Paystack Not Configured Warning */}
                {!isPaystackConfigured && (
                    <div className="mt-8 max-w-2xl mx-auto">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        <strong>Payment Gateway Not Configured:</strong> Paystack API keys are not set up. Please configure your Paystack keys in the environment variables to enable subscription payments.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Paystack Payment Button */}
                {selectedPlan && getPaystackConfig() && isPaystackConfigured && !verifying && (
                    <div className="mt-8 text-center">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 sm:p-8 max-w-md mx-auto border border-gray-200 dark:border-slate-700">
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                    Proceed to Payment
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    You selected: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedPlan.name}</span>
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-lg p-6 mb-6">
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Monthly Subscription</p>
                                <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                                    ₦{selectedPlan.price.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">per month</p>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Secure payment with Paystack
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Instant activation
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Cancel anytime
                                </div>
                            </div>

                            <PaystackButton
                                {...getPaystackConfig()!}
                                text="Pay with Paystack"
                                onSuccess={handlePaymentSuccess}
                                onClose={handlePaymentClose}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            />

                            <button
                                onClick={() => setSelectedPlan(null)}
                                disabled={loading}
                                className="mt-4 w-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>

                            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                                By proceeding, you agree to our Terms of Service and Privacy Policy
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-12 flex items-center justify-center gap-8">
                     <button
                        onClick={onBack}
                        disabled={loading}
                        className="flex items-center gap-2 text-gray-600 hover:text-indigo-500 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        {t('subscription.back')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;