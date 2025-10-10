import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

const USERS_COLLECTION = 'users';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'individual' | 'business' | 'partner' | null;
    organizationId: string | null;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    lastLoginAt?: Timestamp | string;
}

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return null;
        }

        const data = userSnap.data();
        return {
            uid: userSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt,
            lastLoginAt: data.lastLoginAt instanceof Timestamp
                ? data.lastLoginAt.toDate().toISOString()
                : data.lastLoginAt,
        } as UserProfile;
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw new Error('Failed to fetch user profile');
    }
};

/**
 * Create or update user profile in Firestore
 */
export const createOrUpdateUserProfile = async (
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // Update existing user
            await updateDoc(userRef, {
                email,
                displayName,
                photoURL: photoURL || null,
                lastLoginAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } else {
            // Create new user
            await setDoc(userRef, {
                uid,
                email,
                displayName,
                photoURL: photoURL || null,
                role: null,
                organizationId: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error('Error creating/updating user profile:', error);
        throw new Error('Failed to save user profile');
    }
};

/**
 * Update user role and organization
 */
export const updateUserRoleAndOrganization = async (
    uid: string,
    role: 'individual' | 'business' | 'partner',
    organizationId: string
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            role,
            organizationId,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating user role and organization:', error);
        throw new Error('Failed to update user role and organization');
    }
};

/**
 * Update last login timestamp
 */
export const updateLastLogin = async (uid: string): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating last login:', error);
        // Don't throw error for last login update
    }
};

/**
 * Update user profile fields
 */
export const updateUserProfile = async (
    uid: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL'>>
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw new Error('Failed to update user profile');
    }
};
