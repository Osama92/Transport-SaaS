import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
// FIX: The subscriptionData is exported from firebase/config, not data/subscriptions.
import { subscriptionData } from '../../firebase/config';
import PricingCard from '../PricingCard';
import { ArrowLeftIcon } from '../Icons';
// Fix: Import useTranslation to handle plan names.
import { useTranslation } from 'react-i18next';

interface ManageSubscriptionScreenProps {
    onBack: () => void;
}

const ManageSubscriptionScreen: React.FC<ManageSubscriptionScreenProps> = ({ onBack }) => {
    // Fix: Add useTranslation hook.
    const { t } = useTranslation();
    const { userRole } = useAuth();
    const plans = subscriptionData[userRole as keyof typeof subscriptionData || 'individual'];
    // Fix: Correctly identify the current plan and get its translated name.
    const currentPlan = plans.find(p => p.isPopular) || plans[0]; // Assuming one popular or fallback to first
    const currentPlanName = t(`subscriptions.plans.${userRole || 'individual'}.${currentPlan.key}.name`);

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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    // Fix: Get translated name for the alert.
                    const planName = t(`subscriptions.plans.${userRole || 'individual'}.${plan.key}.name`);
                    return (
                        <PricingCard
                            // Fix: Use unique 'key' property for React keys.
                            key={plan.key}
                            plan={plan}
                            // Fix: Use translated plan name in the onSelect handler.
                            onSelect={() => alert(`Switching to ${planName} plan!`)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default ManageSubscriptionScreen;