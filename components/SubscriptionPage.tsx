import React from 'react';
import { useTranslation } from 'react-i18next';
import ProgressStepper from './ProgressStepper';
import PricingCard from './PricingCard';
import { subscriptionData } from '../firebase/config';
import { ArrowLeftIcon } from './Icons';

interface SubscriptionPageProps {
    roleId: string;
    onComplete: () => void;
    onBack: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ roleId, onComplete, onBack }) => {
    const { t } = useTranslation();
    const plans = subscriptionData[roleId as keyof typeof subscriptionData] || subscriptionData.individual; // Fallback to individual plans

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
                            // Fix: Property 'name' does not exist on type 'SubscriptionPlan'. Use 'key' instead.
                            key={plan.key}
                            plan={plan}
                            onSelect={onComplete}
                        />
                    ))}
                </div>

                <div className="mt-12 flex items-center justify-center gap-8">
                     <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-indigo-500 font-semibold transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        {t('subscription.back')}
                    </button>
                    <button
                        onClick={onComplete}
                        className="text-gray-600 hover:text-indigo-500 font-semibold"
                    >
                        {t('subscription.skipForNow')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;