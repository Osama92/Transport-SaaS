import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { generateDriverId } from './utils';
import type { Driver } from '../../types';

// Collection reference
const DRIVERS_COLLECTION = 'drivers';

/**
 * Get all drivers for an organization
 */
export const getDriversByOrganization = async (organizationId: string): Promise<Driver[]> => {
    try {
        const driversRef = collection(db, DRIVERS_COLLECTION);
        const q = query(
            driversRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const drivers: Driver[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            drivers.push({
                id: doc.id,
                ...data,
                // Convert Firestore Timestamps to ISO strings for compatibility
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                // Map nested locationData to flat lat/lng for backward compatibility
                lat: data.locationData?.lat,
                lng: data.locationData?.lng,
                // Map nested payrollInfo to flat fields for backward compatibility
                baseSalary: data.payrollInfo?.baseSalary,
                pensionContributionRate: data.payrollInfo?.pensionContributionRate,
                nhfContributionRate: data.payrollInfo?.nhfContributionRate,
            } as Driver);
        });

        return drivers;
    } catch (error) {
        console.error('Error getting drivers:', error);
        throw new Error('Failed to fetch drivers');
    }
};

/**
 * Get a single driver by ID
 */
export const getDriverById = async (driverId: string): Promise<Driver | null> => {
    try {
        const driverRef = doc(db, DRIVERS_COLLECTION, driverId);
        const driverSnap = await getDoc(driverRef);

        if (!driverSnap.exists()) {
            return null;
        }

        const data = driverSnap.data();
        return {
            id: driverSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            lat: data.locationData?.lat,
            lng: data.locationData?.lng,
            baseSalary: data.payrollInfo?.baseSalary,
            pensionContributionRate: data.payrollInfo?.pensionContributionRate,
            nhfContributionRate: data.payrollInfo?.nhfContributionRate,
        } as Driver;
    } catch (error) {
        console.error('Error getting driver:', error);
        throw new Error('Failed to fetch driver');
    }
};

/**
 * Create a new driver
 */
export const createDriver = async (
    organizationId: string,
    driverData: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string
): Promise<string> => {
    try {
        // Generate a readable ID
        const driverId = generateDriverId();
        const driverRef = doc(db, DRIVERS_COLLECTION, driverId);

        // Structure the data for Firestore
        const newDriver: any = {
            organizationId,
            name: driverData.name,
            email: driverData.email || '',
            location: driverData.location || '',
            status: driverData.status || 'Offline',
            avatar: driverData.avatar || '',
            licenseNumber: driverData.licenseNumber,
            phone: driverData.phone,
            nin: driverData.nin || '',
            licensePhotoUrl: driverData.licensePhotoUrl || '',
            locationData: driverData.lat && driverData.lng ? {
                lat: driverData.lat,
                lng: driverData.lng,
                lastUpdated: serverTimestamp(),
            } : null,
            safetyScore: driverData.safetyScore || 0,
            payrollInfo: {
                baseSalary: driverData.payrollInfo?.baseSalary || driverData.baseSalary || 0,
                pensionContributionRate: driverData.payrollInfo?.pensionContributionRate || driverData.pensionContributionRate || 8,
                nhfContributionRate: driverData.payrollInfo?.nhfContributionRate || driverData.nhfContributionRate || 2.5,
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        };

        // Add bank info if provided
        if (driverData.bankInfo) {
            newDriver.bankInfo = {
                accountNumber: driverData.bankInfo.accountNumber,
                accountName: driverData.bankInfo.accountName,
                bankName: driverData.bankInfo.bankName,
                bankCode: driverData.bankInfo.bankCode || null,
            };
        }

        // Use setDoc with the readable ID
        await setDoc(driverRef, newDriver);
        return driverId;
    } catch (error) {
        console.error('Error creating driver:', error);
        throw new Error('Failed to create driver');
    }
};

/**
 * Update an existing driver
 */
export const updateDriver = async (
    driverId: string,
    updates: Partial<Omit<Driver, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const driverRef = doc(db, DRIVERS_COLLECTION, driverId);

        // Structure updates for Firestore
        const updateData: any = {
            ...updates,
            updatedAt: serverTimestamp(),
        };

        // Handle nested locationData
        if (updates.lat !== undefined || updates.lng !== undefined) {
            updateData.locationData = {
                lat: updates.lat,
                lng: updates.lng,
                lastUpdated: serverTimestamp(),
            };
            // Remove flat fields
            delete updateData.lat;
            delete updateData.lng;
        }

        // Handle nested payrollInfo
        if (updates.baseSalary !== undefined ||
            updates.pensionContributionRate !== undefined ||
            updates.nhfContributionRate !== undefined) {
            updateData.payrollInfo = {
                baseSalary: updates.baseSalary,
                pensionContributionRate: updates.pensionContributionRate,
                nhfContributionRate: updates.nhfContributionRate,
            };
            // Remove flat fields
            delete updateData.baseSalary;
            delete updateData.pensionContributionRate;
            delete updateData.nhfContributionRate;
        }

        await updateDoc(driverRef, updateData);
    } catch (error) {
        console.error('Error updating driver:', error);
        throw new Error('Failed to update driver');
    }
};

/**
 * Delete a driver
 */
export const deleteDriver = async (driverId: string): Promise<void> => {
    try {
        const driverRef = doc(db, DRIVERS_COLLECTION, driverId);
        await deleteDoc(driverRef);
    } catch (error) {
        console.error('Error deleting driver:', error);
        throw new Error('Failed to delete driver');
    }
};

/**
 * Update driver location (for GPS tracking)
 */
export const updateDriverLocation = async (
    driverId: string,
    lat: number,
    lng: number,
    status?: Driver['status']
): Promise<void> => {
    try {
        const driverRef = doc(db, DRIVERS_COLLECTION, driverId);
        const updateData: any = {
            locationData: {
                lat,
                lng,
                lastUpdated: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
        };

        if (status) {
            updateData.status = status;
        }

        await updateDoc(driverRef, updateData);
    } catch (error) {
        console.error('Error updating driver location:', error);
        throw new Error('Failed to update driver location');
    }
};

/**
 * Get drivers by status
 */
export const getDriversByStatus = async (
    organizationId: string,
    status: Driver['status']
): Promise<Driver[]> => {
    try {
        const driversRef = collection(db, DRIVERS_COLLECTION);
        const q = query(
            driversRef,
            where('organizationId', '==', organizationId),
            where('status', '==', status),
            orderBy('name')
        );

        const querySnapshot = await getDocs(q);
        const drivers: Driver[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            drivers.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                lat: data.locationData?.lat,
                lng: data.locationData?.lng,
                baseSalary: data.payrollInfo?.baseSalary,
                pensionContributionRate: data.payrollInfo?.pensionContributionRate,
                nhfContributionRate: data.payrollInfo?.nhfContributionRate,
            } as Driver);
        });

        return drivers;
    } catch (error) {
        console.error('Error getting drivers by status:', error);
        throw new Error('Failed to fetch drivers by status');
    }
};
