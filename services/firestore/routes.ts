import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
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
import type { Route, RouteExpense } from '../../types';
import { generateRouteId } from './utils';

const ROUTES_COLLECTION = 'routes';

/**
 * Get all routes for an organization
 */
export const getRoutesByOrganization = async (organizationId: string): Promise<Route[]> => {
    try {
        const routesRef = collection(db, ROUTES_COLLECTION);
        const q = query(
            routesRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const routes: Route[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const expenses = await getRouteExpenses(docSnap.id);

            routes.push({
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                estimatedDepartureTime: data.estimatedDepartureTime instanceof Timestamp
                    ? data.estimatedDepartureTime.toDate().toISOString()
                    : data.estimatedDepartureTime,
                estimatedArrivalTime: data.estimatedArrivalTime instanceof Timestamp
                    ? data.estimatedArrivalTime.toDate().toISOString()
                    : data.estimatedArrivalTime,
                actualDepartureTime: data.actualDepartureTime instanceof Timestamp
                    ? data.actualDepartureTime.toDate().toISOString()
                    : data.actualDepartureTime,
                actualArrivalTime: data.actualArrivalTime instanceof Timestamp
                    ? data.actualArrivalTime.toDate().toISOString()
                    : data.actualArrivalTime,
                expenses,
            } as Route);
        }

        return routes;
    } catch (error) {
        console.error('Error getting routes:', error);
        throw new Error('Failed to fetch routes');
    }
};

/**
 * Get a single route by ID
 */
export const getRouteById = async (routeId: string): Promise<Route | null> => {
    try {
        const routeRef = doc(db, ROUTES_COLLECTION, routeId);
        const routeSnap = await getDoc(routeRef);

        if (!routeSnap.exists()) {
            return null;
        }

        const data = routeSnap.data();
        const expenses = await getRouteExpenses(routeId);

        return {
            ...data,
            id: routeSnap.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            estimatedDepartureTime: data.estimatedDepartureTime instanceof Timestamp
                ? data.estimatedDepartureTime.toDate().toISOString()
                : data.estimatedDepartureTime,
            estimatedArrivalTime: data.estimatedArrivalTime instanceof Timestamp
                ? data.estimatedArrivalTime.toDate().toISOString()
                : data.estimatedArrivalTime,
            actualDepartureTime: data.actualDepartureTime instanceof Timestamp
                ? data.actualDepartureTime.toDate().toISOString()
                : data.actualDepartureTime,
            actualArrivalTime: data.actualArrivalTime instanceof Timestamp
                ? data.actualArrivalTime.toDate().toISOString()
                : data.actualArrivalTime,
            expenses,
        } as Route;
    } catch (error) {
        console.error('Error getting route:', error);
        throw new Error('Failed to fetch route');
    }
};

/**
 * Create a new route
 */
export const createRoute = async (
    organizationId: string,
    routeData: Omit<Route, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string
): Promise<string> => {
    try {
        console.log('[ROUTE CREATE] Starting route creation...');
        console.log('[ROUTE CREATE] Organization ID:', organizationId);
        console.log('[ROUTE CREATE] User ID:', userId);
        console.log('[ROUTE CREATE] Route data:', {
            origin: routeData.origin,
            destination: routeData.destination,
            distance: routeData.distance,
            status: routeData.status
        });

        const routeId = generateRouteId(routeData.origin, routeData.destination);
        console.log('[ROUTE CREATE] Generated route ID:', routeId);

        const routeRef = doc(db, ROUTES_COLLECTION, routeId);

        const newRoute = {
            organizationId,
            origin: routeData.origin,
            destination: routeData.destination,
            distance: routeData.distance || 0,
            distanceKm: (routeData as any).distanceKm || routeData.distance || 0,
            stops: (routeData as any).stops || 0,
            rate: (routeData as any).rate || 0,
            driverName: (routeData as any).driverName || '',
            driverAvatar: (routeData as any).driverAvatar || '',
            vehicle: (routeData as any).vehicle || '',
            driverId: (routeData as any).driverId || null,
            vehicleId: (routeData as any).vehicleId || null,
            status: routeData.status || 'Pending',
            progress: routeData.progress || 0,
            assignedDriverId: routeData.assignedDriverId || null,
            assignedDriverName: routeData.assignedDriverName || '',
            assignedVehicleId: routeData.assignedVehicleId || null,
            assignedVehiclePlate: routeData.assignedVehiclePlate || '',
            clientId: routeData.clientId || null,
            clientName: routeData.clientName || '',
            cargo: routeData.cargo || { type: '', weight: 0, description: '' },
            estimatedDepartureTime: routeData.estimatedDepartureTime || null,
            estimatedArrivalTime: routeData.estimatedArrivalTime || null,
            actualDepartureTime: routeData.actualDepartureTime || null,
            actualArrivalTime: routeData.actualArrivalTime || null,
            podUrl: routeData.podUrl || null,
            notes: routeData.notes || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        };

        console.log('[ROUTE CREATE] Saving route to Firestore...');
        console.log('[ROUTE CREATE] Route document:', {
            id: routeId,
            organizationId: newRoute.organizationId,
            origin: newRoute.origin,
            destination: newRoute.destination,
            status: newRoute.status
        });

        await setDoc(routeRef, newRoute);

        console.log('[ROUTE CREATE] ✅ Route saved successfully!');
        console.log('[ROUTE CREATE] Route ID:', routeId);
        console.log('[ROUTE CREATE] Collection:', ROUTES_COLLECTION);
        console.log('[ROUTE CREATE] Organization ID:', organizationId);

        return routeId;
    } catch (error) {
        console.error('[ROUTE CREATE] ❌ Error creating route:', error);
        console.error('[ROUTE CREATE] Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: (error as any)?.code,
            stack: error instanceof Error ? error.stack : undefined
        });
        throw new Error('Failed to create route');
    }
};

/**
 * Update an existing route
 */
export const updateRoute = async (
    routeId: string,
    updates: Partial<Omit<Route, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const routeRef = doc(db, ROUTES_COLLECTION, routeId);

        const updateData: any = {
            ...updates,
            updatedAt: serverTimestamp(),
        };

        // Remove subcollection fields from update
        delete updateData.expenses;

        await updateDoc(routeRef, updateData);
    } catch (error) {
        console.error('Error updating route:', error);
        throw new Error('Failed to update route');
    }
};

/**
 * Delete a route
 */
export const deleteRoute = async (routeId: string): Promise<void> => {
    try {
        const routeRef = doc(db, ROUTES_COLLECTION, routeId);
        await deleteDoc(routeRef);
        // Note: Subcollections are not automatically deleted
        // In production, use Cloud Functions to handle cascade deletes
    } catch (error) {
        console.error('Error deleting route:', error);
        throw new Error('Failed to delete route');
    }
};

/**
 * Assign driver and vehicle to a route
 */
export const assignRouteResources = async (
    routeId: string,
    driverId: string,
    driverName: string,
    vehicleId: string,
    vehiclePlate: string
): Promise<void> => {
    try {
        const routeRef = doc(db, ROUTES_COLLECTION, routeId);
        await updateDoc(routeRef, {
            assignedDriverId: driverId,
            assignedDriverName: driverName,
            assignedVehicleId: vehicleId,
            assignedVehiclePlate: vehiclePlate,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error assigning route resources:', error);
        throw new Error('Failed to assign driver and vehicle');
    }
};

/**
 * Update route progress (0-100)
 */
export const updateRouteProgress = async (
    routeId: string,
    progress: number,
    status?: Route['status']
): Promise<void> => {
    try {
        const routeRef = doc(db, ROUTES_COLLECTION, routeId);
        const updateData: any = {
            progress: Math.min(100, Math.max(0, progress)),
            updatedAt: serverTimestamp(),
        };

        // Auto-update status based on progress
        if (progress === 0 && !status) {
            updateData.status = 'Pending';
        } else if (progress > 0 && progress < 100 && !status) {
            updateData.status = 'In Progress';
        } else if (progress === 100 && !status) {
            updateData.status = 'Completed';
            updateData.actualArrivalTime = serverTimestamp();
        }

        if (status) {
            updateData.status = status;
        }

        await updateDoc(routeRef, updateData);
    } catch (error) {
        console.error('Error updating route progress:', error);
        throw new Error('Failed to update route progress');
    }
};

/**
 * Start route (set departure time and status)
 */
export const startRoute = async (routeId: string): Promise<void> => {
    try {
        const routeRef = doc(db, ROUTES_COLLECTION, routeId);
        await updateDoc(routeRef, {
            status: 'In Progress',
            actualDepartureTime: serverTimestamp(),
            progress: 1,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error starting route:', error);
        throw new Error('Failed to start route');
    }
};

/**
 * Complete route (set arrival time and status)
 */
export const completeRoute = async (routeId: string, podUrl?: string): Promise<void> => {
    try {
        const routeRef = doc(db, ROUTES_COLLECTION, routeId);
        const updateData: any = {
            status: 'Completed',
            actualArrivalTime: serverTimestamp(),
            progress: 100,
            updatedAt: serverTimestamp(),
        };

        if (podUrl) {
            updateData.podUrl = podUrl;
        }

        await updateDoc(routeRef, updateData);
    } catch (error) {
        console.error('Error completing route:', error);
        throw new Error('Failed to complete route');
    }
};

/**
 * Get routes by status
 */
export const getRoutesByStatus = async (
    organizationId: string,
    status: Route['status']
): Promise<Route[]> => {
    try {
        const routesRef = collection(db, ROUTES_COLLECTION);
        const q = query(
            routesRef,
            where('organizationId', '==', organizationId),
            where('status', '==', status),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const routes: Route[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const expenses = await getRouteExpenses(docSnap.id);

            routes.push({
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                estimatedDepartureTime: data.estimatedDepartureTime instanceof Timestamp
                    ? data.estimatedDepartureTime.toDate().toISOString()
                    : data.estimatedDepartureTime,
                estimatedArrivalTime: data.estimatedArrivalTime instanceof Timestamp
                    ? data.estimatedArrivalTime.toDate().toISOString()
                    : data.estimatedArrivalTime,
                actualDepartureTime: data.actualDepartureTime instanceof Timestamp
                    ? data.actualDepartureTime.toDate().toISOString()
                    : data.actualDepartureTime,
                actualArrivalTime: data.actualArrivalTime instanceof Timestamp
                    ? data.actualArrivalTime.toDate().toISOString()
                    : data.actualArrivalTime,
                expenses,
            } as Route);
        }

        return routes;
    } catch (error) {
        console.error('Error getting routes by status:', error);
        throw new Error('Failed to fetch routes by status');
    }
};

/**
 * Get routes by driver
 */
export const getRoutesByDriver = async (
    organizationId: string,
    driverId: string
): Promise<Route[]> => {
    try {
        const routesRef = collection(db, ROUTES_COLLECTION);
        const q = query(
            routesRef,
            where('organizationId', '==', organizationId),
            where('assignedDriverId', '==', driverId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const routes: Route[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const expenses = await getRouteExpenses(docSnap.id);

            routes.push({
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                estimatedDepartureTime: data.estimatedDepartureTime instanceof Timestamp
                    ? data.estimatedDepartureTime.toDate().toISOString()
                    : data.estimatedDepartureTime,
                estimatedArrivalTime: data.estimatedArrivalTime instanceof Timestamp
                    ? data.estimatedArrivalTime.toDate().toISOString()
                    : data.estimatedArrivalTime,
                actualDepartureTime: data.actualDepartureTime instanceof Timestamp
                    ? data.actualDepartureTime.toDate().toISOString()
                    : data.actualDepartureTime,
                actualArrivalTime: data.actualArrivalTime instanceof Timestamp
                    ? data.actualArrivalTime.toDate().toISOString()
                    : data.actualArrivalTime,
                expenses,
            } as Route);
        }

        return routes;
    } catch (error) {
        console.error('Error getting routes by driver:', error);
        throw new Error('Failed to fetch routes by driver');
    }
};

/**
 * Get routes by vehicle
 */
export const getRoutesByVehicle = async (
    organizationId: string,
    vehicleId: string
): Promise<Route[]> => {
    try {
        const routesRef = collection(db, ROUTES_COLLECTION);
        const q = query(
            routesRef,
            where('organizationId', '==', organizationId),
            where('assignedVehicleId', '==', vehicleId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const routes: Route[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const expenses = await getRouteExpenses(docSnap.id);

            routes.push({
                ...data,
                id: docSnap.id,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                estimatedDepartureTime: data.estimatedDepartureTime instanceof Timestamp
                    ? data.estimatedDepartureTime.toDate().toISOString()
                    : data.estimatedDepartureTime,
                estimatedArrivalTime: data.estimatedArrivalTime instanceof Timestamp
                    ? data.estimatedArrivalTime.toDate().toISOString()
                    : data.estimatedArrivalTime,
                actualDepartureTime: data.actualDepartureTime instanceof Timestamp
                    ? data.actualDepartureTime.toDate().toISOString()
                    : data.actualDepartureTime,
                actualArrivalTime: data.actualArrivalTime instanceof Timestamp
                    ? data.actualArrivalTime.toDate().toISOString()
                    : data.actualArrivalTime,
                expenses,
            } as Route);
        }

        return routes;
    } catch (error) {
        console.error('Error getting routes by vehicle:', error);
        throw new Error('Failed to fetch routes by vehicle');
    }
};

// ========== Route Expenses Subcollection ==========

/**
 * Get all expenses for a route
 */
export const getRouteExpenses = async (routeId: string): Promise<RouteExpense[]> => {
    try {
        const expensesRef = collection(db, ROUTES_COLLECTION, routeId, 'expenses');
        const q = query(expensesRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date instanceof Timestamp
                ? doc.data().date.toDate().toISOString()
                : doc.data().date,
        } as RouteExpense));
    } catch (error) {
        console.error('Error getting route expenses:', error);
        return [];
    }
};

/**
 * Add an expense to a route
 */
export const addRouteExpense = async (
    routeId: string,
    expenseData: Omit<RouteExpense, 'id'>
): Promise<string> => {
    try {
        const expensesRef = collection(db, ROUTES_COLLECTION, routeId, 'expenses');
        const docRef = await addDoc(expensesRef, {
            ...expenseData,
            date: expenseData.date || serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding route expense:', error);
        throw new Error('Failed to add route expense');
    }
};

/**
 * Update a route expense
 */
export const updateRouteExpense = async (
    routeId: string,
    expenseId: string,
    updates: Partial<Omit<RouteExpense, 'id'>>
): Promise<void> => {
    try {
        const expenseRef = doc(db, ROUTES_COLLECTION, routeId, 'expenses', expenseId);
        await updateDoc(expenseRef, updates);
    } catch (error) {
        console.error('Error updating route expense:', error);
        throw new Error('Failed to update route expense');
    }
};

/**
 * Delete a route expense
 */
export const deleteRouteExpense = async (routeId: string, expenseId: string): Promise<void> => {
    try {
        const expenseRef = doc(db, ROUTES_COLLECTION, routeId, 'expenses', expenseId);
        await deleteDoc(expenseRef);
    } catch (error) {
        console.error('Error deleting route expense:', error);
        throw new Error('Failed to delete route expense');
    }
};

/**
 * Get total expenses for a route
 */
export const getRouteTotalExpenses = async (routeId: string): Promise<number> => {
    try {
        const expenses = await getRouteExpenses(routeId);
        return expenses.reduce((total, expense) => total + expense.amount, 0);
    } catch (error) {
        console.error('Error calculating route expenses:', error);
        return 0;
    }
};
