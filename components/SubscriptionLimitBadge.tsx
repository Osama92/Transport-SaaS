import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatLimitDisplay, getUsagePercentage, getUsageColor } from '../services/firestore/subscriptions';

interface SubscriptionLimitBadgeProps {
    current: number;
    limit: number | undefined;
    resourceType: 'vehicles' | 'drivers' | 'routes' | 'clients';
    showProgressBar?: boolean;
}

const SubscriptionLimitBadge: React.FC<SubscriptionLimitBadgeProps> = ({
    current,
    limit,
    resourceType,
    showProgressBar = false,
}) => {
    const { t } = useTranslation();

    const usagePercentage = getUsagePercentage(current, limit);
    const usageColor = getUsageColor(current, limit);
    const displayText = formatLimitDisplay(current, limit);

    const colorClasses = {
        green: {
            bg: 'bg-green-100',
            text: 'text-green-800',
            progressBg: 'bg-green-200',
            progressFill: 'bg-green-600',
        },
        yellow: {
            bg: 'bg-yellow-100',
            text: 'text-yellow-800',
            progressBg: 'bg-yellow-200',
            progressFill: 'bg-yellow-600',
        },
        red: {
            bg: 'bg-red-100',
            text: 'text-red-800',
            progressBg: 'bg-red-200',
            progressFill: 'bg-red-600',
        },
    };

    const colors = colorClasses[usageColor];

    const resourceNames = {
        vehicles: t('subscription.limits.vehicles'),
        drivers: t('subscription.limits.drivers'),
        routes: t('subscription.limits.routes'),
        clients: t('subscription.limits.clients'),
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{resourceNames[resourceType]}</span>
                <span className={`text-sm font-semibold px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
                    {displayText}
                </span>
            </div>

            {showProgressBar && (
                <div className={`w-full h-2 rounded-full overflow-hidden ${colors.progressBg}`}>
                    <div
                        className={`h-full transition-all duration-300 ${colors.progressFill}`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default SubscriptionLimitBadge;
