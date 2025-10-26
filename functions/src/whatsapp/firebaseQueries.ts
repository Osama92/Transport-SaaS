import * as admin from 'firebase-admin';

/**
 * Firebase Query Functions for OpenAI Function Calling
 * These functions allow the AI to access real data from the database
 */

export class FirebaseQueries {
    private db: admin.firestore.Firestore;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
    }

    /**
     * Get routes with optional filters
     */
    async getRoutes(params: {
        organizationId: string;
        status?: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
        limit?: number;
        startDate?: string;
        endDate?: string;
    }): Promise<any[]> {
        try {
            console.log('[FIRESTORE QUERY] Getting routes for org:', params.organizationId);
            console.log('[FIRESTORE QUERY] Filters:', { status: params.status, limit: params.limit });

            let query: any = this.db.collection('routes')
                .where('organizationId', '==', params.organizationId);

            if (params.status) {
                query = query.where('status', '==', params.status);
            }

            // Note: Can't do range queries on createdAt with other where clauses without composite index
            // So we'll fetch all and filter in memory if needed
            query = query.limit(params.limit || 50);

            const snapshot = await query.get();
            console.log('[FIRESTORE QUERY] Found', snapshot.docs.length, 'routes');

            let routes = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by createdAt in memory (descending - newest first)
            routes.sort((a: any, b: any) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            return routes;
        } catch (error) {
            console.error('[FIRESTORE QUERY] ❌ Error getting routes:', error);
            return [];
        }
    }

    /**
     * Get drivers with optional filters
     * Status: 'On-route' | 'Idle' | 'Offline' | 'Active' | 'Inactive'
     */
    async getDrivers(params: {
        organizationId: string;
        status?: 'On-route' | 'Idle' | 'Offline' | 'Active' | 'Inactive';
        limit?: number;
    }): Promise<any[]> {
        try {
            console.log('[FIRESTORE QUERY] Getting drivers for org:', params.organizationId);
            console.log('[FIRESTORE QUERY] Filters:', { status: params.status, limit: params.limit });

            let query: any = this.db.collection('drivers')
                .where('organizationId', '==', params.organizationId);

            if (params.status) {
                query = query.where('status', '==', params.status);
            }

            query = query.limit(params.limit || 50);

            const snapshot = await query.get();
            console.log('[FIRESTORE QUERY] Found', snapshot.docs.length, 'drivers');

            return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('[FIRESTORE QUERY] ❌ Error getting drivers:', error);
            return [];
        }
    }

    /**
     * Get vehicles with optional filters
     * Status: 'On the Move' | 'Parked' | 'Idle' | 'Inactive' | 'In-Shop'
     */
    async getVehicles(params: {
        organizationId: string;
        status?: 'On the Move' | 'Parked' | 'Idle' | 'Inactive' | 'In-Shop';
        limit?: number;
    }): Promise<any[]> {
        try {
            console.log('[FIRESTORE QUERY] Getting vehicles for org:', params.organizationId);
            console.log('[FIRESTORE QUERY] Filters:', { status: params.status, limit: params.limit });

            let query: any = this.db.collection('vehicles')
                .where('organizationId', '==', params.organizationId);

            if (params.status) {
                query = query.where('status', '==', params.status);
            }

            query = query.limit(params.limit || 50);

            const snapshot = await query.get();
            console.log('[FIRESTORE QUERY] Found', snapshot.docs.length, 'vehicles');

            return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('[FIRESTORE QUERY] ❌ Error getting vehicles:', error);
            return [];
        }
    }

    /**
     * Get invoices with optional filters
     */
    async getInvoices(params: {
        organizationId: string;
        status?: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
        limit?: number;
        minAmount?: number;
        startDate?: string;
        endDate?: string;
    }): Promise<any[]> {
        try {
            console.log('[FIRESTORE QUERY] Getting invoices for org:', params.organizationId);
            console.log('[FIRESTORE QUERY] Filters:', { status: params.status, limit: params.limit });

            // First, try to get ALL invoices without organizationId filter to see what's in the database
            const allInvoicesSnapshot = await this.db.collection('invoices').limit(10).get();
            console.log('[FIRESTORE QUERY] Total invoices in database (sample of 10):', allInvoicesSnapshot.docs.length);
            if (allInvoicesSnapshot.docs.length > 0) {
                allInvoicesSnapshot.docs.forEach((doc: any) => {
                    const data = doc.data();
                    console.log('[FIRESTORE QUERY] Invoice sample:', {
                        id: doc.id,
                        organizationId: data.organizationId,
                        invoiceNumber: data.invoiceNumber,
                        clientName: data.clientName
                    });
                });
            }

            let query: any = this.db.collection('invoices')
                .where('organizationId', '==', params.organizationId);

            if (params.status) {
                query = query.where('status', '==', params.status);
            }

            // Note: Cannot use date filters with other where clauses without composite index
            // We'll fetch all and filter in memory if needed
            query = query.limit(params.limit || 50);

            const snapshot = await query.get();
            console.log('[FIRESTORE QUERY] Found', snapshot.docs.length, 'invoices matching organizationId:', params.organizationId);

            let invoices = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by createdAt in memory (descending - newest first)
            invoices.sort((a: any, b: any) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            // Filter by amount if specified (can't do compound queries without index)
            if (params.minAmount !== undefined) {
                invoices = invoices.filter((inv: any) => (inv.total || 0) >= (params.minAmount || 0));
            }

            // Filter by date range if specified
            if (params.startDate || params.endDate) {
                invoices = invoices.filter((inv: any) => {
                    const invDate = inv.issuedDate || inv.createdAt?.toDate?.()?.toISOString().split('T')[0];
                    if (!invDate) return false;

                    if (params.startDate && invDate < params.startDate) return false;
                    if (params.endDate && invDate > params.endDate) return false;

                    return true;
                });
            }

            return invoices;
        } catch (error) {
            console.error('[FIRESTORE QUERY] ❌ Error getting invoices:', error);
            return [];
        }
    }

    /**
     * Get clients with optional filters
     */
    async getClients(params: {
        organizationId: string;
        limit?: number;
    }): Promise<any[]> {
        try {
            const query = this.db.collection('clients')
                .where('organizationId', '==', params.organizationId)
                .limit(params.limit || 50);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting clients:', error);
            return [];
        }
    }

    /**
     * Get expenses with optional filters
     */
    async getExpenses(params: {
        organizationId: string;
        category?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<any[]> {
        try {
            let query = this.db.collection('expenses')
                .where('organizationId', '==', params.organizationId);

            if (params.category) {
                query = query.where('category', '==', params.category);
            }

            if (params.startDate) {
                query = query.where('date', '>=', params.startDate);
            }

            if (params.endDate) {
                query = query.where('date', '<=', params.endDate);
            }

            query = query.orderBy('date', 'desc').limit(params.limit || 100);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting expenses:', error);
            return [];
        }
    }

    /**
     * Get notifications for user
     */
    async getNotifications(params: {
        userId: string;
        unreadOnly?: boolean;
        limit?: number;
    }): Promise<any[]> {
        try {
            let query = this.db.collection('notifications')
                .where('userId', '==', params.userId);

            if (params.unreadOnly) {
                query = query.where('read', '==', false);
            }

            query = query.orderBy('createdAt', 'desc').limit(params.limit || 20);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    /**
     * Get user's wallet balance from Paystack virtual account
     */
    async getWalletBalance(userId: string): Promise<number> {
        try {
            // First try to get organization ID from whatsapp_users
            const whatsappUsersSnapshot = await this.db.collection('whatsapp_users')
                .where('userId', '==', userId)
                .limit(1)
                .get();

            if (!whatsappUsersSnapshot.empty) {
                const whatsappUser = whatsappUsersSnapshot.docs[0].data();
                const organizationId = whatsappUser.organizationId;

                console.log('[WALLET BALANCE] User ID:', userId);
                console.log('[WALLET BALANCE] Organization ID:', organizationId);

                // CRITICAL: Get balance from Paystack virtual_accounts collection
                // This is the REAL balance from Paystack, not mock data
                const virtualAccountSnapshot = await this.db.collection('virtual_accounts')
                    .where('organizationId', '==', organizationId)
                    .limit(1)
                    .get();

                if (!virtualAccountSnapshot.empty) {
                    const virtualAccount = virtualAccountSnapshot.docs[0].data();
                    const balance = virtualAccount?.balance || 0;

                    console.log('[WALLET BALANCE] ✅ Found Paystack virtual account');
                    console.log('[WALLET BALANCE] Balance:', balance);
                    console.log('[WALLET BALANCE] Account Number:', virtualAccount?.accountNumber);
                    console.log('[WALLET BALANCE] Bank:', virtualAccount?.bankName);

                    return balance;
                }

                console.log('[WALLET BALANCE] ⚠️ No Paystack virtual account found for org:', organizationId);

                // Fallback: Check organizations collection for manual balance
                const orgDoc = await this.db.collection('organizations').doc(organizationId).get();
                if (orgDoc.exists) {
                    const orgData = orgDoc.data();
                    const balance = orgData?.walletBalance ||
                                   orgData?.wallet?.balance ||
                                   orgData?.balance ||
                                   0;

                    console.log('[WALLET BALANCE] Using organization fallback balance:', balance);
                    return balance;
                }
            }

            // Fallback to user wallet (old logic)
            const walletDoc = await this.db.collection('wallets').doc(userId).get();
            if (walletDoc.exists) {
                const data = walletDoc.data();
                return data?.balance || 0;
            }
            return 0;
        } catch (error) {
            console.error('Error getting wallet balance:', error);
            return 0;
        }
    }

    /**
     * Get recent wallet transactions
     */
    async getWalletTransactions(params: {
        userId: string;
        limit?: number;
        type?: 'credit' | 'debit';
    }): Promise<any[]> {
        try {
            let query = this.db.collection('wallet_transactions')
                .where('userId', '==', params.userId);

            if (params.type) {
                query = query.where('type', '==', params.type);
            }

            query = query.orderBy('createdAt', 'desc').limit(params.limit || 20);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting wallet transactions:', error);
            return [];
        }
    }
}
