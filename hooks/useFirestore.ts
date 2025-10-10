import { useState, useEffect, useMemo } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    QueryConstraint,
    Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Custom hook for real-time Firestore queries
 * Automatically subscribes and unsubscribes to Firestore collections
 *
 * @param collectionName - Firestore collection name
 * @param constraints - Array of query constraints (where, orderBy, limit, etc.)
 * @returns { data, loading, error }
 */
export function useFirestoreCollection<T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Memoize constraints to prevent infinite re-renders
    const constraintsKey = useMemo(
        () => JSON.stringify(constraints.map(c => c.type)),
        [constraints]
    );

    useEffect(() => {
        let unsubscribe: Unsubscribe;

        const setupListener = async () => {
            try {
                setLoading(true);
                setError(null);

                const collectionRef = collection(db, collectionName);
                const q = query(collectionRef, ...constraints);

                unsubscribe = onSnapshot(
                    q,
                    (querySnapshot) => {
                        const documents: T[] = [];
                        querySnapshot.forEach((doc) => {
                            documents.push({
                                id: doc.id,
                                ...doc.data(),
                            } as T);
                        });
                        setData(documents);
                        setLoading(false);
                    },
                    (err) => {
                        console.error(`Error listening to ${collectionName}:`, err);
                        setError(err as Error);
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error(`Error setting up listener for ${collectionName}:`, err);
                setError(err as Error);
                setLoading(false);
            }
        };

        setupListener();

        // Cleanup: unsubscribe when component unmounts or dependencies change
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [collectionName, constraintsKey]);

    return { data, loading, error };
}

/**
 * Hook for fetching drivers with real-time updates
 */
export function useDrivers(organizationId: string | null) {
    const constraints = useMemo(
        () => organizationId
            ? [where('organizationId', '==', organizationId), orderBy('createdAt', 'desc')]
            : [],
        [organizationId]
    );

    return useFirestoreCollection('drivers', constraints);
}

/**
 * Hook for fetching vehicles with real-time updates
 */
export function useVehicles(organizationId: string | null) {
    const constraints = useMemo(
        () => organizationId
            ? [where('organizationId', '==', organizationId), orderBy('createdAt', 'desc')]
            : [],
        [organizationId]
    );

    return useFirestoreCollection('vehicles', constraints);
}

/**
 * Hook for fetching routes with real-time updates
 */
export function useRoutes(organizationId: string | null) {
    const constraints = useMemo(
        () => organizationId
            ? [where('organizationId', '==', organizationId), orderBy('createdAt', 'desc')]
            : [],
        [organizationId]
    );

    return useFirestoreCollection('routes', constraints);
}

/**
 * Hook for fetching clients with real-time updates
 */
export function useClients(organizationId: string | null) {
    const constraints = useMemo(
        () => organizationId
            ? [where('organizationId', '==', organizationId), orderBy('name', 'asc')]
            : [],
        [organizationId]
    );

    return useFirestoreCollection('clients', constraints);
}

/**
 * Hook for fetching invoices with real-time updates
 */
export function useInvoices(organizationId: string | null) {
    const constraints = useMemo(
        () => organizationId
            ? [where('organizationId', '==', organizationId), orderBy('createdAt', 'desc')]
            : [],
        [organizationId]
    );

    return useFirestoreCollection('invoices', constraints);
}

/**
 * Hook for fetching payroll runs with real-time updates
 */
export function usePayrollRuns(organizationId: string | null) {
    const constraints = useMemo(
        () => organizationId
            ? [where('organizationId', '==', organizationId), orderBy('createdAt', 'desc')]
            : [],
        [organizationId]
    );

    return useFirestoreCollection('payrollRuns', constraints);
}

/**
 * Hook for fetching user notifications with real-time updates
 */
export function useNotifications(userId: string | null) {
    const constraints = useMemo(
        () => userId
            ? [where('userId', '==', userId), orderBy('timestamp', 'desc')]
            : [],
        [userId]
    );

    return useFirestoreCollection('notifications', constraints);
}