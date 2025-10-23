import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
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
    phone?: string; // Phone number
    companyName?: string; // Company name for business/partner accounts
    whatsappNumber?: string; // WhatsApp number for receiving notifications
    whatsappOptIn?: boolean; // Whether user wants WhatsApp notifications
    emailVerified?: boolean; // Email verification status
    whatsappVerified?: boolean; // WhatsApp verification status
    hasUsedTrial?: boolean; // Track if user has ever used a free trial (one-time only)
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
    photoURL?: string,
    phone?: string,
    companyName?: string
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // Update existing user
            const updateData: any = {
                email,
                displayName,
                photoURL: photoURL || null,
                lastLoginAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            if (phone) updateData.phone = phone;
            if (companyName) updateData.companyName = companyName;

            await updateDoc(userRef, updateData);
        } else {
            // Create new user
            await setDoc(userRef, {
                uid,
                email,
                displayName,
                photoURL: photoURL || null,
                phone: phone || '',
                companyName: companyName || '',
                role: null,
                organizationId: null,
                emailVerified: false,
                whatsappVerified: false,
                whatsappOptIn: true, // Default to true since they provided WhatsApp number
                hasUsedTrial: false, // Track that user hasn't used trial yet
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

/**
 * Update user's WhatsApp preferences
 */
export const updateWhatsAppPreferences = async (
    uid: string,
    whatsappNumber: string,
    whatsappOptIn: boolean
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            whatsappNumber,
            whatsappOptIn,
            updatedAt: serverTimestamp(),
        });

        // If user opted in and provided WhatsApp number, register for AI assistant
        if (whatsappOptIn && whatsappNumber) {
            console.log('[WHATSAPP REGISTRATION] Registering WhatsApp number for AI assistant:', whatsappNumber);

            // Get user's profile to get organizationId and email
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const organizationId = userData.organizationId;
                const email = userData.email;

                if (organizationId) {
                    // Format WhatsApp number (remove + and spaces if present)
                    const formattedNumber = whatsappNumber.replace(/[\s+]/g, '');

                    // Register in whatsappUsers collection for AI assistant
                    const whatsappUserRef = doc(db, 'whatsappUsers', formattedNumber);
                    await setDoc(whatsappUserRef, {
                        whatsappNumber: formattedNumber,
                        userId: uid,
                        organizationId,
                        email,
                        registeredAt: serverTimestamp(),
                        registeredVia: 'settings_screen',
                        lastMessageAt: serverTimestamp()
                    });

                    console.log('[WHATSAPP REGISTRATION] ✅ Successfully registered WhatsApp number for AI assistant');
                } else {
                    console.warn('[WHATSAPP REGISTRATION] ⚠️ User has no organizationId, skipping AI registration');
                }
            }
        } else if (!whatsappOptIn) {
            // If user opted out, remove from whatsappUsers collection
            const formattedNumber = whatsappNumber.replace(/[\s+]/g, '');
            const whatsappUserRef = doc(db, 'whatsappUsers', formattedNumber);

            // Check if document exists before deleting
            const whatsappUserDoc = await getDoc(whatsappUserRef);
            if (whatsappUserDoc.exists()) {
                await deleteDoc(whatsappUserRef);
                console.log('[WHATSAPP REGISTRATION] 🗑️ Removed WhatsApp number from AI assistant');
            }
        }
    } catch (error) {
        console.error('Error updating WhatsApp preferences:', error);
        throw new Error('Failed to update WhatsApp preferences');
    }
};

/**
 * Get user's WhatsApp number (only if opted in)
 */
export const getUserWhatsAppNumber = async (uid: string): Promise<string | null> => {
    try {
        const user = await getUserProfile(uid);
        return user?.whatsappOptIn && user?.whatsappNumber ? user.whatsappNumber : null;
    } catch (error) {
        console.error('Error getting user WhatsApp number:', error);
        return null;
    }
};

/**
 * Mark that user has used their free trial (one-time only)
 */
export const markTrialAsUsed = async (uid: string): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            hasUsedTrial: true,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error marking trial as used:', error);
        throw new Error('Failed to mark trial as used');
    }
};
