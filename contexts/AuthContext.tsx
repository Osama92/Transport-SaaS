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
import { auth } from '../firebase/firebaseConfig';
import {
    getUserProfile,
    createOrUpdateUserProfile,
    updateUserRoleAndOrganization,
    updateLastLogin,
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
    signUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
    logIn: (email: string, password: string) => Promise<void>;
    logOut: () => Promise<void>;
    updateUserRole: (role: string) => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [organization, setOrganizationState] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        // Listen to Firebase Auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in
                const appUser = firebaseUserToAppUser(firebaseUser);
                setCurrentUser(appUser);

                // Load user profile from Firestore
                try {
                    const userProfile = await getUserProfile(firebaseUser.uid);

                    if (userProfile) {
                        // Update last login
                        await updateLastLogin(firebaseUser.uid);

                        // Set role and organization
                        setUserRole(userProfile.role);
                        // Use email as organizationId for better traceability
                        const orgId = firebaseUser.email || userProfile.organizationId;
                        setOrganizationId(orgId);

                        // Load organization if exists
                        if (orgId) {
                            const org = await getOrganizationById(orgId);
                            setOrganizationState(org);
                        }
                    }
                } catch (error) {
                    console.error('Error loading user profile:', error);
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

    const signUp = async (email: string, password: string, fullName: string, phone: string) => {
        try {
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Update display name in Firebase Auth
            await updateProfile(firebaseUser, {
                displayName: fullName,
            });

            // Create user profile in Firestore
            await createOrUpdateUserProfile(
                firebaseUser.uid,
                email,
                fullName
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

    const updateUserRole = async (role: string) => {
        if (!currentUser) {
            throw new Error("No user is currently signed in.");
        }

        try {
            // Create organization in Firestore
            const organizationData = {
                name: `${currentUser.displayName}'s ${role} Organization`,
                type: role as Organization['type'],
                ownerId: currentUser.uid,
                settings: {
                    currency: 'NGN',
                    timezone: 'Africa/Lagos',
                    language: 'en',
                },
                subscription: {
                    plan: 'trial',
                    status: 'trial',
                    startDate: new Date().toISOString(),
                },
                companyDetails: {
                    address: '',
                    email: currentUser.email,
                    phone: currentUser.phone || '',
                },
            };

            const orgId = await createOrganization(currentUser.uid, organizationData);

            // Update user role and organization in Firestore
            await updateUserRoleAndOrganization(
                currentUser.uid,
                role as 'individual' | 'business' | 'partner',
                orgId
            );

            // Load the created organization
            const org = await getOrganizationById(orgId);

            // Update local state
            setUserRole(role);
            setOrganizationId(orgId);
            setOrganizationState(org);
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
            // In production, upload to Firebase Storage
            // For now, create a local URL
            const photoURL = URL.createObjectURL(file);

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
            {!loading && children}
        </AuthContext.Provider>
    );
};
