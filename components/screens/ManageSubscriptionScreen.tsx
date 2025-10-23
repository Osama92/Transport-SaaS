import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscriptionData } from '../../firebase/config';
import { updateOrganizationSubscription } from '../../services/firestore/organizations';
import { getSubscriptionLimits } from '../../services/firestore/subscriptions';
import PricingCard from '../PricingCard';
import SubscriptionLimitBadge from '../SubscriptionLimitBadge';
import { ArrowLeftIcon, CheckCircleIcon } from '../Icons';
import { useTranslation } from 'react-i18next';
import { useDrivers, useVehicles, useRoutes, useClients } from '../../hooks/useFirestore';
import { PaystackButton } from 'react-paystack';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebase/firebaseConfig';

interface ManageSubscriptionScreenProps {
    onBack: () => void;
}

const functions = getFunctions(app);

const ManageSubscriptionScreen: React.FC<ManageSubscriptionScreenProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { currentUser, userRole, organization, organizationId, setOrganization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string>('');
    const [selectedPlan, setSelectedPlan] = useState<any>(null);

    // Get current data counts
    const { data: firestoreVehicles } = useVehicles(organizationId);
    const { data: firestoreDrivers } = useDrivers(organizationId);
    const { data: firestoreRoutes } = useRoutes(organizationId);
    const { data: firestoreClients } = useClients(organizationId);

    const vehicles = firestoreVehicles || [];
    const drivers = firestoreDrivers || [];
    const routes = firestoreRoutes || [];
    const clients = firestoreClients || [];

    // Calculate current month route count
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthRouteCount = routes.filter(route => {
        const createdAt = new Date(route.createdAt || '');
        return createdAt >= startOfMonth;
    }).length;

    const plans = subscriptionData[userRole as keyof typeof subscriptionData || 'individual'];
    const currentPlanKey = organization?.subscription?.plan || 'basic';
    const currentPlan = plans.find(p => p.key === currentPlanKey) || plans[0];

    // Get plan name with fallback
    const translatedName = t(`subscriptions.plans.${userRole || 'individual'}.${currentPlanKey}.name`);
    const currentPlanName = translatedName.includes('subscriptions.plans')
        ? (currentPlanKey.charAt(0).toUpperCase() + currentPlanKey.slice(1)) // Fallback to capitalized key
        : translatedName;

    const currentLimits = getSubscriptionLimits(currentPlanKey, userRole || 'partner');

    // Paystack public key from environment
    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

    // Check if Paystack is configured
    const isPaystackConfigured = paystackPublicKey && paystackPublicKey !== 'pk_test_your_public_key_here';

    const handleSelectPlan = (plan: any) => {
        if (plan.key === currentPlanKey) {
            alert('You are already on this plan');
            return;
        }

        // If it's the trial plan, just switch without payment
        if (plan.key === 'trial' || plan.price === 0) {
            handleSwitchToFreePlan(plan.key);
            return;
        }

        // For paid plans, show payment modal
        setSelectedPlan(plan);
    };

    const handleSwitchToFreePlan = async (planKey: string) => {
        if (!organizationId) {
            alert('Organization ID not found');
            return;
        }

        setLoading(true);
        try {
            await updateOrganizationSubscription(organizationId, {
                plan: planKey,
                status: 'active',
                startDate: organization?.subscription?.startDate || new Date().toISOString(),
            });

            // Update local state
            if (organization) {
                setOrganization({
                    ...organization,
                    subscription: {
                        ...organization.subscription,
                        plan: planKey,
                        status: 'active',
                    },
                });
            }

            alert(`Successfully switched to ${planKey} plan!`);
        } catch (error) {
            console.error('Error updating subscription:', error);
            alert('Failed to update subscription. Please try again.');
        } finally {
            setLoading(false);
        }
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

            // Success - close modal and show success message
            setTimeout(() => {
                setSelectedPlan(null);
                alert(`Successfully upgraded to ${selectedPlan?.key} plan!`);
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
                planName: selectedPlan.key,
                type: 'upgrade',
                previousPlan: currentPlanKey
            },
        };
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Subscription</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your current plan is <span className="font-semibold text-indigo-500">{currentPlanName}</span>. Change or update your plan below.</p>
                </div>
            </div>

            {/* Available Plans */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Available Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => {
                        const isCurrentPlan = plan.key === currentPlanKey;
                        return (
                            <div key={plan.key} className="relative">
                                {isCurrentPlan && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                        <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Current Plan
                                        </span>
                                    </div>
                                )}
                                <PricingCard
                                    plan={plan}
                                    role={userRole || 'partner'}
                                    onSelect={() => handleSelectPlan(plan)}
                                    disabled={loading || isCurrentPlan}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment Modal */}
            {selectedPlan && isPaystackConfigured && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
                        <button
                            onClick={handlePaymentClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Upgrade to {selectedPlan.key.charAt(0).toUpperCase() + selectedPlan.key.slice(1)} Plan
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Complete your payment to unlock premium features
                            </p>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-700 dark:text-gray-300">Plan</span>
                                <span className="font-semibold text-gray-900 dark:text-white capitalize">{selectedPlan.key}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-700 dark:text-gray-300">Billing</span>
                                <span className="font-semibold text-gray-900 dark:text-white">Monthly</span>
                            </div>
                            <div className="border-t border-indigo-200 dark:border-indigo-800 my-3"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">Total</span>
                                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                    ₦{selectedPlan.price.toLocaleString()}/mo
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Secure payment via Paystack</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Cancel anytime</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Instant activation</span>
                            </div>
                        </div>

                        {getPaystackConfig() && (
                            <PaystackButton
                                {...getPaystackConfig()!}
                                text="Pay with Paystack"
                                onSuccess={handlePaymentSuccess}
                                onClose={handlePaymentClose}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                            />
                        )}

                        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
                            By proceeding, you agree to our terms of service
                        </p>
                    </div>
                </div>
            )}

            {/* Verification Overlay */}
            {verifying && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md mx-4">
                        <div className="text-center">
                            <div className="mb-4">
                                <svg className="animate-spin h-16 w-16 text-green-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Verifying Payment...
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Please wait while we confirm your subscription payment
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && !verifying && (
                <div className="fixed bottom-4 right-4 max-w-md z-50">
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg shadow-lg">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageSubscriptionScreen;