/**
 * Notification Service for Firestore
 * Handles both in-app and WhatsApp notifications
 */

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
    limit,
    onSnapshot,
    addDoc
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Notification } from '../../types';
import { whatsAppNotifications, whatsAppService } from '../whatsapp/whatsappService';

const NOTIFICATIONS_COLLECTION = 'notifications';

export interface CreateNotificationData {
    userId: string;
    organizationId: string;
    type: 'order' | 'driver' | 'vehicle' | 'payment' | 'system' | 'route' | 'maintenance';
    title: string;
    message: string;
    icon?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
    sendWhatsApp?: boolean;
    whatsAppPhone?: string;
}

/**
 * Create a new notification
 */
export const createNotification = async (data: CreateNotificationData): Promise<string> => {
    try {
        const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);

        const notification: any = {
            userId: data.userId,
            organizationId: data.organizationId,
            type: data.type,
            title: data.title,
            message: data.message,
            icon: data.icon || getIconForType(data.type),
            metadata: data.metadata || {},
            read: false,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
        };

        // Only add actionUrl if it's provided (Firestore doesn't allow undefined)
        if (data.actionUrl) {
            notification.actionUrl = data.actionUrl;
        }

        const docRef = await addDoc(notificationsRef, notification);

        // Send WhatsApp notification if requested
        if (data.sendWhatsApp && data.whatsAppPhone) {
            await sendWhatsAppNotification(data);
        }

        return docRef.id;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw new Error('Failed to create notification');
    }
};

/**
 * Get notifications for a user
 */
export const getNotificationsByUser = async (
    userId: string,
    limitCount: number = 50
): Promise<Notification[]> => {
    try {
        const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const notifications: Notification[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            notifications.push({
                id: parseInt(doc.id.replace(/\D/g, '').slice(0, 5)) || Math.floor(Math.random() * 10000),
                ...data,
                timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp,
                date: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toLocaleDateString() : '',
                time: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toLocaleTimeString() : '',
            } as Notification);
        });

        return notifications;
    } catch (error) {
        console.error('Error getting notifications:', error);
        throw new Error('Failed to fetch notifications');
    }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    try {
        const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(notificationRef, {
            read: true,
            readAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw new Error('Failed to mark notification as read');
    }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    try {
        const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const querySnapshot = await getDocs(q);

        const updates = querySnapshot.docs.map(doc =>
            updateDoc(doc.ref, { read: true, readAt: serverTimestamp() })
        );

        await Promise.all(updates);
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw new Error('Failed to mark all notifications as read');
    }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
        const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await deleteDoc(notificationRef);
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw new Error('Failed to delete notification');
    }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
    try {
        const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

/**
 * Subscribe to real-time notifications for a user
 */
export const subscribeToNotifications = (
    userId: string,
    callback: (notifications: Notification[]) => void
): (() => void) => {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notifications: Notification[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            notifications.push({
                id: parseInt(doc.id.replace(/\D/g, '').slice(0, 5)) || Math.floor(Math.random() * 10000),
                ...data,
                timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp,
                date: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toLocaleDateString() : '',
                time: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toLocaleTimeString() : '',
            } as Notification);
        });

        callback(notifications);
    });

    return unsubscribe;
};

/**
 * Send WhatsApp notification
 */
async function sendWhatsAppNotification(data: CreateNotificationData): Promise<void> {
    if (!data.whatsAppPhone) return;

    try {
        // Format message for WhatsApp
        const message = `🔔 *${data.title}*\n\n${data.message}`;

        // For now, send as text message (requires user interaction in last 24 hours)
        // In production, use approved templates
        await whatsAppService.sendText(data.whatsAppPhone, message);
    } catch (error) {
        console.error('Failed to send WhatsApp notification:', error);
        // Don't throw - WhatsApp failure shouldn't stop in-app notification
    }
}

/**
 * Get icon for notification type
 */
function getIconForType(type: string): string {
    const icons: Record<string, string> = {
        order: '📦',
        driver: '👤',
        vehicle: '🚚',
        payment: '💰',
        system: '⚙️',
        route: '🗺️',
        maintenance: '🔧',
    };
    return icons[type] || '🔔';
}

/**
 * Notification templates for common events
 */
export const notificationTemplates = {
    // New order/shipment created
    newOrder: (orderId: string, customerName: string) => ({
        type: 'order' as const,
        title: `New Order #${orderId}`,
        message: `A new shipment has been created for ${customerName} and is pending assignment.`,
        icon: '📦',
    }),

    // Driver assigned to route
    driverAssigned: (driverName: string, routeId: string) => ({
        type: 'driver' as const,
        title: 'Driver Assigned',
        message: `${driverName} has been assigned to route #${routeId}.`,
        icon: '👤',
    }),

    // Driver onboarded
    driverOnboarded: (driverName: string) => ({
        type: 'driver' as const,
        title: 'Driver Onboarded',
        message: `Driver ${driverName} has completed onboarding.`,
        icon: '👤',
    }),

    // Vehicle maintenance due
    maintenanceDue: (vehicleId: string, dueDate: string) => ({
        type: 'maintenance' as const,
        title: 'Vehicle Maintenance Due',
        message: `Vehicle ${vehicleId} is due for service on ${dueDate}.`,
        icon: '🔧',
    }),

    // Payment received
    paymentReceived: (amount: string, invoiceId: string) => ({
        type: 'payment' as const,
        title: 'Payment Received',
        message: `Payment of ${amount} received for invoice #${invoiceId}.`,
        icon: '💰',
    }),

    // Route completed
    routeCompleted: (routeId: string, driverName: string) => ({
        type: 'route' as const,
        title: 'Route Completed',
        message: `Route #${routeId} has been completed by ${driverName}.`,
        icon: '✅',
    }),

    // System update
    systemUpdate: (message: string) => ({
        type: 'system' as const,
        title: 'System Update',
        message,
        icon: '⚙️',
    }),
};