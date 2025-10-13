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
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { Client } from '../../types';
import { generateClientId } from './utils';

const CLIENTS_COLLECTION = 'clients';

/**
 * Get all clients for an organization
 */
export const getClientsByOrganization = async (organizationId: string): Promise<Client[]> => {
    try {
        const clientsRef = collection(db, CLIENTS_COLLECTION);
        const q = query(
            clientsRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const clients: Client[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as Client;
        });

        return clients;
    } catch (error) {
        console.error('Error getting clients:', error);
        throw new Error('Failed to fetch clients');
    }
};

/**
 * Get a single client by ID
 */
export const getClientById = async (clientId: string): Promise<Client | null> => {
    try {
        const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
        const clientSnap = await getDoc(clientRef);

        if (!clientSnap.exists()) {
            return null;
        }

        const data = clientSnap.data();
        return {
            id: clientSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as Client;
    } catch (error) {
        console.error('Error getting client:', error);
        throw new Error('Failed to fetch client');
    }
};

/**
 * Create a new client
 */
export const createClient = async (
    organizationId: string,
    clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string
): Promise<string> => {
    try {
        const clientId = generateClientId();
        const clientRef = doc(db, CLIENTS_COLLECTION, clientId);

        const newClient = {
            organizationId,
            name: clientData.name,
            email: clientData.email || '',
            phone: clientData.phone || '',
            company: clientData.company || '',
            address: clientData.address || '',
            status: clientData.status || 'Active',
            notes: clientData.notes || '',
            contactPerson: clientData.contactPerson || '',
            taxId: clientData.taxId || '',
            tin: clientData.tin || '',
            cacNumber: clientData.cacNumber || '',
            paymentTerms: clientData.paymentTerms || 'Net 30',
            creditLimit: clientData.creditLimit || 0,
            outstandingBalance: clientData.outstandingBalance || 0,
            totalRevenue: clientData.totalRevenue || 0,
            totalRoutes: clientData.totalRoutes || 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        };

        await setDoc(clientRef, newClient);
        return clientId;
    } catch (error) {
        console.error('Error creating client:', error);
        throw new Error('Failed to create client');
    }
};

/**
 * Update an existing client
 */
export const updateClient = async (
    clientId: string,
    updates: Partial<Omit<Client, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const clientRef = doc(db, CLIENTS_COLLECTION, clientId);

        const updateData: any = {
            ...updates,
            updatedAt: serverTimestamp(),
        };

        await updateDoc(clientRef, updateData);
    } catch (error) {
        console.error('Error updating client:', error);
        throw new Error('Failed to update client');
    }
};

/**
 * Delete a client
 */
export const deleteClient = async (clientId: string): Promise<void> => {
    try {
        const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
        await deleteDoc(clientRef);
    } catch (error) {
        console.error('Error deleting client:', error);
        throw new Error('Failed to delete client');
    }
};

/**
 * Update client status
 */
export const updateClientStatus = async (
    clientId: string,
    status: Client['status']
): Promise<void> => {
    try {
        const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
        await updateDoc(clientRef, {
            status,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating client status:', error);
        throw new Error('Failed to update client status');
    }
};

/**
 * Get clients by status
 */
export const getClientsByStatus = async (
    organizationId: string,
    status: Client['status']
): Promise<Client[]> => {
    try {
        const clientsRef = collection(db, CLIENTS_COLLECTION);
        const q = query(
            clientsRef,
            where('organizationId', '==', organizationId),
            where('status', '==', status),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const clients: Client[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as Client;
        });

        return clients;
    } catch (error) {
        console.error('Error getting clients by status:', error);
        throw new Error('Failed to fetch clients by status');
    }
};

/**
 * Update client financial stats (outstanding balance, total revenue)
 */
export const updateClientFinancials = async (
    clientId: string,
    updates: {
        outstandingBalance?: number;
        totalRevenue?: number;
        totalRoutes?: number;
    }
): Promise<void> => {
    try {
        const clientRef = doc(db, CLIENTS_COLLECTION, clientId);

        const updateData: any = {
            updatedAt: serverTimestamp(),
        };

        if (updates.outstandingBalance !== undefined) {
            updateData.outstandingBalance = updates.outstandingBalance;
        }
        if (updates.totalRevenue !== undefined) {
            updateData.totalRevenue = updates.totalRevenue;
        }
        if (updates.totalRoutes !== undefined) {
            updateData.totalRoutes = updates.totalRoutes;
        }

        await updateDoc(clientRef, updateData);
    } catch (error) {
        console.error('Error updating client financials:', error);
        throw new Error('Failed to update client financials');
    }
};

/**
 * Increment client route count
 */
export const incrementClientRouteCount = async (clientId: string): Promise<void> => {
    try {
        const client = await getClientById(clientId);
        if (!client) {
            throw new Error('Client not found');
        }

        const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
        await updateDoc(clientRef, {
            totalRoutes: (client.totalRoutes || 0) + 1,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error incrementing client route count:', error);
        throw new Error('Failed to update client route count');
    }
};

/**
 * Search clients by name or company
 */
export const searchClients = async (
    organizationId: string,
    searchTerm: string
): Promise<Client[]> => {
    try {
        // Note: Firestore doesn't support full-text search natively
        // This is a simple implementation that fetches all clients and filters locally
        // For production, consider using Algolia or ElasticSearch
        const allClients = await getClientsByOrganization(organizationId);

        const searchLower = searchTerm.toLowerCase();
        return allClients.filter(client =>
            client.name.toLowerCase().includes(searchLower) ||
            (client.company && client.company.toLowerCase().includes(searchLower)) ||
            (client.email && client.email.toLowerCase().includes(searchLower))
        );
    } catch (error) {
        console.error('Error searching clients:', error);
        throw new Error('Failed to search clients');
    }
};

/**
 * Get active clients (shorthand for status === 'Active')
 */
export const getActiveClients = async (organizationId: string): Promise<Client[]> => {
    return getClientsByStatus(organizationId, 'Active');
};

/**
 * Get clients with outstanding balances
 */
export const getClientsWithOutstandingBalance = async (organizationId: string): Promise<Client[]> => {
    try {
        const clientsRef = collection(db, CLIENTS_COLLECTION);
        const q = query(
            clientsRef,
            where('organizationId', '==', organizationId),
            where('outstandingBalance', '>', 0),
            orderBy('outstandingBalance', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const clients: Client[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as Client;
        });

        return clients;
    } catch (error) {
        console.error('Error getting clients with outstanding balance:', error);
        throw new Error('Failed to fetch clients with outstanding balance');
    }
};
