
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import OnboardingPage from './components/OnboardingPage';
import SubscriptionPage from './components/SubscriptionPage';
import AuthLayout from './components/AuthLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
    const { t } = useTranslation();
    const { currentUser, userRole, organization, loading, updateUserRole } = useAuth();
    const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [isSubscription, setIsSubscription] = useState(false);

    const handleRoleSelection = (roleId: string) => {
        updateUserRole(roleId);
        setIsOnboarding(false);
        setIsSubscription(true);
    };

    const handleSubscriptionComplete = () => {
         setIsSubscription(false);
    };

    const handleBackToOnboarding = () => {
        setIsSubscription(false);
        setIsOnboarding(true);
    };
    
    // Show a loading screen while checking for user session
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    // User is logged in
    if (currentUser) {
        // If explicitly in onboarding or subscription flow, show those pages
        if (isOnboarding && !userRole) {
            return <OnboardingPage onComplete={handleRoleSelection} />;
        }

        if (isSubscription) {
            return <SubscriptionPage roleId={userRole || 'business'} onComplete={handleSubscriptionComplete} onBack={handleBackToOnboarding} />
        }

        // Check if user has completed onboarding (must have a role)
        const hasCompletedOnboarding = !!userRole;

        // User hasn't completed onboarding - show onboarding page
        if (!hasCompletedOnboarding) {
            return <OnboardingPage onComplete={handleRoleSelection} />;
        }

        // User is fully authenticated with a role - go to dashboard
        return <Dashboard role={userRole} />;
    }

    // User is not logged in, show auth pages
    if (authPage === 'login') {
        return (
            <AuthLayout title={t('auth.welcomeTitle')} subtitle={t('auth.welcomeSubtitle')}>
                <LoginPage onSwitchToSignUp={() => setAuthPage('signup')} />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={t('auth.createTitle')} subtitle={t('auth.createSubtitle')}>
            <SignUpPage onSwitchToLogin={() => setAuthPage('login')} />
        </AuthLayout>
    );
}

const App: React.FC = () => {
    return (
      <AuthProvider>
        <div className="App">
            <AppContent />
        </div>
      </AuthProvider>
    );
};

export default App;