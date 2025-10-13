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
import { db } from '../../firebase/firebaseConfig';
import type { Vehicle, MaintenanceLog, VehicleDocument } from '../../types';
import { generateVehicleId } from './utils';

const VEHICLES_COLLECTION = 'vehicles';

/**
 * Get all vehicles for an organization
 */
export const getVehiclesByOrganization = async (organizationId: string): Promise<Vehicle[]> => {
    try {
        const vehiclesRef = collection(db, VEHICLES_COLLECTION);
        const q = query(
            vehiclesRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const vehicles: Vehicle[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();

            // Fetch subcollection data (maintenance logs and documents)
            const maintenanceLogs = await getMaintenanceLogs(docSnap.id);
            const documents = await getVehicleDocuments(docSnap.id);

            vehicles.push({
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                // Map nested fields to flat fields for backward compatibility
                odometer: data.telematics?.odometer,
                currentSpeed: data.telematics?.currentSpeed,
                lat: data.locationData?.lat,
                lng: data.locationData?.lng,
                lastUpdated: data.locationData?.lastUpdated instanceof Timestamp
                    ? data.locationData.lastUpdated.toDate().toISOString()
                    : data.locationData?.lastUpdated,
                lastServiceDate: data.maintenance?.lastServiceDate,
                nextServiceDate: data.maintenance?.nextServiceDate,
                maintenanceLogs,
                documents,
            } as Vehicle);
        }

        return vehicles;
    } catch (error) {
        console.error('Error getting vehicles:', error);
        throw new Error('Failed to fetch vehicles');
    }
};

/**
 * Get a single vehicle by ID
 */
export const getVehicleById = async (vehicleId: string): Promise<Vehicle | null> => {
    try {
        const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
        const vehicleSnap = await getDoc(vehicleRef);

        if (!vehicleSnap.exists()) {
            return null;
        }

        const data = vehicleSnap.data();
        const maintenanceLogs = await getMaintenanceLogs(vehicleId);
        const documents = await getVehicleDocuments(vehicleId);

        return {
            id: vehicleSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            odometer: data.telematics?.odometer,
            currentSpeed: data.telematics?.currentSpeed,
            lat: data.locationData?.lat,
            lng: data.locationData?.lng,
            lastUpdated: data.locationData?.lastUpdated instanceof Timestamp
                ? data.locationData.lastUpdated.toDate().toISOString()
                : data.locationData?.lastUpdated,
            lastServiceDate: data.maintenance?.lastServiceDate,
            nextServiceDate: data.maintenance?.nextServiceDate,
            maintenanceLogs,
            documents,
        } as Vehicle;
    } catch (error) {
        console.error('Error getting vehicle:', error);
        throw new Error('Failed to fetch vehicle');
    }
};

/**
 * Create a new vehicle
 */
export const createVehicle = async (
    organizationId: string,
    vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string
): Promise<string> => {
    try {
        const vehicleId = generateVehicleId();
        const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);

        const newVehicle = {
            organizationId,
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            plateNumber: vehicleData.plateNumber,
            vin: vehicleData.vin,
            status: vehicleData.status || 'Parked',
            group: vehicleData.group || '',
            assignedDriverId: vehicleData.assignedDriverId || null,
            telematics: {
                odometer: vehicleData.odometer || vehicleData.telematics?.odometer || 0,
                odometerHistory: vehicleData.telematics?.odometerHistory || { today: 0, yesterday: 0 },
                currentSpeed: vehicleData.currentSpeed || vehicleData.telematics?.currentSpeed || 0,
                engineHours: vehicleData.telematics?.engineHours || { total: 0, today: 0, yesterday: 0 },
                batteryLevel: vehicleData.telematics?.batteryLevel || 100,
            },
            locationData: vehicleData.lat && vehicleData.lng ? {
                lat: vehicleData.lat,
                lng: vehicleData.lng,
                lastUpdated: serverTimestamp(),
            } : null,
            maintenance: {
                lastServiceDate: vehicleData.lastServiceDate || vehicleData.maintenance?.lastServiceDate || '',
                nextServiceDate: vehicleData.nextServiceDate || vehicleData.maintenance?.nextServiceDate || '',
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        };

        await setDoc(vehicleRef, newVehicle);
        return vehicleId;
    } catch (error) {
        console.error('Error creating vehicle:', error);
        throw new Error('Failed to create vehicle');
    }
};

/**
 * Update an existing vehicle
 */
export const updateVehicle = async (
    vehicleId: string,
    updates: Partial<Omit<Vehicle, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);

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

        // Handle nested telematics
        if (updates.odometer !== undefined || updates.currentSpeed !== undefined) {
            const currentVehicle = await getVehicleById(vehicleId);
            updateData.telematics = {
                ...currentVehicle?.telematics,
                odometer: updates.odometer ?? currentVehicle?.telematics?.odometer,
                currentSpeed: updates.currentSpeed ?? currentVehicle?.telematics?.currentSpeed,
            };
            delete updateData.odometer;
            delete updateData.currentSpeed;
        }

        // Handle nested locationData
        if (updates.lat !== undefined || updates.lng !== undefined) {
            updateData.locationData = {
                lat: updates.lat,
                lng: updates.lng,
                lastUpdated: serverTimestamp(),
            };
            delete updateData.lat;
            delete updateData.lng;
            delete updateData.lastUpdated;
        }

        // Handle nested maintenance
        if (updates.lastServiceDate !== undefined || updates.nextServiceDate !== undefined) {
            const currentVehicle = await getVehicleById(vehicleId);
            updateData.maintenance = {
                lastServiceDate: updates.lastServiceDate ?? currentVehicle?.maintenance?.lastServiceDate,
                nextServiceDate: updates.nextServiceDate ?? currentVehicle?.maintenance?.nextServiceDate,
            };
            delete updateData.lastServiceDate;
            delete updateData.nextServiceDate;
        }

        // Remove subcollection fields from update
        delete updateData.maintenanceLogs;
        delete updateData.documents;

        await updateDoc(vehicleRef, updateData);
    } catch (error) {
        console.error('Error updating vehicle:', error);
        throw new Error('Failed to update vehicle');
    }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (vehicleId: string): Promise<void> => {
    try {
        const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
        await deleteDoc(vehicleRef);
        // Note: Subcollections are not automatically deleted
        // In production, use Cloud Functions to handle cascade deletes
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        throw new Error('Failed to delete vehicle');
    }
};

/**
 * Update vehicle location (for GPS tracking)
 */
export const updateVehicleLocation = async (
    vehicleId: string,
    lat: number,
    lng: number,
    currentSpeed?: number,
    status?: Vehicle['status']
): Promise<void> => {
    try {
        const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
        const updateData: any = {
            locationData: {
                lat,
                lng,
                lastUpdated: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
        };

        if (currentSpeed !== undefined) {
            const currentVehicle = await getVehicleById(vehicleId);
            updateData.telematics = {
                ...currentVehicle?.telematics,
                currentSpeed,
            };
        }

        if (status) {
            updateData.status = status;
        }

        await updateDoc(vehicleRef, updateData);
    } catch (error) {
        console.error('Error updating vehicle location:', error);
        throw new Error('Failed to update vehicle location');
    }
};

/**
 * Get vehicles by status
 */
export const getVehiclesByStatus = async (
    organizationId: string,
    status: Vehicle['status']
): Promise<Vehicle[]> => {
    try {
        const vehiclesRef = collection(db, VEHICLES_COLLECTION);
        const q = query(
            vehiclesRef,
            where('organizationId', '==', organizationId),
            where('status', '==', status),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const vehicles: Vehicle[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const maintenanceLogs = await getMaintenanceLogs(docSnap.id);
            const documents = await getVehicleDocuments(docSnap.id);

            vehicles.push({
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                odometer: data.telematics?.odometer,
                currentSpeed: data.telematics?.currentSpeed,
                lat: data.locationData?.lat,
                lng: data.locationData?.lng,
                lastServiceDate: data.maintenance?.lastServiceDate,
                nextServiceDate: data.maintenance?.nextServiceDate,
                maintenanceLogs,
                documents,
            } as Vehicle);
        }

        return vehicles;
    } catch (error) {
        console.error('Error getting vehicles by status:', error);
        throw new Error('Failed to fetch vehicles by status');
    }
};

// ========== Maintenance Logs Subcollection ==========

/**
 * Get all maintenance logs for a vehicle
 */
export const getMaintenanceLogs = async (vehicleId: string): Promise<MaintenanceLog[]> => {
    try {
        const logsRef = collection(db, VEHICLES_COLLECTION, vehicleId, 'maintenanceLogs');
        const q = query(logsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as MaintenanceLog));
    } catch (error) {
        console.error('Error getting maintenance logs:', error);
        return [];
    }
};

/**
 * Add a maintenance log to a vehicle
 */
export const addMaintenanceLog = async (
    vehicleId: string,
    logData: Omit<MaintenanceLog, 'id'>
): Promise<string> => {
    try {
        const logsRef = collection(db, VEHICLES_COLLECTION, vehicleId, 'maintenanceLogs');
        const docRef = await addDoc(logsRef, logData);
        return docRef.id;
    } catch (error) {
        console.error('Error adding maintenance log:', error);
        throw new Error('Failed to add maintenance log');
    }
};

/**
 * Delete a maintenance log
 */
export const deleteMaintenanceLog = async (vehicleId: string, logId: string): Promise<void> => {
    try {
        const logRef = doc(db, VEHICLES_COLLECTION, vehicleId, 'maintenanceLogs', logId);
        await deleteDoc(logRef);
    } catch (error) {
        console.error('Error deleting maintenance log:', error);
        throw new Error('Failed to delete maintenance log');
    }
};

// ========== Vehicle Documents Subcollection ==========

/**
 * Get all documents for a vehicle
 */
export const getVehicleDocuments = async (vehicleId: string): Promise<VehicleDocument[]> => {
    try {
        const docsRef = collection(db, VEHICLES_COLLECTION, vehicleId, 'documents');
        const querySnapshot = await getDocs(docsRef);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as VehicleDocument));
    } catch (error) {
        console.error('Error getting vehicle documents:', error);
        return [];
    }
};

/**
 * Add a document to a vehicle
 */
export const addVehicleDocument = async (
    vehicleId: string,
    documentData: Omit<VehicleDocument, 'id'>
): Promise<string> => {
    try {
        const docsRef = collection(db, VEHICLES_COLLECTION, vehicleId, 'documents');
        const docRef = await addDoc(docsRef, documentData);
        return docRef.id;
    } catch (error) {
        console.error('Error adding vehicle document:', error);
        throw new Error('Failed to add vehicle document');
    }
};

/**
 * Delete a vehicle document
 */
export const deleteVehicleDocument = async (vehicleId: string, documentId: string): Promise<void> => {
    try {
        const docRef = doc(db, VEHICLES_COLLECTION, vehicleId, 'documents', documentId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting vehicle document:', error);
        throw new Error('Failed to delete vehicle document');
    }
};
