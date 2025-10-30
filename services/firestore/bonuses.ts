/**
 * Bonuses Service for Firestore
 * Handles bonus creation, approval workflow, and notifications
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Bonus } from '../../types';
import { createNotification } from './notifications';

const BONUSES_COLLECTION = 'bonuses';

/**
 * Create a new bonus (status: Pending)
 * Creates notification for approvers
 */
export const createBonus = async (
    organizationId: string,
    bonusData: Omit<Bonus, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    createdBy: string
): Promise<string> => {
    try {
        const bonusesRef = collection(db, BONUSES_COLLECTION);

        const bonus = {
            ...bonusData,
            organizationId,
            status: 'Pending' as const,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy,
        };

        const docRef = await addDoc(bonusesRef, bonus);

        // Create notification for organization admins (approval required)
        await createNotification({
            userId: createdBy, // Notify the creator too
            organizationId,
            type: 'payment',
            title: 'Bonus Created - Pending Approval',
            message: `Bonus of ₦${bonusData.amount.toLocaleString()} for ${bonusData.driverName} (${bonusData.payPeriod}) requires approval.`,
            icon: '💰',
            metadata: {
                bonusId: docRef.id,
                driverId: bonusData.driverId,
                amount: bonusData.amount,
                payPeriod: bonusData.payPeriod,
            },
        });

        console.log('[BONUS] Created bonus:', docRef.id, 'for driver:', bonusData.driverName, 'amount:', bonusData.amount);

        return docRef.id;
    } catch (error) {
        console.error('Error creating bonus:', error);
        throw new Error('Failed to create bonus');
    }
};

/**
 * Get all bonuses for an organization
 */
export const getBonusesByOrganization = async (organizationId: string): Promise<Bonus[]> => {
    try {
        const bonusesRef = collection(db, BONUSES_COLLECTION);
        const q = query(
            bonusesRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const bonuses: Bonus[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            bonuses.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                approvedAt: data.approvedAt instanceof Timestamp ? data.approvedAt.toDate().toISOString() : data.approvedAt,
            } as Bonus);
        });

        return bonuses;
    } catch (error) {
        console.error('Error getting bonuses:', error);
        throw new Error('Failed to fetch bonuses');
    }
};

/**
 * Get bonuses by status (for filtering)
 */
export const getBonusesByStatus = async (
    organizationId: string,
    status: 'Pending' | 'Approved' | 'Paid'
): Promise<Bonus[]> => {
    try {
        const bonusesRef = collection(db, BONUSES_COLLECTION);
        const q = query(
            bonusesRef,
            where('organizationId', '==', organizationId),
            where('status', '==', status),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const bonuses: Bonus[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            bonuses.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                approvedAt: data.approvedAt instanceof Timestamp ? data.approvedAt.toDate().toISOString() : data.approvedAt,
            } as Bonus);
        });

        return bonuses;
    } catch (error) {
        console.error('Error getting bonuses by status:', error);
        throw new Error('Failed to fetch bonuses');
    }
};

/**
 * Get bonuses for a specific pay period (to aggregate into payslips)
 */
export const getBonusesByPayPeriod = async (
    organizationId: string,
    payPeriod: string,
    driverId?: string
): Promise<Bonus[]> => {
    try {
        const bonusesRef = collection(db, BONUSES_COLLECTION);

        let q;
        if (driverId) {
            // Get bonuses for specific driver and pay period (approved only)
            q = query(
                bonusesRef,
                where('organizationId', '==', organizationId),
                where('driverId', '==', driverId),
                where('payPeriod', '==', payPeriod),
                where('status', '==', 'Approved')
            );
        } else {
            // Get all bonuses for pay period (approved only)
            q = query(
                bonusesRef,
                where('organizationId', '==', organizationId),
                where('payPeriod', '==', payPeriod),
                where('status', '==', 'Approved')
            );
        }

        const querySnapshot = await getDocs(q);
        const bonuses: Bonus[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            bonuses.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                approvedAt: data.approvedAt instanceof Timestamp ? data.approvedAt.toDate().toISOString() : data.approvedAt,
            } as Bonus);
        });

        return bonuses;
    } catch (error) {
        console.error('Error getting bonuses by pay period:', error);
        throw new Error('Failed to fetch bonuses for pay period');
    }
};

/**
 * Approve a bonus
 * Creates notification for the driver
 */
export const approveBonus = async (
    bonusId: string,
    approvedBy: string,
    organizationId: string
): Promise<void> => {
    try {
        const bonusRef = doc(db, BONUSES_COLLECTION, bonusId);

        // Get the bonus details first
        const bonusDoc = await getDoc(bonusRef);
        if (!bonusDoc.exists()) {
            throw new Error('Bonus not found');
        }

        const bonusData = bonusDoc.data() as Bonus;

        await updateDoc(bonusRef, {
            status: 'Approved',
            approvedBy,
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Create notification for the creator
        await createNotification({
            userId: bonusData.createdBy || approvedBy,
            organizationId,
            type: 'payment',
            title: 'Bonus Approved',
            message: `Bonus of ₦${bonusData.amount.toLocaleString()} for ${bonusData.driverName} (${bonusData.payPeriod}) has been approved and will be included in the next payroll run.`,
            icon: '✅',
            metadata: {
                bonusId,
                driverId: bonusData.driverId,
                amount: bonusData.amount,
                payPeriod: bonusData.payPeriod,
            },
        });

        console.log('[BONUS] Approved bonus:', bonusId, 'by:', approvedBy);
    } catch (error) {
        console.error('Error approving bonus:', error);
        throw new Error('Failed to approve bonus');
    }
};

/**
 * Reject a bonus
 * Creates notification for the creator
 */
export const rejectBonus = async (
    bonusId: string,
    rejectedBy: string,
    organizationId: string,
    reason?: string
): Promise<void> => {
    try {
        const bonusRef = doc(db, BONUSES_COLLECTION, bonusId);

        // Get the bonus details first
        const bonusDoc = await getDoc(bonusRef);
        if (!bonusDoc.exists()) {
            throw new Error('Bonus not found');
        }

        const bonusData = bonusDoc.data() as Bonus;

        // Delete the bonus (or you could add a 'Rejected' status)
        await deleteDoc(bonusRef);

        // Create notification for the creator
        await createNotification({
            userId: bonusData.createdBy || rejectedBy,
            organizationId,
            type: 'payment',
            title: 'Bonus Rejected',
            message: `Bonus of ₦${bonusData.amount.toLocaleString()} for ${bonusData.driverName} (${bonusData.payPeriod}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
            icon: '❌',
            metadata: {
                bonusId,
                driverId: bonusData.driverId,
                amount: bonusData.amount,
                payPeriod: bonusData.payPeriod,
                rejectionReason: reason,
            },
        });

        console.log('[BONUS] Rejected and deleted bonus:', bonusId, 'by:', rejectedBy);
    } catch (error) {
        console.error('Error rejecting bonus:', error);
        throw new Error('Failed to reject bonus');
    }
};

/**
 * Update bonus
 */
export const updateBonus = async (
    bonusId: string,
    updates: Partial<Omit<Bonus, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const bonusRef = doc(db, BONUSES_COLLECTION, bonusId);
        await updateDoc(bonusRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });

        console.log('[BONUS] Updated bonus:', bonusId);
    } catch (error) {
        console.error('Error updating bonus:', error);
        throw new Error('Failed to update bonus');
    }
};

/**
 * Delete a bonus
 */
export const deleteBonus = async (bonusId: string): Promise<void> => {
    try {
        const bonusRef = doc(db, BONUSES_COLLECTION, bonusId);
        await deleteDoc(bonusRef);

        console.log('[BONUS] Deleted bonus:', bonusId);
    } catch (error) {
        console.error('Error deleting bonus:', error);
        throw new Error('Failed to delete bonus');
    }
};

/**
 * Mark bonuses as paid (called after payroll is processed)
 */
export const markBonusesAsPaid = async (bonusIds: string[]): Promise<void> => {
    try {
        const updates = bonusIds.map(async (bonusId) => {
            const bonusRef = doc(db, BONUSES_COLLECTION, bonusId);
            await updateDoc(bonusRef, {
                status: 'Paid',
                updatedAt: serverTimestamp(),
            });
        });

        await Promise.all(updates);

        console.log('[BONUS] Marked', bonusIds.length, 'bonuses as paid');
    } catch (error) {
        console.error('Error marking bonuses as paid:', error);
        throw new Error('Failed to mark bonuses as paid');
    }
};
