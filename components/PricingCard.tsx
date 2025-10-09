import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from './Icons';
import type { SubscriptionPlan } from '../types';

interface PricingCardProps {
    plan: SubscriptionPlan;
    onSelect: () => void;
}

const PricingCard: React.FC<PricingCardProps> = ({ plan, onSelect }) => {
    const { t } = useTranslation();
    const { key, price, isPopular } = plan;

    // Assuming the role is part of the key structure in i18n, e.g., subscriptions.plans.individual.basic
    // We need to find the role. A bit of a hack here, but it works for the demo structure.
    const role = ['basic', 'plus', 'premium'].includes(key) ? 'individual'
               : ['starter', 'growth', 'scale'].includes(key) ? 'business'
               : ['driver', 'fleet', 'logisticsPro'].includes(key) ? 'partner'
               : 'individual';

    const name = t(`subscriptions.plans.${role}.${key}.name`);
    const description = t(`subscriptions.plans.${role}.${key}.description`);
    const features: string[] = t(`subscriptions.plans.${role}.${key}.features`, { returnObjects: true });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className={`bg-white p-8 rounded-2xl shadow-sm transition-all duration-300 relative ${isPopular ? 'border-2 border-indigo-500 ring-4 ring-indigo-100' : 'border border-gray-200'}`}>
            {isPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-500 text-white text-xs font-semibold px-4 py-1 rounded-full uppercase">Most Popular</span>
                </div>
            )}
            <h3 className="text-2xl font-bold text-gray-800 text-center">{name}</h3>
            <p className="text-center text-gray-500 mt-2 h-12">{description}</p>
            <div className="text-center my-8">
                <span className="text-5xl font-extrabold text-gray-900">{formatCurrency(price)}</span>
                <span className="text-lg text-gray-500">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                        <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={onSelect}
                className={`w-full font-bold py-3 px-6 rounded-lg transition-colors duration-300 ${isPopular ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-indigo-500 hover:bg-indigo-100'}`}
            >
                {t('subscription.choosePlanButton')}
            </button>
        </div>
    );
};

export default PricingCard;