import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProgressStepper from './ProgressStepper';
import PricingCard from './PricingCard';
import { subscriptionData } from '../firebase/config';
import { ArrowLeftIcon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { updateOrganizationSubscription } from '../services/firestore/organizations';

interface SubscriptionPageProps {
    roleId: string;
    onComplete: () => void;
    onBack: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ roleId, onComplete, onBack }) => {
    const { t } = useTranslation();
    const { organizationId, setOrganization, organization } = useAuth();
    const [loading, setLoading] = useState(false);
    const plans = subscriptionData[roleId as keyof typeof subscriptionData] || subscriptionData.individual; // Fallback to individual plans

    const handleSelectPlan = async (planKey: string) => {
        if (!organizationId) {
            console.error('No organization ID found');
            onComplete();
            return;
        }

        setLoading(true);
        try {
            // Update organization subscription in Firestore
            await updateOrganizationSubscription(organizationId, {
                plan: planKey,
                status: 'active',
                startDate: new Date().toISOString(),
            });

            // Update local organization state
            if (organization) {
                setOrganization({
                    ...organization,
                    subscription: {
                        ...organization.subscription,
                        plan: planKey,
                        status: 'active',
                        startDate: new Date().toISOString(),
                    },
                });
            }

            onComplete();
        } catch (error) {
            console.error('Error saving subscription:', error);
            alert('Failed to save subscription. Please try again.');
        } finally {
            setLoading(false);
        }
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
                            onSelect={() => handleSelectPlan(plan.key)}
                            role={roleId}
                            disabled={loading}
                        />
                    ))}
                </div>

                <div className="mt-12 flex items-center justify-center gap-8">
                     <button
                        onClick={onBack}
                        disabled={loading}
                        className="flex items-center gap-2 text-gray-600 hover:text-indigo-500 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        {t('subscription.back')}
                    </button>
                    <button
                        onClick={() => handleSelectPlan('basic')}
                        disabled={loading}
                        className="text-gray-600 hover:text-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('subscription.skipForNow')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;