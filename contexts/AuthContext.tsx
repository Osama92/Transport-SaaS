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
                        }
                    } else {
                        // User profile doesn't exist yet (new user), set current user without role
                        setCurrentUser(appUser);
                    }
                } catch (error) {
                    console.error('Error loading user profile:', error);
                    // Still set current user even if profile loading fails
                    setCurrentUser(appUser);
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
            // Use user email as organization ID for consistency
            const emailBasedOrgId = currentUser.email;

            if (!emailBasedOrgId) {
                throw new Error("User email is required");
            }

            // Check if organization already exists
            const existingOrg = await getOrganizationById(emailBasedOrgId);

            if (existingOrg) {
                console.log('Organization already exists for this user, skipping creation');
                // Just update the role
                await updateUserRoleAndOrganization(
                    currentUser.uid,
                    role as 'individual' | 'business' | 'partner',
                    emailBasedOrgId
                );
                setUserRole(role);
                setOrganizationId(emailBasedOrgId);
                setOrganizationState(existingOrg);
                return;
            }

            // Create organization with email as ID
            console.log('Creating new organization with ID:', emailBasedOrgId);
            const organizationData = {
                name: `${currentUser.displayName}'s ${role.charAt(0).toUpperCase() + role.slice(1)} Organization`,
                type: role as Organization['type'],
                role: role as 'individual' | 'business' | 'partner',
                companyDetails: {
                    address: '',
                    email: currentUser.email,
                    phone: currentUser.phone || '',
                },
            };

            // Pass email as custom org ID
            await createOrganization(currentUser.uid, organizationData, emailBasedOrgId);

            // Update user role and organization in Firestore
            await updateUserRoleAndOrganization(
                currentUser.uid,
                role as 'individual' | 'business' | 'partner',
                emailBasedOrgId
            );

            // Load the created organization
            const org = await getOrganizationById(emailBasedOrgId);

            // Update local state
            setUserRole(role);
            setOrganizationId(emailBasedOrgId);
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
