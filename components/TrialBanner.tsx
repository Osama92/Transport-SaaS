import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ExclamationCircleIcon } from './Icons';

interface TrialBannerProps {
    onSubscribeClick?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ onSubscribeClick }) => {
    const { organization, isTrialExpired } = useAuth();

    // Don't show banner if no organization or subscription
    if (!organization?.subscription) return null;

    const { status, trialEndDate, plan } = organization.subscription;

    // Only show banner for trial users
    if (status !== 'trial' || !trialEndDate) return null;

    // Calculate days remaining
    const now = new Date();
    const endDate = trialEndDate instanceof Date ? trialEndDate : new Date(trialEndDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Don't show if trial expired (handled elsewhere)
    if (isTrialExpired || daysRemaining <= 0) return null;

    // Determine banner color based on days remaining
    const getBannerColor = () => {
        if (daysRemaining <= 2) return 'bg-red-50 border-red-200 text-red-800';
        if (daysRemaining <= 5) return 'bg-orange-50 border-orange-200 text-orange-800';
        return 'bg-blue-50 border-blue-200 text-blue-800';
    };

    const getIconColor = () => {
        if (daysRemaining <= 2) return 'text-red-600';
        if (daysRemaining <= 5) return 'text-orange-600';
        return 'text-blue-600';
    };

    const getMessage = () => {
        if (daysRemaining === 1) {
            return 'Your free trial ends tomorrow!';
        }
        return `Your free trial ends in ${daysRemaining} days`;
    };

    return (
        <div className={`${getBannerColor()} border-2 rounded-lg p-4 mb-6 flex items-start gap-3`}>
            <ExclamationCircleIcon className={`h-6 w-6 ${getIconColor()} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="font-semibold text-base">
                            {getMessage()}
                        </h3>
                        <p className="text-sm mt-1 opacity-90">
                            Subscribe now to continue enjoying uninterrupted access to all features.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (onSubscribeClick) {
                                onSubscribeClick();
                            }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap shadow-md hover:shadow-lg"
                    >
                        Subscribe Now
                    </button>
                </div>
                <div className="mt-3 bg-white bg-opacity-50 rounded-md p-2 text-xs">
                    <span className="font-medium">Trial expires:</span>{' '}
                    <span className="font-semibold">
                        {endDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TrialBanner;
