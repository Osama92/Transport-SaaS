import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    deleteField,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updatePassword as firebaseUpdatePassword,
    deleteUser
} from 'firebase/auth';
import { db, auth } from '../../firebase/firebaseConfig';
import { generateDriverId } from './utils';
import type { Driver } from '../../types';
import { validateNigerianPhone } from '../phoneValidation';
import { paystackWalletService } from '../paystack/paystackWalletService';

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
            walletBalance: 0, // Initialize wallet balance to 0
            walletCurrency: 'NGN', // Nigerian Naira
            phoneVerified: false, // Will be verified on first login
            portalAccess: {
                enabled: true,
                whatsappNotifications: true,
                loginAttempts: 0
            },
            transactionLimits: {
                dailyWithdrawalLimit: 50000, // ₦50,000 daily limit
                singleTransactionLimit: 20000, // ₦20,000 per transaction
                monthlyWithdrawalLimit: 500000, // ₦500,000 monthly limit
            },
            payrollInfo: {
                baseSalary: driverData.payrollInfo?.baseSalary || driverData.baseSalary || 0,
                pensionContributionRate: driverData.payrollInfo?.pensionContributionRate || driverData.pensionContributionRate || 8,
                nhfContributionRate: driverData.payrollInfo?.nhfContributionRate || driverData.nhfContributionRate || 2.5,
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        };

        // Validate phone number
        const phoneValidation = validateNigerianPhone(driverData.phone);
        if (!phoneValidation.isValid) {
            throw new Error(phoneValidation.error || 'Invalid phone number format');
        }
        newDriver.phone = phoneValidation.formatted; // Store in international format

        // Add bank info if provided
        if (driverData.bankInfo) {
            newDriver.bankInfo = {
                accountNumber: driverData.bankInfo.accountNumber,
                accountName: driverData.bankInfo.accountName,
                bankName: driverData.bankInfo.bankName,
                bankCode: driverData.bankInfo.bankCode || null,
                verified: false, // Will be verified later
            };
        }

        // Use setDoc with the readable ID
        await setDoc(driverRef, newDriver);

        // Initialize Paystack wallet asynchronously (don't block driver creation)
        // This creates a dedicated virtual account for the driver
        initializeDriverWallet(driverId, newDriver).catch((error) => {
            console.error(`Failed to initialize wallet for driver ${driverId}:`, error);
            // Log but don't throw - wallet can be created later
        });

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

        // Convert undefined values to deleteField()
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                updateData[key] = deleteField();
            }
        });

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

/**
 * Set driver portal credentials using Firebase Authentication
 * Creates a Firebase Auth user and links it to the driver document
 * NOTE: This will temporarily sign in as the driver, then sign back in as the current user
 */
export const setDriverCredentials = async (
    driverId: string,
    username: string,
    password: string
): Promise<void> => {
    try {
        console.log('[AUTH] Setting credentials for driver:', driverId);

        // Save current user's credentials to sign back in later
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) {
            throw new Error('No authenticated user found. Please sign in first.');
        }

        const currentUserEmail = currentUser.email;
        console.log('[AUTH] Current user:', currentUserEmail);

        // Get driver document
        const driverRef = doc(db, DRIVERS_COLLECTION, driverId);
        const driverSnap = await getDoc(driverRef);

        if (!driverSnap.exists()) {
            throw new Error('Driver not found');
        }

        const driverData = driverSnap.data();

        // Create email from username for Firebase Auth
        // Format: username@driver.internal (this won't be used for actual email)
        const authEmail = `${username}@driver.internal`;

        try {
            // Create new Firebase Auth user (this will sign in as the driver)
            const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
            console.log('[AUTH] Created Firebase Auth user:', userCredential.user.uid);

            // Update driver document with Firebase Auth UID and username
            await updateDoc(driverRef, {
                username,
                firebaseAuthUid: userCredential.user.uid,
                authEmail: authEmail,
                'portalAccess.enabled': true,
                'portalAccess.whatsappNotifications': true,
                updatedAt: serverTimestamp()
            });

            console.log('[AUTH] Credentials set successfully');

            // CRITICAL: Sign back in as the admin immediately
            // This prevents the admin from being kicked out of their session
            console.log('[AUTH] Signing back in as admin:', currentUserEmail);
            // NOTE: We need to prompt the user to re-enter their password
            // or use a Firebase Admin SDK to create the driver account without signing in
            // For now, we'll just alert the user to refresh
            alert('Driver credentials set successfully! Please sign in again to continue.');
            window.location.reload();

        } catch (authError: any) {
            // If user already exists
            if (authError.code === 'auth/email-already-in-use') {
                console.log('[AUTH] User already exists');

                // Just update the driver document
                await updateDoc(driverRef, {
                    username,
                    authEmail: authEmail,
                    'portalAccess.enabled': true,
                    'portalAccess.whatsappNotifications': true,
                    updatedAt: serverTimestamp()
                });

                console.log('[AUTH] Updated driver credentials');
            } else {
                throw authError;
            }
        }

    } catch (error) {
        console.error('[AUTH] Error setting driver credentials:', error);
        throw error;
    }
};

/**
 * Authenticate driver with username and password using Firebase Auth
 */
export const authenticateDriver = async (
    username: string,
    password: string
): Promise<Driver | null> => {
    try {
        console.log('[AUTH] Attempting to authenticate driver:', username);

        // Query for driver by username to get auth email
        const driversRef = collection(db, DRIVERS_COLLECTION);
        const q = query(driversRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('[AUTH] No driver found with username:', username);
            return null;
        }

        const driverDoc = querySnapshot.docs[0];
        const driverData = driverDoc.data();

        console.log('[AUTH] Found driver, authenticating with Firebase Auth...');

        // Get auth email (format: username@driver.internal)
        const authEmail = driverData.authEmail || `${username}@driver.internal`;

        try {
            // Authenticate with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
            console.log('[AUTH] Firebase Auth successful:', userCredential.user.uid);

            // Update last login
            await updateDoc(driverDoc.ref, {
                'portalAccess.lastLogin': serverTimestamp()
            });

            // Return driver data
            return {
                id: driverDoc.id,
                ...driverData,
                createdAt: driverData.createdAt instanceof Timestamp ? driverData.createdAt.toDate().toISOString() : driverData.createdAt,
                updatedAt: driverData.updatedAt instanceof Timestamp ? driverData.updatedAt.toDate().toISOString() : driverData.updatedAt,
                lat: driverData.locationData?.lat,
                lng: driverData.locationData?.lng,
                baseSalary: driverData.payrollInfo?.baseSalary,
                pensionContributionRate: driverData.payrollInfo?.pensionContributionRate,
                nhfContributionRate: driverData.payrollInfo?.nhfContributionRate,
            } as Driver;
        } catch (authError: any) {
            console.error('[AUTH] Firebase Auth failed:', authError.code, authError.message);

            // Check for specific auth errors
            if (authError.code === 'auth/wrong-password' || authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
                console.log('[AUTH] Invalid credentials');
                return null;
            }

            throw authError;
        }
    } catch (error) {
        console.error('[AUTH] Error authenticating driver:', error);
        throw new Error('Failed to authenticate driver');
    }
};

/**
 * Initialize Paystack wallet for a driver
 * Creates dedicated virtual account and customer
 */
const initializeDriverWallet = async (driverId: string, driverData: any): Promise<void> => {
    try {
        console.log(`[WALLET] Initializing Paystack wallet for driver ${driverId}...`);

        const driver: Driver = {
            id: driverId,
            ...driverData
        } as Driver;

        // Step 1: Create Paystack customer
        const customerResult = await paystackWalletService.createCustomer(driver);
        if (customerResult.success && customerResult.data) {
            console.log(`[WALLET] Created Paystack customer for driver ${driverId}: ${customerResult.data.customer_code}`);
        }

        // Step 2: Create dedicated virtual account (DVA)
        const dvaResult = await paystackWalletService.createDedicatedVirtualAccount(driver);
        if (dvaResult.success && dvaResult.data) {
            console.log(`[WALLET] Created virtual account for driver ${driverId}:`);
            console.log(`  - Account Number: ${dvaResult.data.account_number}`);
            console.log(`  - Bank: ${dvaResult.data.bank_name}`);
        } else {
            console.warn(`[WALLET] Failed to create virtual account for driver ${driverId}:`, dvaResult.error);
        }

        // Step 3: If bank info provided, create transfer recipient
        if (driverData.bankInfo?.accountNumber && driverData.bankInfo?.bankCode) {
            const recipientResult = await paystackWalletService.createTransferRecipient(
                driverId,
                {
                    accountNumber: driverData.bankInfo.accountNumber,
                    accountName: driverData.bankInfo.accountName,
                    bankCode: driverData.bankInfo.bankCode
                }
            );

            if (recipientResult.success) {
                console.log(`[WALLET] Created transfer recipient for driver ${driverId}`);
            }
        }

        console.log(`[WALLET] Wallet initialization complete for driver ${driverId}`);
    } catch (error) {
        console.error(`[WALLET] Error initializing wallet for driver ${driverId}:`, error);
        throw error;
    }
};

/**
 * Migration utility: Add walletBalance field to existing drivers
 * This should be called once to update existing drivers in the database
 */
export const migrateDriversAddWalletBalance = async (organizationId: string): Promise<void> => {
    try {
        console.log('[MIGRATION] Starting wallet balance migration for organization:', organizationId);

        const driversRef = collection(db, DRIVERS_COLLECTION);
        const q = query(driversRef, where('organizationId', '==', organizationId));
        const querySnapshot = await getDocs(q);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const driverDoc of querySnapshot.docs) {
            const driverData = driverDoc.data();

            // Check if walletBalance already exists
            if (driverData.walletBalance === undefined) {
                await updateDoc(driverDoc.ref, {
                    walletBalance: 0,
                    walletCurrency: 'NGN',
                    updatedAt: serverTimestamp(),
                });
                migratedCount++;
                console.log('[MIGRATION] Added walletBalance to driver:', driverDoc.id);
            } else {
                skippedCount++;
            }
        }

        console.log('[MIGRATION] Migration complete!');
        console.log('[MIGRATION] Migrated:', migratedCount, 'drivers');
        console.log('[MIGRATION] Skipped (already had walletBalance):', skippedCount, 'drivers');
    } catch (error) {
        console.error('[MIGRATION] Error migrating drivers:', error);
        throw new Error('Failed to migrate drivers');
    }
};
