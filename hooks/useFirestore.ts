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
 * Maps Firestore notification data to match the Notification type
 */
export function useNotifications(userId: string | null) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!userId) {
            setData([]);
            setLoading(false);
            return;
        }

        let unsubscribe: Unsubscribe;

        const setupListener = async () => {
            try {
                setLoading(true);
                setError(null);

                const notificationsRef = collection(db, 'notifications');
                const q = query(
                    notificationsRef,
                    where('userId', '==', userId),
                    orderBy('timestamp', 'desc')
                );

                unsubscribe = onSnapshot(
                    q,
                    (querySnapshot) => {
                        const notifications: any[] = [];
                        querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            // Map Firestore data to Notification type
                            notifications.push({
                                id: doc.id, // Keep as string
                                title: data.title,
                                description: data.message, // Map message to description
                                icon: data.icon,
                                iconBg: getIconBg(data.type), // Generate iconBg based on type
                                type: mapNotificationType(data.type), // Map type to NotificationType
                                timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
                                read: data.read || false,
                            });
                        });
                        setData(notifications);
                        setLoading(false);
                    },
                    (err) => {
                        console.error('Error listening to notifications:', err);
                        setError(err as Error);
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error('Error setting up notifications listener:', err);
                setError(err as Error);
                setLoading(false);
            }
        };

        setupListener();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [userId]);

    return { data, loading, error };
}

/**
 * Helper function to get iconBg color based on notification type
 */
function getIconBg(type: string): string {
    const iconBgMap: Record<string, string> = {
        order: 'bg-blue-100',
        route: 'bg-blue-100',
        driver: 'bg-green-100',
        vehicle: 'bg-orange-100',
        payment: 'bg-green-100',
        maintenance: 'bg-yellow-100',
        system: 'bg-gray-100',
    };
    return iconBgMap[type] || 'bg-gray-100';
}

/**
 * Helper function to map Firestore notification type to NotificationType
 */
function mapNotificationType(type: string): string {
    const typeMap: Record<string, string> = {
        order: 'Order',
        route: 'Order', // Route notifications shown as Order type
        driver: 'Driver',
        vehicle: 'Vehicle',
        payment: 'System',
        maintenance: 'Vehicle',
        system: 'System',
    };
    return typeMap[type] || 'System';
}