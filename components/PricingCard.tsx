import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from './Icons';
import type { SubscriptionPlan } from '../types';

interface PricingCardProps {
    plan: SubscriptionPlan;
    onSelect: () => void;
    role?: string;
    disabled?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ plan, onSelect, role: propRole, disabled = false }) => {
    const { t } = useTranslation();
    const { key, price, isPopular } = plan;

    // Use prop role if provided, otherwise infer from key
    const role = propRole || (['plus', 'premium'].includes(key) ? 'individual'
               : ['starter', 'growth', 'scale'].includes(key) ? 'business'
               : 'partner');

    const name = t(`subscriptions.plans.${role}.${key}.name`, key.charAt(0).toUpperCase() + key.slice(1)); // Fallback to capitalized key
    const description = t(`subscriptions.plans.${role}.${key}.description`, '');
    const featuresRaw = t(`subscriptions.plans.${role}.${key}.features`, { returnObjects: true });
    const features: string[] = Array.isArray(featuresRaw) ? featuresRaw : [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className={`bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm transition-all duration-300 relative hover:shadow-xl hover:scale-105 cursor-pointer ${isPopular ? 'border-2 border-indigo-500' : 'border border-gray-200 dark:border-slate-700'}`}>
            {isPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-500 text-white text-xs font-semibold px-4 py-1 rounded-full uppercase">Most Popular</span>
                </div>
            )}
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center">{name}</h3>
            <p className="text-center text-gray-500 dark:text-gray-400 mt-2 h-12 text-sm">{description}</p>
            <div className="text-center my-8">
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{formatCurrency(price)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                </div>
            </div>
            <ul className="space-y-4 mb-8 min-h-[200px]">
                {features.length > 0 ? features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600 dark:text-gray-300 text-sm">{feature}</span>
                    </li>
                )) : (
                    <li className="text-sm text-gray-500 dark:text-gray-400 text-center">No features available</li>
                )}
            </ul>
            <button
                onClick={onSelect}
                disabled={disabled}
                className={`w-full font-bold py-3 px-6 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${isPopular ? 'bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-500' : 'bg-gray-100 dark:bg-slate-700 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-600 focus:ring-indigo-300'}`}
            >
                {t('subscription.choosePlanButton')}
            </button>
        </div>
    );
};

export default PricingCard;