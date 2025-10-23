import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { Organization } from '../../types';
import { generateOrganizationId } from './utils';

// Collection reference
const ORGANIZATIONS_COLLECTION = 'organizations';

/**
 * Get organization by ID
 */
export const getOrganizationById = async (organizationId: string): Promise<Organization | null> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
        const orgSnap = await getDoc(orgRef);

        if (!orgSnap.exists()) {
            return null;
        }

        const data = orgSnap.data();

        // Convert Firestore Timestamps to ISO strings
        const subscription = data.subscription ? {
            ...data.subscription,
            startDate: data.subscription.startDate instanceof Timestamp
                ? data.subscription.startDate.toDate().toISOString()
                : data.subscription.startDate,
            trialStartDate: data.subscription.trialStartDate instanceof Timestamp
                ? data.subscription.trialStartDate.toDate().toISOString()
                : data.subscription.trialStartDate,
            trialEndDate: data.subscription.trialEndDate instanceof Timestamp
                ? data.subscription.trialEndDate.toDate().toISOString()
                : data.subscription.trialEndDate,
            lastPaymentDate: data.subscription.lastPaymentDate instanceof Timestamp
                ? data.subscription.lastPaymentDate.toDate().toISOString()
                : data.subscription.lastPaymentDate,
        } : data.subscription;

        return {
            id: orgSnap.id,
            ...data,
            subscription,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as Organization;
    } catch (error) {
        console.error('Error getting organization:', error);
        throw new Error('Failed to fetch organization');
    }
};

/**
 * Create a new organization
 */
export const createOrganization = async (
    userId: string,
    orgData: {
        name: string;
        type: Organization['type'];
        role: 'individual' | 'business' | 'partner';
        companyDetails?: Organization['companyDetails'];
        subscription?: Organization['subscription'];
    },
    customOrgId?: string
): Promise<string> => {
    try {
        // Use custom ID if provided (e.g., user email), otherwise generate random ID
        const organizationId = customOrgId || generateOrganizationId();
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);

        const newOrg: Omit<Organization, 'id'> = {
            name: orgData.name,
            type: orgData.type,
            ownerId: userId,
            members: [
                {
                    userId,
                    role: 'owner',
                    permissions: ['*'], // Owner has all permissions
                    addedAt: new Date().toISOString(),
                },
            ],
            settings: {
                currency: 'NGN',
                timezone: 'Africa/Lagos',
                language: 'en',
            },
            subscription: orgData.subscription || {
                plan: 'trial',
                status: 'trial',
                startDate: new Date().toISOString(),
            },
            companyDetails: orgData.companyDetails || {
                address: '',
                email: '',
                phone: '',
            },
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
            createdBy: userId,
        };

        await setDoc(orgRef, newOrg);
        return organizationId;
    } catch (error) {
        console.error('Error creating organization:', error);
        throw new Error('Failed to create organization');
    }
};

/**
 * Update organization details
 */
export const updateOrganization = async (
    organizationId: string,
    updates: Partial<Omit<Organization, 'id' | 'ownerId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);

        const updateData: any = {
            ...updates,
            updatedAt: serverTimestamp(),
        };

        await updateDoc(orgRef, updateData);
    } catch (error) {
        console.error('Error updating organization:', error);
        throw new Error('Failed to update organization');
    }
};

/**
 * Update organization company details
 */
export const updateOrganizationCompanyDetails = async (
    organizationId: string,
    companyDetails: Organization['companyDetails']
): Promise<void> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);

        await updateDoc(orgRef, {
            companyDetails,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating company details:', error);
        throw new Error('Failed to update company details');
    }
};

/**
 * Update subscription status
 */
export const updateOrganizationSubscription = async (
    organizationId: string,
    subscription: Organization['subscription']
): Promise<void> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);

        await updateDoc(orgRef, {
            subscription,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        throw new Error('Failed to update subscription');
    }
};

/**
 * Add a member to organization
 */
export const addOrganizationMember = async (
    organizationId: string,
    userId: string,
    role: 'admin' | 'member',
    permissions: string[] = []
): Promise<void> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
        const orgSnap = await getDoc(orgRef);

        if (!orgSnap.exists()) {
            throw new Error('Organization not found');
        }

        const org = orgSnap.data() as Organization;
        const members = org.members || [];

        // Check if member already exists
        if (members.some((m) => m.userId === userId)) {
            throw new Error('User is already a member of this organization');
        }

        members.push({
            userId,
            role,
            permissions,
            addedAt: new Date().toISOString(),
        });

        await updateDoc(orgRef, {
            members,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error adding organization member:', error);
        throw new Error('Failed to add member to organization');
    }
};

/**
 * Remove a member from organization
 */
export const removeOrganizationMember = async (
    organizationId: string,
    userId: string
): Promise<void> => {
    try {
        const orgRef = doc(db, ORGANIZATIONS_COLLECTION, organizationId);
        const orgSnap = await getDoc(orgRef);

        if (!orgSnap.exists()) {
            throw new Error('Organization not found');
        }

        const org = orgSnap.data() as Organization;
        const members = org.members || [];

        // Cannot remove owner
        if (org.ownerId === userId) {
            throw new Error('Cannot remove organization owner');
        }

        const updatedMembers = members.filter((m) => m.userId !== userId);

        await updateDoc(orgRef, {
            members: updatedMembers,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error removing organization member:', error);
        throw new Error('Failed to remove member from organization');
    }
};
