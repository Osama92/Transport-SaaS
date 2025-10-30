/**
 * Amana Context Manager
 * Enriches conversations with user history, business metrics, and smart suggestions
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * User Context - Complete picture of the user's business
 */
export interface UserContext {
  whatsappNumber: string;
  organizationId: string;
  userProfile?: {
    name: string;
    email?: string;
    language: 'en' | 'ha' | 'ig' | 'yo';
    timezone: string;
  };

  // Recent activity (last 10 actions)
  recentActivity: Array<{
    action: string;
    timestamp: string;
    intent?: string;
    entity?: {
      type: 'invoice' | 'client' | 'route' | 'driver' | 'expense';
      id: string;
      name?: string;
      email?: string;
      phone?: string;
    };
  }>;

  // Common entities (for smart suggestions)
  commonEntities: {
    clients: string[];        // Top 5 most used client names
    routes: string[];         // Top 5 most used routes
    drivers: string[];        // Top 5 most mentioned drivers
  };

  // Business metrics (for proactive insights)
  businessMetrics?: {
    totalInvoices: number;
    unpaidInvoices: number;
    overdueInvoices: number;
    totalRevenue: number;
    walletBalance: number;
    activeRoutes: number;
    activeDrivers: number;
  };

  // User patterns (for personalization)
  userPatterns: {
    mostUsedFeatures: string[];   // Top 3 most used intents
    averageInvoiceAmount?: number;
    preferredInvoiceTemplate?: 'classic' | 'modern' | 'minimal' | 'professional';
    peakUsageHours: number[];     // Hours when user is most active (0-23)
  };

  // Conversation memory
  conversationMemory?: {
    lastInvoiceNumber?: string;
    lastClientName?: string;
    lastDriverId?: string;
    lastRouteId?: string;
  };
}

/**
 * Get enriched user context from Firestore
 * This is called before every AI decision to provide maximum context
 */
export async function getUserContext(
  whatsappNumber: string,
  organizationId: string
): Promise<UserContext> {
  try {
    functions.logger.info('Fetching user context', { whatsappNumber, organizationId });

    // Initialize context
    const context: UserContext = {
      whatsappNumber,
      organizationId,
      recentActivity: [],
      commonEntities: {
        clients: [],
        routes: [],
        drivers: []
      },
      userPatterns: {
        mostUsedFeatures: [],
        peakUsageHours: []
      }
    };

    // Fetch user profile
    const userProfile = await getUserProfile(whatsappNumber, organizationId);
    if (userProfile) {
      context.userProfile = userProfile;
    }

    // Fetch recent activity (last 10 actions)
    const recentActivity = await getRecentActivity(whatsappNumber, organizationId);
    context.recentActivity = recentActivity;

    // Fetch common entities (for smart suggestions)
    const commonEntities = await getCommonEntities(organizationId, recentActivity);
    context.commonEntities = commonEntities;

    // Fetch business metrics (for proactive insights)
    const businessMetrics = await getBusinessMetrics(organizationId);
    context.businessMetrics = businessMetrics;

    // Analyze user patterns
    const userPatterns = analyzeUserPatterns(recentActivity);
    context.userPatterns = userPatterns;

    // Get conversation memory
    const conversationMemory = await getConversationMemory(whatsappNumber);
    context.conversationMemory = conversationMemory;

    functions.logger.info('User context enriched', {
      recentActions: context.recentActivity.length,
      commonClients: context.commonEntities.clients.length,
      overdueInvoices: context.businessMetrics?.overdueInvoices || 0
    });

    return context;

  } catch (error: any) {
    functions.logger.error('Error fetching user context', {
      error: error.message,
      stack: error.stack
    });

    // Return minimal context on error
    return {
      whatsappNumber,
      organizationId,
      recentActivity: [],
      commonEntities: {
        clients: [],
        routes: [],
        drivers: []
      },
      userPatterns: {
        mostUsedFeatures: [],
        peakUsageHours: []
      }
    };
  }
}

/**
 * Get user profile from Firestore
 */
async function getUserProfile(
  whatsappNumber: string,
  organizationId: string
): Promise<UserContext['userProfile'] | null> {
  try {
    // Try to find user by WhatsApp number
    const whatsappUsersRef = db.collection('whatsapp_users');
    const userQuery = await whatsappUsersRef
      .where('whatsappNumber', '==', whatsappNumber)
      .where('organizationId', '==', organizationId)
      .limit(1)
      .get();

    if (!userQuery.empty) {
      const userData = userQuery.docs[0].data();
      return {
        name: userData.name || 'User',
        email: userData.email,
        language: userData.language || 'en',
        timezone: userData.timezone || 'Africa/Lagos'
      };
    }

    return null;
  } catch (error: any) {
    functions.logger.error('Error fetching user profile', { error: error.message });
    return null;
  }
}

/**
 * Get recent activity from conversation history
 */
async function getRecentActivity(
  whatsappNumber: string,
  organizationId: string
): Promise<UserContext['recentActivity']> {
  try {
    const conversationRef = db.collection('whatsappConversations').doc(whatsappNumber);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      return [];
    }

    const data = conversationDoc.data();
    const history = data?.conversationHistory || [];

    // Get last 10 assistant messages (representing completed actions)
    const recentActions = history
      .filter((msg: any) => msg.role === 'assistant' && msg.intent)
      .slice(-10)
      .map((msg: any) => ({
        action: msg.intent.replace(/_/g, ' '),
        timestamp: msg.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        intent: msg.intent,
        entity: msg.entity // May contain client/route/driver info
      }));

    return recentActions;
  } catch (error: any) {
    functions.logger.error('Error fetching recent activity', { error: error.message });
    return [];
  }
}

/**
 * Get common entities (clients, routes, drivers) for smart suggestions
 */
async function getCommonEntities(
  organizationId: string,
  recentActivity: UserContext['recentActivity']
): Promise<UserContext['commonEntities']> {
  try {
    const entities: UserContext['commonEntities'] = {
      clients: [],
      routes: [],
      drivers: []
    };

    // Get top 5 clients from recent activity
    const clientNames = recentActivity
      .filter(a => a.entity?.type === 'client')
      .map(a => a.entity?.name || '')
      .filter(name => name !== '');

    entities.clients = [...new Set(clientNames)].slice(0, 5);

    // If not enough from recent activity, fetch from Firestore
    if (entities.clients.length < 3) {
      const clientsSnapshot = await db.collection('clients')
        .where('organizationId', '==', organizationId)
        .orderBy('updatedAt', 'desc')
        .limit(5)
        .get();

      const firestoreClients = clientsSnapshot.docs.map(doc => doc.data().name);
      entities.clients = [...new Set([...entities.clients, ...firestoreClients])].slice(0, 5);
    }

    // Get top 5 drivers
    const driversSnapshot = await db.collection('drivers')
      .where('organizationId', '==', organizationId)
      .where('status', '==', 'Active')
      .orderBy('name')
      .limit(5)
      .get();

    entities.drivers = driversSnapshot.docs.map(doc => doc.data().name);

    // Get top 5 routes
    const routesSnapshot = await db.collection('routes')
      .where('organizationId', '==', organizationId)
      .where('status', 'in', ['In Progress', 'Pending'])
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    entities.routes = routesSnapshot.docs.map(doc => {
      const data = doc.data();
      return `${data.origin} → ${data.destination}`;
    });

    return entities;

  } catch (error: any) {
    functions.logger.error('Error fetching common entities', { error: error.message });
    return {
      clients: [],
      routes: [],
      drivers: []
    };
  }
}

/**
 * Get business metrics for proactive insights
 */
async function getBusinessMetrics(
  organizationId: string
): Promise<UserContext['businessMetrics'] | undefined> {
  try {
    const metrics: UserContext['businessMetrics'] = {
      totalInvoices: 0,
      unpaidInvoices: 0,
      overdueInvoices: 0,
      totalRevenue: 0,
      walletBalance: 0,
      activeRoutes: 0,
      activeDrivers: 0
    };

    // Get invoice metrics
    const invoicesSnapshot = await db.collection('invoices')
      .where('organizationId', '==', organizationId)
      .get();

    metrics.totalInvoices = invoicesSnapshot.size;

    const now = new Date();
    invoicesSnapshot.docs.forEach(doc => {
      const invoice = doc.data();

      if (invoice.status === 'Paid') {
        metrics.totalRevenue += invoice.totalAmount || 0;
      } else if (invoice.status === 'Sent' || invoice.status === 'Draft') {
        metrics.unpaidInvoices += 1;

        // Check if overdue
        const dueDate = invoice.dueDate?.toDate?.() || new Date(invoice.dueDate);
        if (dueDate < now) {
          metrics.overdueInvoices += 1;
        }
      }
    });

    // Get wallet balance
    const organizationDoc = await db.collection('organizations').doc(organizationId).get();
    if (organizationDoc.exists) {
      metrics.walletBalance = organizationDoc.data()?.walletBalance || 0;
    }

    // Get active routes count
    const activeRoutesSnapshot = await db.collection('routes')
      .where('organizationId', '==', organizationId)
      .where('status', 'in', ['Pending', 'In Progress'])
      .get();

    metrics.activeRoutes = activeRoutesSnapshot.size;

    // Get active drivers count
    const activeDriversSnapshot = await db.collection('drivers')
      .where('organizationId', '==', organizationId)
      .where('status', '==', 'Active')
      .get();

    metrics.activeDrivers = activeDriversSnapshot.size;

    return metrics;

  } catch (error: any) {
    functions.logger.error('Error fetching business metrics', { error: error.message });
    return undefined;
  }
}

/**
 * Analyze user patterns from recent activity
 */
function analyzeUserPatterns(
  recentActivity: UserContext['recentActivity']
): UserContext['userPatterns'] {
  const patterns: UserContext['userPatterns'] = {
    mostUsedFeatures: [],
    peakUsageHours: []
  };

  if (recentActivity.length === 0) {
    return patterns;
  }

  // Count feature usage
  const featureCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};

  recentActivity.forEach(activity => {
    // Count intents
    if (activity.intent) {
      featureCounts[activity.intent] = (featureCounts[activity.intent] || 0) + 1;
    }

    // Count usage hours
    const timestamp = new Date(activity.timestamp);
    const hour = timestamp.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Get top 3 most used features
  patterns.mostUsedFeatures = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([intent]) => intent);

  // Get peak usage hours (hours with most activity)
  patterns.peakUsageHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  return patterns;
}

/**
 * Get conversation memory (last mentioned entities)
 */
async function getConversationMemory(
  whatsappNumber: string
): Promise<UserContext['conversationMemory'] | undefined> {
  try {
    const conversationRef = db.collection('whatsappConversations').doc(whatsappNumber);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      return undefined;
    }

    const data = conversationDoc.data();

    return {
      lastInvoiceNumber: data?.lastInvoiceNumber,
      lastClientName: data?.lastClientName,
      lastDriverId: data?.lastDriverId,
      lastRouteId: data?.lastRouteId
    };

  } catch (error: any) {
    functions.logger.error('Error fetching conversation memory', { error: error.message });
    return undefined;
  }
}

/**
 * Update conversation memory after action
 */
export async function updateConversationMemory(
  whatsappNumber: string,
  updates: Partial<UserContext['conversationMemory']>
): Promise<void> {
  try {
    const conversationRef = db.collection('whatsappConversations').doc(whatsappNumber);

    await conversationRef.set({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    functions.logger.info('Conversation memory updated', { whatsappNumber, updates });

  } catch (error: any) {
    functions.logger.error('Error updating conversation memory', {
      error: error.message,
      whatsappNumber
    });
  }
}

/**
 * Add action to conversation history
 */
export async function addActionToHistory(
  whatsappNumber: string,
  intent: string,
  entity?: UserContext['recentActivity'][0]['entity']
): Promise<void> {
  try {
    const conversationRef = db.collection('whatsappConversations').doc(whatsappNumber);

    const historyEntry = {
      role: 'assistant',
      intent,
      entity,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    await conversationRef.set({
      conversationHistory: admin.firestore.FieldValue.arrayUnion(historyEntry),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    functions.logger.info('Action added to history', { whatsappNumber, intent });

  } catch (error: any) {
    functions.logger.error('Error adding action to history', {
      error: error.message,
      whatsappNumber,
      intent
    });
  }
}
