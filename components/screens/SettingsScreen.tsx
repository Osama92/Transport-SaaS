import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getSubscriptionLimits } from '../../services/firestore/subscriptions';
import { useDrivers, useVehicles, useRoutes, useClients } from '../../hooks/useFirestore';
import { getUserProfile, updateWhatsAppPreferences } from '../../services/firestore/users';
import { whatsAppService } from '../../services/whatsapp/whatsappService';
import { uploadCompanyLogo, uploadAuthorizedSignature } from '../../services/firestore/storage';
import { updateOrganizationBranding } from '../../services/firestore/organizations';
import { ArrowLeftIcon } from '../Icons';
import TeamManagementScreen from './TeamManagementScreen';

interface SettingsScreenProps {
    onBack: () => void;
    onManageSubscription: () => void;
    onTestWhatsApp?: () => void;
    initialTab?: 'general' | 'password' | 'orgGeneral' | 'billing' | 'team' | 'branding';
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onManageSubscription, onTestWhatsApp, initialTab = 'general' }) => {
    const { t } = useTranslation();
    const { userRole, organization, organizationId, currentUser, updateDisplayName: updateDisplayNameAuth, updateProfilePicture } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'password' | 'orgGeneral' | 'billing' | 'team' | 'branding'>(initialTab);

    // Form states for profile
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [phone, setPhone] = useState(currentUser?.phoneNumber || '');
    const [whatsapp, setWhatsapp] = useState('');
    const [whatsappOptIn, setWhatsappOptIn] = useState(false);
    const [profileImage, setProfileImage] = useState(currentUser?.photoURL || '');
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null); // Store the actual file
    const [isSaving, setIsSaving] = useState(false);

    // Track initial values for unsaved changes detection
    const [initialDisplayName, setInitialDisplayName] = useState('');
    const [initialWhatsapp, setInitialWhatsapp] = useState('');
    const [initialWhatsappOptIn, setInitialWhatsappOptIn] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Form states for password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // Form states for branding
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string>('');
    const [isSavingBranding, setIsSavingBranding] = useState(false);

    // File upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    // Load user WhatsApp preferences on mount and set initial values
    useEffect(() => {
        const loadUserPreferences = async () => {
            if (currentUser) {
                try {
                    const userProfile = await getUserProfile(currentUser.uid);
                    if (userProfile) {
                        const whatsappNum = userProfile.whatsappNumber || '';
                        const whatsappOpt = userProfile.whatsappOptIn || false;

                        setWhatsapp(whatsappNum);
                        setWhatsappOptIn(whatsappOpt);

                        // Set initial values for change detection
                        setInitialWhatsapp(whatsappNum);
                        setInitialWhatsappOptIn(whatsappOpt);
                    }

                    // Set initial display name
                    setInitialDisplayName(currentUser.displayName || '');
                } catch (error) {
                    console.error('Error loading user preferences:', error);
                }
            }
        };
        loadUserPreferences();
    }, [currentUser]);

    // Detect unsaved changes
    useEffect(() => {
        const hasChanges =
            displayName !== initialDisplayName ||
            whatsapp !== initialWhatsapp ||
            whatsappOptIn !== initialWhatsappOptIn ||
            profileImageFile !== null;

        setHasUnsavedChanges(hasChanges);
    }, [displayName, whatsapp, whatsappOptIn, profileImageFile, initialDisplayName, initialWhatsapp, initialWhatsappOptIn]);

    // Get current data counts
    const { data: firestoreVehicles } = useVehicles(organizationId);
    const { data: firestoreDrivers } = useDrivers(organizationId);
    const { data: firestoreRoutes } = useRoutes(organizationId);
    const { data: firestoreClients } = useClients(organizationId);

    const vehicles = firestoreVehicles || [];
    const drivers = firestoreDrivers || [];
    const routes = firestoreRoutes || [];
    const clients = firestoreClients || [];

    // Calculate current month route count
    const currentMonthRouteCount = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthRoutes = routes.filter(route => {
            if (!route.createdAt) return false;
            const createdAt = new Date(route.createdAt);
            if (isNaN(createdAt.getTime())) return false;
            return createdAt >= startOfMonth;
        });
        return monthRoutes.length;
    }, [routes]);

    const currentPlanKey = organization?.subscription?.plan || 'basic';
    const currentLimits = getSubscriptionLimits(currentPlanKey, userRole || 'partner');

    // Get plan name with fallback
    const translatedName = t(`subscriptions.plans.${userRole || 'partner'}.${currentPlanKey}.name`);
    const currentPlanName = translatedName.includes('subscriptions.plans')
        ? (currentPlanKey.charAt(0).toUpperCase() + currentPlanKey.slice(1))
        : translatedName;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    const getUsagePercentage = (current: number, limit: number | undefined): number => {
        if (limit === undefined || limit === -1) return 0;
        return Math.round((current / limit) * 100);
    };

    const formatLimit = (limit: number | undefined): string => {
        if (limit === undefined) return '0';
        if (limit === -1) return '∞';
        return limit.toString();
    };

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Store the file for upload
            setProfileImageFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        if (!currentUser) return;

        setIsSaving(true);
        try {
            // Update profile picture if changed
            if (profileImageFile) {
                await updateProfilePicture(profileImageFile);
                setProfileImageFile(null);
            }

            // Update display name if changed
            if (displayName !== initialDisplayName) {
                await updateDisplayNameAuth(displayName);
                setInitialDisplayName(displayName);
            }

            // Update WhatsApp preferences if changed
            const whatsappChanged = whatsapp !== initialWhatsapp || whatsappOptIn !== initialWhatsappOptIn;
            if (whatsappChanged) {
                if (whatsappOptIn && whatsapp) {
                    await updateWhatsAppPreferences(currentUser.uid, whatsapp, whatsappOptIn);

                    // Send confirmation message to WhatsApp number
                    try {
                        const result = await whatsAppService.sendText(
                            whatsapp,
                            `Hello ${displayName}! 🎉\n\nYour WhatsApp notifications have been successfully activated. You will now receive important updates about your shipments, drivers, and vehicles.\n\nThank you for using our service!`
                        );

                        if (result.success) {
                            alert('Profile updated successfully! A confirmation message has been sent to your WhatsApp number.');
                        } else {
                            alert('Profile updated successfully! However, we could not send a confirmation to your WhatsApp number: ' + result.error);
                        }
                    } catch (whatsappError) {
                        console.error('WhatsApp notification failed:', whatsappError);
                        alert('Profile updated successfully! However, we could not send a confirmation to your WhatsApp number.');
                    }
                } else {
                    await updateWhatsAppPreferences(currentUser.uid, '', false);
                    alert('Profile updated successfully!');
                }

                // Update initial values
                setInitialWhatsapp(whatsapp);
                setInitialWhatsappOptIn(whatsappOptIn);
            } else {
                alert('Profile updated successfully!');
            }

            setHasUnsavedChanges(false);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        if (hasUnsavedChanges) {
            const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
            if (!confirmDiscard) {
                return;
            }
        }
        onBack();
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentUser?.email) {
            setPasswordError('User email not found');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        try {
            // Reauthenticate user
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);

            // Update password
            await updatePassword(currentUser, newPassword);

            setPasswordSuccess('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);
            if (error.code === 'auth/wrong-password') {
                setPasswordError('Current password is incorrect');
            } else {
                setPasswordError('Failed to update password: ' + error.message);
            }
        }
    };

    // Handle logo file selection
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.match(/^image\/(png|jpeg|jpg|gif)$/)) {
                alert('Only PNG, JPG, JPEG, or GIF files are allowed');
                return;
            }

            setLogoFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle signature file selection
    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.match(/^image\/(png|jpeg|jpg|gif)$/)) {
                alert('Only PNG, JPG, JPEG, or GIF files are allowed');
                return;
            }

            setSignatureFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setSignaturePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Save branding (logo and signature) to Firebase
    const handleSaveBranding = async () => {
        if (!organizationId) {
            alert('Organization ID not found');
            return;
        }

        if (!logoFile && !signatureFile) {
            alert('Please select at least one file to upload');
            return;
        }

        setIsSavingBranding(true);

        try {
            const updates: { logoUrl?: string; signatureUrl?: string } = {};

            // Upload logo if selected
            if (logoFile) {
                console.log('Uploading company logo...');
                const logoUrl = await uploadCompanyLogo(logoFile, organizationId);
                updates.logoUrl = logoUrl;
                console.log('Logo uploaded:', logoUrl);
            }

            // Upload signature if selected
            if (signatureFile) {
                console.log('Uploading authorized signature...');
                const signatureUrl = await uploadAuthorizedSignature(signatureFile, organizationId);
                updates.signatureUrl = signatureUrl;
                console.log('Signature uploaded:', signatureUrl);
            }

            // Update organization branding in Firestore
            await updateOrganizationBranding(organizationId, updates);

            // Reset state
            setLogoFile(null);
            setSignatureFile(null);
            setLogoPreview('');
            setSignaturePreview('');

            // Clear file inputs
            if (logoInputRef.current) logoInputRef.current.value = '';
            if (signatureInputRef.current) signatureInputRef.current.value = '';

            alert('Branding saved successfully! Your logo and signature will now appear on all new invoices.');

            // Trigger a refresh of the organization data in AuthContext
            window.location.reload();
        } catch (error: any) {
            console.error('Error saving branding:', error);
            alert('Failed to save branding: ' + error.message);
        } finally {
            setIsSavingBranding(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header - Mobile Responsive */}
            <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
                    <button onClick={handleBack} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 flex-shrink-0">
                        <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">{t('settings.title')}</h1>
                </div>
                {activeTab === 'general' && (
                    <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {isSaving ? t('settings.saving') : t('settings.save')}
                    </button>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Responsive */}
                <div className="hidden lg:block w-64 border-r border-gray-200 dark:border-slate-700 p-6 space-y-6">
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('settings.myAccount')}</h3>
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                                activeTab === 'general' ? 'bg-gray-100 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.tabs.general')}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                                activeTab === 'password' ? 'bg-gray-100 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.tabs.password')}</span>
                        </button>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('settings.organization')}</h3>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                                activeTab === 'billing' ? 'bg-gray-100 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.tabs.billing')}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                                activeTab === 'team' ? 'bg-gray-100 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.tabs.team')}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('branding')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                                activeTab === 'branding' ? 'bg-gray-100 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Branding</span>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">
                    {/* Mobile Tab Navigation - Only visible on mobile */}
                    <div className="lg:hidden mb-4 sm:mb-6">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                                    activeTab === 'general' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {t('settings.tabs.general')}
                            </button>
                            <button
                                onClick={() => setActiveTab('password')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                                    activeTab === 'password' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {t('settings.tabs.password')}
                            </button>
                            <button
                                onClick={() => setActiveTab('billing')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                                    activeTab === 'billing' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {t('settings.tabs.billing')}
                            </button>
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                                    activeTab === 'team' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {t('settings.tabs.team')}
                            </button>
                            <button
                                onClick={() => setActiveTab('branding')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                                    activeTab === 'branding' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                Branding
                            </button>
                        </div>
                    </div>
                    {activeTab === 'billing' && userRole === 'partner' && (
                        <div className="max-w-4xl space-y-6 sm:space-y-8">
                            {/* Plan & Billing Header - Mobile Responsive */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">Plan & Billing</h2>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your plan and payments.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                    <button className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700">
                                        Cancel subscription
                                    </button>
                                    <button
                                        onClick={onManageSubscription}
                                        className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                                    >
                                        <span>Manage payments</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Current Plan */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Current plan</h3>
                                    <button
                                        onClick={onManageSubscription}
                                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
                                    >
                                        Change plan
                                    </button>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Monthly plan</p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{currentPlanName}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                            Active
                                        </span>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Renew at</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                            {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Usage */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Usage</h3>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">Your usage is renewed every month.</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {/* Vehicles */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700">
                                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicles</p>
                                                <button className="text-gray-400 hover:text-gray-600">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                                {vehicles.length} <span className="text-base text-gray-400">of {formatLimit(currentLimits?.vehicles)}</span>
                                            </p>
                                            <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${getUsagePercentage(vehicles.length, currentLimits?.vehicles)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Drivers */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700">
                                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drivers</p>
                                                <button className="text-gray-400 hover:text-gray-600">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                                {drivers.length} <span className="text-base text-gray-400">of {formatLimit(currentLimits?.drivers)}</span>
                                            </p>
                                            <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${getUsagePercentage(drivers.length, currentLimits?.drivers)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Routes */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700">
                                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Routes</p>
                                                <button className="text-gray-400 hover:text-gray-600" title="Routes created this month">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                                {currentMonthRouteCount} <span className="text-base text-gray-400">of {formatLimit(currentLimits?.routes)}</span>
                                            </p>
                                            <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${getUsagePercentage(currentMonthRouteCount, currentLimits?.routes)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Clients */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700">
                                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Clients</p>
                                                <button className="text-gray-400 hover:text-gray-600">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                                {clients.length} <span className="text-base text-gray-400">of {formatLimit(currentLimits?.clients)}</span>
                                            </p>
                                            <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${getUsagePercentage(clients.length, currentLimits?.clients)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div className="max-w-2xl space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Profile Settings</h2>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 space-y-6">
                                {/* Profile Picture */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Profile Picture
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                            {profileImage ? (
                                                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl text-gray-400">👤</span>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleProfileImageChange}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
                                            >
                                                Change photo
                                            </button>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">JPG, PNG or GIF. Max size 5MB.</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={currentUser?.email || ''}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+234 800 000 0000"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        WhatsApp Integration
                                    </label>
                                    <div className="flex items-start gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            id="whatsappOptIn"
                                            checked={whatsappOptIn}
                                            onChange={(e) => setWhatsappOptIn(e.target.checked)}
                                            className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor="whatsappOptIn" className="text-sm text-gray-700 dark:text-gray-300">
                                            Subscribe to WhatsApp notifications for customer updates, delivery alerts, and support messages
                                        </label>
                                    </div>
                                    {whatsappOptIn && (
                                        <input
                                            type="tel"
                                            value={whatsapp}
                                            onChange={(e) => setWhatsapp(e.target.value)}
                                            placeholder="+234 800 000 0000"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        {whatsappOptIn && whatsapp
                                            ? 'A confirmation message will be sent when you save your changes.'
                                            : whatsappOptIn
                                            ? 'Enter your WhatsApp number to receive notifications'
                                            : 'Enable WhatsApp integration to receive real-time updates'}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Role
                                    </label>
                                    <input
                                        type="text"
                                        value={userRole?.charAt(0).toUpperCase() + userRole?.slice(1) || 'N/A'}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Organization
                                    </label>
                                    <input
                                        type="text"
                                        value={organization?.name || 'N/A'}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div className="max-w-2xl space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Change Password</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Update your password to keep your account secure.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    {passwordError && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                            {passwordError}
                                        </div>
                                    )}

                                    {passwordSuccess && (
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
                                            {passwordSuccess}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be at least 6 characters</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4 border-t dark:border-slate-700">
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600"
                                        >
                                            Update Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <TeamManagementScreen onBack={() => setActiveTab('general')} />
                    )}

                    {activeTab === 'branding' && (
                        <div className="max-w-2xl space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Company Branding</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Upload your company logo and authorized signature. These will be used in invoices and official documents.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 space-y-8">
                                {/* Company Logo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Company Logo
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-600">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                            ) : organization?.companyDetails?.logoUrl ? (
                                                <img src={organization.companyDetails.logoUrl} alt="Company Logo" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                ref={logoInputRef}
                                                id="logo-upload"
                                                accept="image/png, image/jpeg, image/jpg, image/gif"
                                                onChange={handleLogoChange}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="logo-upload"
                                                className="inline-block px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                                            >
                                                {logoFile ? 'Change Logo' : 'Upload Logo'}
                                            </label>
                                            {logoFile && (
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                    ✓ Selected: {logoFile.name}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                JPG, PNG or GIF. Max size 5MB.<br/>
                                                Recommended: Square image (500x500px or larger)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-200 dark:border-slate-700"></div>

                                {/* Authorized Signature */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Authorized Signature
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-32 h-24 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-600">
                                            {signaturePreview ? (
                                                <img src={signaturePreview} alt="Signature Preview" className="w-full h-full object-contain p-2" />
                                            ) : organization?.companyDetails?.signatureUrl ? (
                                                <img src={organization.companyDetails.signatureUrl} alt="Signature" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                ref={signatureInputRef}
                                                id="signature-upload"
                                                accept="image/png, image/jpeg, image/jpg, image/gif"
                                                onChange={handleSignatureChange}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="signature-upload"
                                                className="inline-block px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                                            >
                                                {signatureFile ? 'Change Signature' : 'Upload Signature'}
                                            </label>
                                            {signatureFile && (
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                    ✓ Selected: {signatureFile.name}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                JPG, PNG or GIF. Max size 5MB.<br/>
                                                Recommended: Transparent PNG with signature only
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Banner */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <div className="flex gap-3">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                                Automatic Invoice Branding
                                            </p>
                                            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                                Once uploaded, your logo and signature will automatically appear on all new invoices. You can still override them for individual invoices if needed.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end pt-4 border-t dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={handleSaveBranding}
                                        disabled={isSavingBranding || (!logoFile && !signatureFile)}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSavingBranding ? 'Uploading...' : 'Save Branding'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orgGeneral' && (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">Organization settings are under development.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;
