import { useState, useEffect, useMemo } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    QueryConstraint,
    Unsubscribe,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Helper function to convert Firestore Timestamp objects to ISO strings
 * Recursively handles nested objects and arrays
 */
function convertTimestamps(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle Timestamp objects
    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => convertTimestamps(item));
    }

    // Handle plain objects
    if (typeof obj === 'object' && obj.constructor === Object) {
        const converted: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                converted[key] = convertTimestamps(obj[key]);
            }
        }
        return converted;
    }

    // Return primitive values as-is
    return obj;
}

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
                            const rawData = doc.data();
                            const convertedData = convertTimestamps(rawData);
                            documents.push({
                                id: doc.id,
                                ...convertedData,
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
 * Fetches routes AND their expenses subcollections
 */
export function useRoutes(organizationId: string | null) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);

    const constraintsKey = useMemo(
        () => organizationId ? `routes-${organizationId}` : 'routes-null',
        [organizationId]
    );

    useEffect(() => {
        if (!organizationId) {
            console.log('[ROUTES HOOK] No organizationId provided, clearing data');
            setData([]);
            setLoading(false);
            return;
        }

        console.log('[ROUTES HOOK] Setting up listener for organizationId:', organizationId);

        let unsubscribe: Unsubscribe;
        const expenseUnsubscribes: Unsubscribe[] = [];

        const fetchRoutesWithExpenses = async (querySnapshot: any) => {
            console.log('[ROUTES HOOK] 📥 Received snapshot with', querySnapshot.docs.length, 'routes');

            const routesPromises = querySnapshot.docs.map(async (doc: any) => {
                const rawData = doc.data();
                console.log('[ROUTES HOOK] Processing route:', doc.id, {
                    origin: rawData.origin,
                    destination: rawData.destination,
                    organizationId: rawData.organizationId,
                    status: rawData.status
                });

                const convertedData = convertTimestamps(rawData);

                // Fetch expenses subcollection for this route (with error handling)
                let expenses: any[] = [];
                try {
                    console.log('[ROUTES HOOK] Fetching expenses for route:', doc.id);
                    const expensesRef = collection(db, 'routes', doc.id, 'expenses');
                    const expensesQuery = query(expensesRef, orderBy('date', 'desc'));
                    const expensesSnapshot = await getDocs(expensesQuery);

                    expenses = expensesSnapshot.docs.map(expenseDoc => {
                        const expenseData = expenseDoc.data();
                        return {
                            id: expenseDoc.id,
                            ...convertTimestamps(expenseData)
                        };
                    });
                    console.log('[ROUTES HOOK] ✅ Loaded', expenses.length, 'expenses for route:', doc.id);
                } catch (expenseError: any) {
                    console.warn('[ROUTES HOOK] ⚠️ Could not fetch expenses for route:', doc.id);
                    console.warn('[ROUTES HOOK] Expense error:', expenseError.code, expenseError.message);
                    console.warn('[ROUTES HOOK] This is OK - continuing with empty expenses array');
                    // Continue with empty expenses - don't fail the entire route load
                    expenses = [];
                }

                const route = {
                    id: doc.id,
                    ...convertedData,
                    expenses,
                };

                console.log('[ROUTES HOOK] ✅ Route processed:', {
                    id: route.id,
                    origin: route.origin,
                    destination: route.destination,
                    status: route.status,
                    expenseCount: expenses.length
                });

                return route;
            });

            console.log('[ROUTES HOOK] ⏳ Waiting for all routes to process...');
            const routes = await Promise.all(routesPromises);
            console.log('[ROUTES HOOK] ✅ All routes processed successfully! Total:', routes.length);
            console.log('[ROUTES HOOK] Final routes data:', routes.map(r => ({
                id: r.id,
                origin: r.origin,
                destination: r.destination,
                status: r.status,
                expenses: r.expenses?.length || 0
            })));

            console.log('[ROUTES HOOK] 🎯 Setting data state with', routes.length, 'routes');
            setData(routes);
            console.log('[ROUTES HOOK] 🎯 Setting loading to false');
            setLoading(false);
            console.log('[ROUTES HOOK] ✨ DONE! Routes should now be visible in UI');
        };

        const setupListener = async () => {
            try {
                console.log('[ROUTES HOOK] 🔌 Setting up Firestore listener...');
                setLoading(true);
                setError(null);

                const routesRef = collection(db, 'routes');
                const q = query(
                    routesRef,
                    where('organizationId', '==', organizationId),
                    orderBy('createdAt', 'desc')
                );

                console.log('[ROUTES HOOK] Query:', {
                    collection: 'routes',
                    where: { organizationId },
                    orderBy: 'createdAt desc'
                });

                unsubscribe = onSnapshot(
                    q,
                    fetchRoutesWithExpenses,
                    (err) => {
                        console.error('[ROUTES HOOK] ❌ Error listening to routes:', err);
                        console.error('[ROUTES HOOK] Error code:', (err as any)?.code);
                        console.error('[ROUTES HOOK] Error message:', err.message);
                        setError(err as Error);
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error('[ROUTES HOOK] ❌ Error setting up routes listener:', err);
                setError(err as Error);
                setLoading(false);
            }
        };

        setupListener();

        // Listen for custom refresh event (triggered when expense is added)
        const handleRefresh = () => {
            setRefreshCounter(prev => prev + 1);
        };
        window.addEventListener('refreshRoutes', handleRefresh);

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
            expenseUnsubscribes.forEach(unsub => unsub());
            window.removeEventListener('refreshRoutes', handleRefresh);
        };
    }, [constraintsKey, refreshCounter]);

    return { data, loading, error };
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
 * Fetches payroll runs AND their payslips subcollections
 */
export function usePayrollRuns(organizationId: string | null) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);

    const constraintsKey = useMemo(
        () => organizationId ? `payrollRuns-${organizationId}` : 'payrollRuns-null',
        [organizationId]
    );

    useEffect(() => {
        if (!organizationId) {
            setData([]);
            setLoading(false);
            return;
        }

        let unsubscribe: Unsubscribe;

        const fetchPayrollRunsWithPayslips = async (querySnapshot: any) => {
            const payrollRunsPromises = querySnapshot.docs.map(async (doc: any) => {
                const rawData = doc.data();
                const convertedData = convertTimestamps(rawData);

                // Fetch payslips subcollection for this payroll run
                const payslipsRef = collection(db, 'payrollRuns', doc.id, 'payslips');
                const payslipsSnapshot = await getDocs(payslipsRef);

                const payslips = payslipsSnapshot.docs.map(payslipDoc => {
                    const payslipData = payslipDoc.data();
                    return {
                        id: payslipDoc.id,
                        payrollRunId: doc.id,
                        ...convertTimestamps(payslipData)
                    };
                });

                return {
                    id: doc.id,
                    ...convertedData,
                    payslips,
                };
            });

            const payrollRuns = await Promise.all(payrollRunsPromises);
            setData(payrollRuns);
            setLoading(false);
        };

        const setupListener = async () => {
            try {
                setLoading(true);
                setError(null);

                const payrollRunsRef = collection(db, 'payrollRuns');
                const q = query(
                    payrollRunsRef,
                    where('organizationId', '==', organizationId),
                    orderBy('createdAt', 'desc')
                );

                unsubscribe = onSnapshot(
                    q,
                    fetchPayrollRunsWithPayslips,
                    (err) => {
                        console.error('Error listening to payroll runs:', err);
                        setError(err as Error);
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error('Error setting up payroll runs listener:', err);
                setError(err as Error);
                setLoading(false);
            }
        };

        setupListener();

        // Listen for custom refresh event (triggered when payslip is added)
        const handleRefresh = () => {
            setRefreshCounter(prev => prev + 1);
        };
        window.addEventListener('refreshPayrollRuns', handleRefresh);

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
            window.removeEventListener('refreshPayrollRuns', handleRefresh);
        };
    }, [constraintsKey, refreshCounter]);

    return { data, loading, error };
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