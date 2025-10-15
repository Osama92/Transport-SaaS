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
import { generateReadableId, generateRouteId } from './utils';
import type { Driver, Vehicle, Route, Client } from '../../types';

/**
 * New database structure:
 * partners/
 *   {partnerId}/
 *     drivers/
 *       {driverId}
 *     vehicles/
 *       {vehicleId}
 *     routes/
 *       {routeId}
 *     clients/
 *       {clientId}
 */

// Helper to get partner collection reference
export const getPartnerCollection = (partnerId: string, collectionName: string) => {
    return collection(db, 'partners', partnerId, collectionName);
};

// Helper to get partner document reference
export const getPartnerDoc = (partnerId: string, collectionName: string, docId: string) => {
    return doc(db, 'partners', partnerId, collectionName, docId);
};

/**
 * Drivers under partner
 */
export const getPartnerDrivers = async (partnerId: string): Promise<Driver[]> => {
    try {
        const driversRef = getPartnerCollection(partnerId, 'drivers');
        const q = query(driversRef, orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        const drivers: Driver[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            drivers.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as Driver);
        });

        return drivers;
    } catch (error) {
        console.error('Error getting partner drivers:', error);
        throw new Error('Failed to fetch drivers');
    }
};

export const createPartnerDriver = async (
    partnerId: string,
    driverData: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
): Promise<string> => {
    try {
        const driverId = generateReadableId('DRV');
        const driverRef = getPartnerDoc(partnerId, 'drivers', driverId);

        const newDriver = {
            ...driverData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
            partnerId,
        };

        await setDoc(driverRef, newDriver);
        return driverId;
    } catch (error) {
        console.error('Error creating partner driver:', error);
        throw new Error('Failed to create driver');
    }
};

/**
 * Vehicles under partner
 */
export const getPartnerVehicles = async (partnerId: string): Promise<Vehicle[]> => {
    try {
        const vehiclesRef = getPartnerCollection(partnerId, 'vehicles');
        const q = query(vehiclesRef, orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        const vehicles: Vehicle[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            vehicles.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as Vehicle);
        });

        return vehicles;
    } catch (error) {
        console.error('Error getting partner vehicles:', error);
        throw new Error('Failed to fetch vehicles');
    }
};

export const createPartnerVehicle = async (
    partnerId: string,
    vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
): Promise<string> => {
    try {
        const vehicleId = generateReadableId('VEH');
        const vehicleRef = getPartnerDoc(partnerId, 'vehicles', vehicleId);

        const newVehicle = {
            ...vehicleData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
            partnerId,
        };

        await setDoc(vehicleRef, newVehicle);
        return vehicleId;
    } catch (error) {
        console.error('Error creating partner vehicle:', error);
        throw new Error('Failed to create vehicle');
    }
};

/**
 * Routes under partner
 */
export const getPartnerRoutes = async (partnerId: string): Promise<Route[]> => {
    try {
        const routesRef = getPartnerCollection(partnerId, 'routes');
        const q = query(routesRef, orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        const routes: Route[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            routes.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as Route);
        });

        return routes;
    } catch (error) {
        console.error('Error getting partner routes:', error);
        throw new Error('Failed to fetch routes');
    }
};

export const createPartnerRoute = async (
    partnerId: string,
    routeData: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
): Promise<string> => {
    try {
        const routeId = generateRouteId(routeData.origin, routeData.destination);
        const routeRef = getPartnerDoc(partnerId, 'routes', routeId);

        const newRoute = {
            ...routeData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
            partnerId,
        };

        await setDoc(routeRef, newRoute);
        return routeId;
    } catch (error) {
        console.error('Error creating partner route:', error);
        throw new Error('Failed to create route');
    }
};

/**
 * Clients under partner
 */
export const getPartnerClients = async (partnerId: string): Promise<Client[]> => {
    try {
        const clientsRef = getPartnerCollection(partnerId, 'clients');
        const q = query(clientsRef, orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        const clients: Client[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            clients.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as Client);
        });

        return clients;
    } catch (error) {
        console.error('Error getting partner clients:', error);
        throw new Error('Failed to fetch clients');
    }
};

export const createPartnerClient = async (
    partnerId: string,
    clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
): Promise<string> => {
    try {
        const clientId = generateReadableId('CLT');
        const clientRef = getPartnerDoc(partnerId, 'clients', clientId);

        const newClient = {
            ...clientData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
            partnerId,
        };

        await setDoc(clientRef, newClient);
        return clientId;
    } catch (error) {
        console.error('Error creating partner client:', error);
        throw new Error('Failed to create client');
    }
};

/**
 * Update functions
 */
export const updatePartnerDriver = async (
    partnerId: string,
    driverId: string,
    updates: Partial<Omit<Driver, 'id' | 'partnerId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const driverRef = getPartnerDoc(partnerId, 'drivers', driverId);
        await updateDoc(driverRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating partner driver:', error);
        throw new Error('Failed to update driver');
    }
};

export const updatePartnerVehicle = async (
    partnerId: string,
    vehicleId: string,
    updates: Partial<Omit<Vehicle, 'id' | 'partnerId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const vehicleRef = getPartnerDoc(partnerId, 'vehicles', vehicleId);
        await updateDoc(vehicleRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating partner vehicle:', error);
        throw new Error('Failed to update vehicle');
    }
};

export const updatePartnerRoute = async (
    partnerId: string,
    routeId: string,
    updates: Partial<Omit<Route, 'id' | 'partnerId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const routeRef = getPartnerDoc(partnerId, 'routes', routeId);
        await updateDoc(routeRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating partner route:', error);
        throw new Error('Failed to update route');
    }
};

export const updatePartnerClient = async (
    partnerId: string,
    clientId: string,
    updates: Partial<Omit<Client, 'id' | 'partnerId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const clientRef = getPartnerDoc(partnerId, 'clients', clientId);
        await updateDoc(clientRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating partner client:', error);
        throw new Error('Failed to update client');
    }
};

/**
 * Delete functions
 */
export const deletePartnerDriver = async (partnerId: string, driverId: string): Promise<void> => {
    try {
        const driverRef = getPartnerDoc(partnerId, 'drivers', driverId);
        await deleteDoc(driverRef);
    } catch (error) {
        console.error('Error deleting partner driver:', error);
        throw new Error('Failed to delete driver');
    }
};

export const deletePartnerVehicle = async (partnerId: string, vehicleId: string): Promise<void> => {
    try {
        const vehicleRef = getPartnerDoc(partnerId, 'vehicles', vehicleId);
        await deleteDoc(vehicleRef);
    } catch (error) {
        console.error('Error deleting partner vehicle:', error);
        throw new Error('Failed to delete vehicle');
    }
};

export const deletePartnerRoute = async (partnerId: string, routeId: string): Promise<void> => {
    try {
        const routeRef = getPartnerDoc(partnerId, 'routes', routeId);
        await deleteDoc(routeRef);
    } catch (error) {
        console.error('Error deleting partner route:', error);
        throw new Error('Failed to delete route');
    }
};

export const deletePartnerClient = async (partnerId: string, clientId: string): Promise<void> => {
    try {
        const clientRef = getPartnerDoc(partnerId, 'clients', clientId);
        await deleteDoc(clientRef);
    } catch (error) {
        console.error('Error deleting partner client:', error);
        throw new Error('Failed to delete client');
    }
};