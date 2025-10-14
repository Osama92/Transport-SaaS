
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import OnboardingPage from './components/OnboardingPage';
import SubscriptionPage from './components/SubscriptionPage';
import AuthLayout from './components/AuthLayout';
import DriverPortalLogin from './components/DriverPortalLogin';
import DriverPortalEnhanced from './components/DriverPortalEnhanced';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { Driver } from './types';

const AppContent: React.FC = () => {
    const { t } = useTranslation();
    const { currentUser, userRole, organization, loading, updateUserRole } = useAuth();
    const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [isSubscription, setIsSubscription] = useState(false);

    // Driver portal state
    const [driverSession, setDriverSession] = useState<Driver | null>(null);
    const [checkingDriverSession, setCheckingDriverSession] = useState(true);

    // Check if URL is driver portal and check for existing session
    useEffect(() => {
        const path = window.location.pathname;

        if (path === '/driver-portal' || path.startsWith('/driver-portal')) {
            // Check for existing driver session
            const savedSession = localStorage.getItem('driverSession');
            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession);
                    // DriverPortalLogin already stores full driver object with id field
                    setDriverSession(session as Driver);
                } catch (error) {
                    console.error('Error loading driver session:', error);
                    localStorage.removeItem('driverSession');
                }
            }
        }

        setCheckingDriverSession(false);
    }, []);

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

    const handleDriverLogin = (driver: Driver) => {
        setDriverSession(driver);
    };

    const handleDriverLogout = () => {
        setDriverSession(null);
        localStorage.removeItem('driverSession');
    };

    // Show a loading screen while checking for sessions
    if (loading || checkingDriverSession) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    // Driver Portal Route
    const isDriverPortalRoute = window.location.pathname === '/driver-portal' || window.location.pathname.startsWith('/driver-portal');

    if (isDriverPortalRoute) {
        if (driverSession) {
            return <DriverPortalEnhanced driver={driverSession} onLogout={handleDriverLogout} />;
        } else {
            return <DriverPortalLogin onLoginSuccess={handleDriverLogin} />;
        }
    }

    // Regular user flow (admin portal)
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