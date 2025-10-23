import React from 'react';
import { useTranslation } from 'react-i18next';

interface LimitReachedModalProps {
    isOpen: boolean;
    onClose: () => void;
    resourceType: 'vehicles' | 'drivers' | 'routes' | 'clients';
    currentPlan: string;
    onUpgrade: () => void;
}

const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
    isOpen,
    onClose,
    resourceType,
    currentPlan,
    onUpgrade,
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const resourceNames = {
        vehicles: t('subscription.limits.vehicles'),
        drivers: t('subscription.limits.drivers'),
        routes: t('subscription.limits.routes'),
        clients: t('subscription.limits.clients'),
    };

    const planNames = {
        basic: 'Basic',
        pro: 'Pro',
        max: 'Max',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
                        <svg
                            className="w-6 h-6 text-yellow-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                        {t('subscription.limitReached.title')}
                    </h3>

                    <p className="text-gray-600 text-center mb-6">
                        {t('subscription.limitReached.message', {
                            resource: resourceNames[resourceType],
                            plan: planNames[currentPlan as keyof typeof planNames],
                        })}
                    </p>

                    <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-indigo-800 text-center">
                            {t('subscription.limitReached.upgradePrompt')}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={onUpgrade}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            {t('subscription.limitReached.upgradeButton')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LimitReachedModal;
