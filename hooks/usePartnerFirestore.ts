import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import type { Driver, Vehicle, Route, Client } from '../types';

/**
 * Hook to fetch drivers from partner subcollection
 */
export const usePartnerDrivers = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { organizationId } = useAuth();

    useEffect(() => {
        if (!organizationId) {
            setDrivers([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const driversRef = collection(db, 'partners', organizationId, 'drivers');
            const q = query(driversRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    const driversData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Driver));
                    setDrivers(driversData);
                    setLoading(false);
                },
                (error) => {
                    console.error('Error fetching drivers:', error);
                    setError(error.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err: any) {
            console.error('Error setting up drivers listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [organizationId]);

    return { drivers, loading, error };
};

/**
 * Hook to fetch vehicles from partner subcollection
 */
export const usePartnerVehicles = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { organizationId } = useAuth();

    useEffect(() => {
        if (!organizationId) {
            setVehicles([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const vehiclesRef = collection(db, 'partners', organizationId, 'vehicles');
            const q = query(vehiclesRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    const vehiclesData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Vehicle));
                    setVehicles(vehiclesData);
                    setLoading(false);
                },
                (error) => {
                    console.error('Error fetching vehicles:', error);
                    setError(error.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err: any) {
            console.error('Error setting up vehicles listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [organizationId]);

    return { vehicles, loading, error };
};

/**
 * Hook to fetch routes from partner subcollection
 */
export const usePartnerRoutes = () => {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { organizationId } = useAuth();

    useEffect(() => {
        if (!organizationId) {
            setRoutes([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const routesRef = collection(db, 'partners', organizationId, 'routes');
            const q = query(routesRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    const routesData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Route));
                    setRoutes(routesData);
                    setLoading(false);
                },
                (error) => {
                    console.error('Error fetching routes:', error);
                    setError(error.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err: any) {
            console.error('Error setting up routes listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [organizationId]);

    return { routes, loading, error };
};

/**
 * Hook to fetch clients from partner subcollection
 */
export const usePartnerClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { organizationId } = useAuth();

    useEffect(() => {
        if (!organizationId) {
            setClients([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const clientsRef = collection(db, 'partners', organizationId, 'clients');
            const q = query(clientsRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    const clientsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Client));
                    setClients(clientsData);
                    setLoading(false);
                },
                (error) => {
                    console.error('Error fetching clients:', error);
                    setError(error.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err: any) {
            console.error('Error setting up clients listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [organizationId]);

    return { clients, loading, error };
};