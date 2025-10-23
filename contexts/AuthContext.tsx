import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as AppUser, Organization } from '../types';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    updatePassword as firebaseUpdatePassword,
    User as FirebaseUser,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase/firebaseConfig';
import {
    getUserProfile,
    createOrUpdateUserProfile,
    updateUserRoleAndOrganization,
    updateLastLogin,
    markTrialAsUsed,
} from '../services/firestore/users';
import {
    createOrganization,
    getOrganizationById,
} from '../services/firestore/organizations';

interface AuthContextType {
    currentUser: AppUser | null;
    userRole: string | null;
    organizationId: string | null;
    organization: Organization | null;
    loading: boolean;
    isTrialExpired: boolean;
    signUp: (email: string, password: string, fullName: string, phone: string, companyName?: string) => Promise<void>;
    logIn: (email: string, password: string) => Promise<void>;
    logOut: () => Promise<void>;
    updateUserRole: (role: string, companyName?: string) => Promise<void>;
    updateDisplayName: (newName: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    updateProfilePicture: (file: File) => Promise<void>;
    updateNotificationPreferences: (prefs: { phone: string; whatsappOptIn: boolean }) => Promise<void>;
    setOrganization: (org: Organization) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Helper to convert Firebase User to AppUser
const firebaseUserToAppUser = (firebaseUser: FirebaseUser): AppUser => {
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL || undefined,
        phone: '',
        whatsappOptIn: false,
    };
};

// Helper to check if trial has expired
const checkTrialExpiry = (org: Organization): boolean => {
    if (!org.subscription) return false;

    const { status, trialEndDate } = org.subscription;

    // If subscription is active (paid), trial is not expired
    if (status === 'active') return false;

    // If in trial status, check if trial end date has passed
    if (status === 'trial' && trialEndDate) {
        const now = new Date();
        const endDate = trialEndDate instanceof Date ? trialEndDate : new Date(trialEndDate);
        return now > endDate;
    }

    return false;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [organization, setOrganizationState] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTrialExpired, setIsTrialExpired] = useState(false);

    useEffect(() => {
        setLoading(true);

        // Listen to Firebase Auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            // Check if we're on driver portal route
            const currentPath = window.location.pathname;
            const isDriverPortalRoute = currentPath === '/driver-portal' || currentPath.startsWith('/driver-portal');

            if (firebaseUser) {
                // If this is a driver account on driver portal, don't manage it in AuthContext
                if (isDriverPortalRoute && firebaseUser.email?.includes('@driver.internal')) {
                    console.log('[AUTH] Driver account on driver portal - not managing in AuthContext');
                    setLoading(false);
                    return;
                }

                // User is signed in - keep loading true until we have the role
                const appUser = firebaseUserToAppUser(firebaseUser);

                // Load user profile from Firestore
                try {
                    const userProfile = await getUserProfile(firebaseUser.uid);

                    if (userProfile) {
                        // Update last login (don't await, let it run in background)
                        updateLastLogin(firebaseUser.uid).catch(err => console.error('Error updating last login:', err));

                        // Set all user data atomically
                        setCurrentUser(appUser);
                        setUserRole(userProfile.role);

                        // Use organizationId from user profile (not email)
                        if (userProfile.organizationId) {
                            setOrganizationId(userProfile.organizationId);

                            // Load organization if exists
                            const org = await getOrganizationById(userProfile.organizationId);
                            setOrganizationState(org);

                            // Check trial expiry
                            if (org && org.subscription) {
                                const trialExpired = checkTrialExpiry(org);
                                setIsTrialExpired(trialExpired);
                            }
                        }
                    } else {
                        // User profile doesn't exist - check if it's a stale/invalid session
                        // (e.g., driver account, deleted user, etc.)
                        console.warn('[AUTH] User document not found for:', firebaseUser.uid);
                        console.warn('[AUTH] Email:', firebaseUser.email);

                        // If it's a driver.internal email, check if we're on the driver portal route
                        if (firebaseUser.email?.includes('@driver.internal')) {
                            const currentPath = window.location.pathname;
                            const isDriverPortalRoute = currentPath === '/driver-portal' || currentPath.startsWith('/driver-portal');

                            if (isDriverPortalRoute) {
                                // Driver is on driver portal route - allow it (don't interfere)
                                console.log('[AUTH] Driver account on driver portal route - allowing');
                                // Don't set any state in AuthContext for driver accounts
                                // The App.tsx will handle driver session management separately
                            } else {
                                // Driver trying to access admin portal - sign them out
                                console.warn('[AUTH] Driver account detected in admin portal - signing out');
                                await signOut(auth);
                                setCurrentUser(null);
                                setUserRole(null);
                                setOrganizationId(null);
                                setOrganizationState(null);
                            }
                        } else {
                            // Legitimate new user (just signed up) - set current user without role
                            // They'll go through onboarding
                            setCurrentUser(appUser);
                        }
                    }
                } catch (error) {
                    console.error('Error loading user profile:', error);
                    // If error is "not found", clear the session
                    if ((error as any)?.code === 'not-found' || (error as any)?.message?.includes('not found')) {
                        console.warn('[AUTH] User document not found (error) - signing out');
                        await signOut(auth);
                        setCurrentUser(null);
                        setUserRole(null);
                        setOrganizationId(null);
                        setOrganizationState(null);
                    } else {
                        // Other errors - still set current user (network issues, etc.)
                        setCurrentUser(appUser);
                    }
                }
            } else {
                // User is signed out
                setCurrentUser(null);
                setUserRole(null);
                setOrganizationId(null);
                setOrganizationState(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, fullName: string, phone: string, companyName?: string) => {
        try {
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Update display name in Firebase Auth
            await updateProfile(firebaseUser, {
                displayName: fullName,
            });

            // Create user profile in Firestore with phone
            await createOrUpdateUserProfile(
                firebaseUser.uid,
                email,
                fullName,
                undefined, // photoURL
                phone,
                companyName
            );

            // The onAuthStateChanged listener will handle setting the current user
        } catch (error: any) {
            console.error('Error signing up:', error);
            throw new Error(error.message || 'Failed to create account');
        }
    };

    const logIn = async (email: string, password: string) => {
        try {
            // Sign in with Firebase Auth
            await signInWithEmailAndPassword(auth, email, password);

            // The onAuthStateChanged listener will handle setting the current user
        } catch (error: any) {
            console.error('Error logging in:', error);

            // Provide user-friendly error messages
            if (error.code === 'auth/user-not-found') {
                throw new Error('No account found with this email');
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('Incorrect password');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Invalid email address');
            } else {
                throw new Error(error.message || 'Failed to log in');
            }
        }
    };

    const logOut = async () => {
        try {
            await signOut(auth);
            // The onAuthStateChanged listener will handle clearing the state
        } catch (error: any) {
            console.error('Error logging out:', error);
            throw new Error(error.message || 'Failed to log out');
        }
    };

    const updateUserRole = async (role: string, companyName?: string) => {
        if (!currentUser) {
            throw new Error("No user is currently signed in.");
        }

        try {
            // Load user profile to get phone and company name
            const userProfile = await getUserProfile(currentUser.uid);
            const userPhone = userProfile?.phone || '';
            const userCompanyName = companyName || userProfile?.companyName || '';

            // Sanitize company name for Firebase document ID
            // Remove special characters, spaces become hyphens, lowercase
            const sanitizeCompanyName = (name: string): string => {
                if (!name) return '';
                return name
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
                    .replace(/\s+/g, '-') // Replace spaces with hyphens
                    .replace(/-+/g, '-') // Replace multiple hyphens with single
                    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
            };

            // Create organization ID from company name
            const sanitizedCompanyName = sanitizeCompanyName(userCompanyName);

            // Use company name as org ID, fallback to email if no company name
            let orgId = sanitizedCompanyName || currentUser.email;

            if (!orgId) {
                throw new Error("Company name or email is required");
            }

            console.log('Original company name:', userCompanyName);
            console.log('Sanitized org ID:', orgId);

            // IMPORTANT: Set organizationId in user profile FIRST
            // This allows the security rules to grant access when checking organization
            await updateUserRoleAndOrganization(
                currentUser.uid,
                role as 'individual' | 'business' | 'partner',
                orgId
            );

            // Now check if organization already exists with this name
            let existingOrg = null;
            try {
                existingOrg = await getOrganizationById(orgId);
            } catch (error) {
                // Organization doesn't exist yet, which is fine
                console.log('Organization does not exist yet, will create');
            }

            if (existingOrg) {
                // Check if this organization belongs to the current user
                const belongsToCurrentUser = existingOrg.createdBy === currentUser.uid;

                if (belongsToCurrentUser) {
                    console.log('Organization already exists for this user, skipping creation');
                    setUserRole(role);
                    setOrganizationId(orgId);
                    setOrganizationState(existingOrg);
                    return;
                } else {
                    // Company name already taken by another user - append user ID to make unique
                    console.warn('Company name already taken, appending user ID for uniqueness');
                    orgId = `${sanitizedCompanyName}-${currentUser.uid.substring(0, 8)}`;
                    console.log('New unique org ID:', orgId);

                    // Update user profile with new unique org ID
                    await updateUserRoleAndOrganization(
                        currentUser.uid,
                        role as 'individual' | 'business' | 'partner',
                        orgId
                    );
                }
            }

            // Check if user has already used their free trial
            const hasUsedTrial = userProfile?.hasUsedTrial || false;

            // Determine subscription plan
            let subscriptionPlan: 'trial' | 'basic' | 'premium' | 'enterprise';
            let subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'expired';
            let trialStartDate: string | undefined;
            let trialEndDate: string | undefined;

            const now = new Date();

            if (!hasUsedTrial) {
                // First-time user - grant 10-day free trial
                subscriptionPlan = 'trial';
                subscriptionStatus = 'trial';
                trialStartDate = now.toISOString();
                trialEndDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

                // Mark trial as used in user profile
                await markTrialAsUsed(currentUser.uid);
                console.log('🎉 Free trial granted to new user');
            } else {
                // User has already used trial - require immediate payment
                subscriptionPlan = 'basic';
                subscriptionStatus = 'expired';
                console.log('⚠️ User has already used trial - subscription required');
            }

            // Create organization with company name as ID
            console.log('Creating new organization with ID:', orgId);
            console.log('Using company name:', userCompanyName);
            console.log('Using phone:', userPhone);

            const organizationData = {
                name: userCompanyName || `${currentUser.displayName}'s ${role.charAt(0).toUpperCase() + role.slice(1)} Organization`,
                type: role as Organization['type'],
                role: role as 'individual' | 'business' | 'partner',
                companyDetails: {
                    address: '',
                    email: currentUser.email,
                    phone: userPhone,
                },
                subscription: {
                    plan: subscriptionPlan,
                    status: subscriptionStatus,
                    startDate: now.toISOString(),
                    ...(trialStartDate && { trialStartDate }),
                    ...(trialEndDate && { trialEndDate }),
                },
            };

            // Pass sanitized company name as custom org ID
            await createOrganization(currentUser.uid, organizationData, orgId);

            // Load the created organization
            const org = await getOrganizationById(orgId);

            // Update local state
            setUserRole(role);
            setOrganizationId(orgId);
            setOrganizationState(org);
            setIsTrialExpired(subscriptionStatus === 'expired'); // Set expired if no trial
        } catch (error: any) {
            console.error('Error updating user role:', error);
            throw new Error(error.message || 'Failed to update role');
        }
    };
    
    const updateDisplayName = async (newName: string) => {
        if (!currentUser || !auth.currentUser) {
            throw new Error("No user is currently signed in.");
        }

        try {
            // Update display name in Firebase Auth
            await updateProfile(auth.currentUser, {
                displayName: newName,
            });

            // Update in Firestore
            await createOrUpdateUserProfile(
                currentUser.uid,
                currentUser.email,
                newName,
                currentUser.photoURL
            );

            // Update local state
            setCurrentUser({ ...currentUser, displayName: newName });
        } catch (error: any) {
            console.error('Error updating display name:', error);
            throw new Error(error.message || 'Failed to update display name');
        }
    };

    const updatePassword = async (newPassword: string) => {
        if (!auth.currentUser) {
            throw new Error("No user is currently signed in.");
        }

        try {
            await firebaseUpdatePassword(auth.currentUser, newPassword);
        } catch (error: any) {
            console.error('Error updating password:', error);
            throw new Error(error.message || 'Failed to update password');
        }
    };

    const updateProfilePicture = async (file: File) => {
        if (!currentUser || !auth.currentUser) {
            throw new Error("No user is currently signed in.");
        }

        try {
            // Upload to Firebase Storage
            const storageRef = ref(storage, `profile-images/${currentUser.uid}`);
            await uploadBytes(storageRef, file);
            const photoURL = await getDownloadURL(storageRef);

            // Update in Firebase Auth
            await updateProfile(auth.currentUser, { photoURL });

            // Update in Firestore
            await createOrUpdateUserProfile(
                currentUser.uid,
                currentUser.email,
                currentUser.displayName,
                photoURL
            );

            // Update local state
            setCurrentUser({ ...currentUser, photoURL });
        } catch (error: any) {
            console.error('Error updating profile picture:', error);
            throw new Error(error.message || 'Failed to update profile picture');
        }
    };

    const updateNotificationPreferences = async (prefs: { phone: string; whatsappOptIn: boolean }) => {
        if (!currentUser) {
            throw new Error("No user is currently signed in.");
        }

        // Update local state
        setCurrentUser({ ...currentUser, ...prefs });

        // Note: In production, you might want to store these preferences in Firestore
    };

    const setOrganization = (org: Organization) => {
        setOrganizationState(org);
        setOrganizationId(org.id);
    };

    const value = {
        currentUser,
        userRole,
        organizationId,
        organization,
        loading,
        isTrialExpired,
        signUp,
        logIn,
        logOut,
        updateUserRole,
        updateDisplayName,
        updatePassword,
        updateProfilePicture,
        updateNotificationPreferences,
        setOrganization,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
