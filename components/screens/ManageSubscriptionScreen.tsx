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

interface ManageSubscriptionScreenProps {
    onBack: () => void;
}

const ManageSubscriptionScreen: React.FC<ManageSubscriptionScreenProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { userRole, organization, organizationId, setOrganization } = useAuth();
    const [loading, setLoading] = useState(false);

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

    const handleChangePlan = async (planKey: string) => {
        if (!organizationId) {
            alert('Organization ID not found');
            return;
        }

        if (planKey === currentPlanKey) {
            alert('You are already on this plan');
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

            alert(`Successfully switched to ${t(`subscriptions.plans.${userRole || 'individual'}.${planKey}.name`)} plan!`);
        } catch (error) {
            console.error('Error updating subscription:', error);
            alert('Failed to update subscription. Please try again.');
        } finally {
            setLoading(false);
        }
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
                                    onSelect={() => handleChangePlan(plan.key)}
                                    disabled={loading || isCurrentPlan}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ManageSubscriptionScreen;