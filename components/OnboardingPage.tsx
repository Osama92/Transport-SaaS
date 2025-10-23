import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ProgressStepper from './ProgressStepper';
import RoleCard from './RoleCard';
import { UserIcon, BuildingStorefrontIcon, TruckIcon as ShippingIcon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/firestore/users';

interface OnboardingPageProps {
    onComplete: (roleId: string) => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
    const { t } = useTranslation();
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string>('');
    const { currentUser, updateUserRole } = useAuth();

    // Load company name from user profile
    useEffect(() => {
        const loadUserProfile = async () => {
            if (currentUser) {
                try {
                    const profile = await getUserProfile(currentUser.uid);
                    if (profile?.companyName) {
                        setCompanyName(profile.companyName);
                    }
                } catch (error) {
                    console.error('Error loading user profile:', error);
                }
            }
        };

        loadUserProfile();
    }, [currentUser]);

    const roles = [
        {
            id: 'individual',
            icon: <UserIcon className="w-10 h-10 text-indigo-500" />,
            title: t('onboarding.individualTitle'),
            description: t('onboarding.individualDesc'),
        },
        {
            id: 'business',
            icon: <BuildingStorefrontIcon className="w-10 h-10 text-indigo-500" />,
            title: t('onboarding.businessTitle'),
            description: t('onboarding.businessDesc'),
        },
        {
            id: 'partner',
            icon: <ShippingIcon className="w-10 h-10 text-indigo-500" />,
            title: t('onboarding.partnerTitle'),
            description: t('onboarding.partnerDesc'),
        },
    ];

    const handleContinue = async () => {
        if (selectedRole) {
            await updateUserRole(selectedRole, companyName);
            onComplete(selectedRole);
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-4xl mx-auto">
                <ProgressStepper currentStep={1} totalSteps={3} />
                
                <div className="text-center my-12">
                    <h1 className="text-4xl font-bold text-gray-800 mb-3">{t('onboarding.roleTitle')}</h1>
                    <p className="text-lg text-gray-500">{t('onboarding.roleSubtitle')}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {roles.map((role) => (
                        <RoleCard
                            key={role.id}
                            icon={role.icon}
                            title={role.title}
                            description={role.description}
                            isSelected={selectedRole === role.id}
                            onClick={() => setSelectedRole(role.id)}
                        />
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <button
                        onClick={handleContinue}
                        disabled={!selectedRole}
                        className="bg-indigo-500 text-white font-bold py-3 px-12 rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('onboarding.continue')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;