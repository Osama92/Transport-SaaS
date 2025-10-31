
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import VerificationPage from './components/VerificationPage';
import OnboardingPage from './components/OnboardingPage';
import SubscriptionPage from './components/SubscriptionPage';
import AuthLayout from './components/AuthLayout';
import DriverPortalLogin from './components/DriverPortalLogin';
import DriverPortalProfessional from './components/DriverPortalProfessional';
import DriverPhoneLogin from './components/driver-portal/DriverPhoneLogin';
import DriverPortalDashboard from './components/driver-portal/DriverPortalDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { Driver } from './types';

const AppContent: React.FC = () => {
    const { t } = useTranslation();
    const { currentUser, userRole, organization, loading, isTrialExpired, updateUserRole } = useAuth();
    const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');
    const [isVerification, setIsVerification] = useState(false);
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [isSubscription, setIsSubscription] = useState(false);
    const [forceShowSubscription, setForceShowSubscription] = useState(false);

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

    const handleVerificationComplete = () => {
        setIsVerification(false);
        setIsOnboarding(true);
    };

    const handleRoleSelection = (roleId: string) => {
        updateUserRole(roleId);
        setIsOnboarding(false);
        // Don't show subscription page - user goes directly to dashboard with trial
        // They'll only see subscription page when trial expires or they click upgrade
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
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-indigo-600 font-semibold text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    // Driver Portal Route (Old version with username/password)
    const isDriverPortalRoute = window.location.pathname === '/driver-portal' || window.location.pathname.startsWith('/driver-portal');

    // New Wallet Driver Portal Route (Phone-based with wallet)
    const isWalletPortalRoute = window.location.pathname === '/driver-wallet' || window.location.pathname.startsWith('/driver-wallet');

    if (isDriverPortalRoute) {
        if (driverSession) {
            // Use full-featured driver portal with navigation
            return <DriverPortalDashboard driver={driverSession} onLogout={handleDriverLogout} />;
        } else {
            // Use username/password login (configured by admin in team management)
            return <DriverPortalLogin onLoginSuccess={handleDriverLogin} />;
        }
    }

    if (isWalletPortalRoute) {
        // Redirect /driver-wallet to /driver-portal (same UI now)
        window.location.href = '/driver-portal';
        return null;
    }

    // Regular user flow (admin portal)
    // User is logged in
    if (currentUser) {
        // TODO: Check if user is verified (email or WhatsApp)
        // For now, we'll show verification after signup, then onboarding
        const isVerified = true; // TODO: Get from user profile

        // If explicitly in verification flow
        if (isVerification && !isVerified) {
            return <VerificationPage onVerificationComplete={handleVerificationComplete} />;
        }

        // If explicitly in onboarding or subscription flow, show those pages
        if (isOnboarding && !userRole) {
            return <OnboardingPage onComplete={handleRoleSelection} />;
        }

        if (isSubscription) {
            return <SubscriptionPage roleId={userRole || 'business'} onComplete={handleSubscriptionComplete} onBack={handleBackToOnboarding} />
        }

        // Check if user has completed onboarding (must have a role)
        const hasCompletedOnboarding = !!userRole;

        // User is fully authenticated with a role
        if (hasCompletedOnboarding) {
            // Check if trial has expired or subscription is required
            const subscriptionStatus = organization?.subscription?.status;

            if (forceShowSubscription || isTrialExpired || subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
                return <SubscriptionPage roleId={userRole} onComplete={handleSubscriptionComplete} onBack={() => setForceShowSubscription(false)} />;
            }

            // Trial active or subscription active - show dashboard
            return <Dashboard role={userRole} onSubscribeClick={() => setForceShowSubscription(true)} />;
        }

        // User hasn't been verified yet - show verification
        if (!isVerified) {
            return <VerificationPage onVerificationComplete={handleVerificationComplete} />;
        }

        // User hasn't completed onboarding - show onboarding page
        return <OnboardingPage onComplete={handleRoleSelection} />;
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