import React from 'react';

interface LimitBadgeProps {
    current: number;
    limit: number | undefined;
    showCount?: boolean;
}

const LimitBadge: React.FC<LimitBadgeProps> = ({ current, limit, showCount = false }) => {
    if (limit === undefined || limit === -1) return null;

    const percentage = (current / limit) * 100;
    const isAtLimit = current >= limit;
    const isNearLimit = current >= limit * 0.8;

    if (!showCount && !isAtLimit && !isNearLimit) return null;

    return (
        <span
            className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isAtLimit
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : isNearLimit
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
            title={`${current} of ${limit} used`}
        >
            {isAtLimit ? (
                <>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Limit Reached
                </>
            ) : isNearLimit ? (
                <>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {Math.round(percentage)}%
                </>
            ) : showCount ? (
                `${current}/${limit}`
            ) : null}
        </span>
    );
};

export default LimitBadge;
