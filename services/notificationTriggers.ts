/**
 * Notification Triggers
 * Automatically send in-app and WhatsApp notifications for platform events
 */

import { createNotification } from './firestore/notifications';
import { getUserWhatsAppNumber } from './firestore/users';

/**
 * Send notification when driver is assigned to a route
 */
export const notifyDriverAssigned = async (
    userId: string,
    organizationId: string,
    driverName: string,
    routeId: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'route',
            title: 'Driver Assigned',
            message: `${driverName} has been assigned to route ${routeId}`,
            icon: '👤',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending driver assigned notification:', error);
    }
};

/**
 * Send notification when route is completed
 */
export const notifyRouteCompleted = async (
    userId: string,
    organizationId: string,
    routeId: string,
    driverName: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'route',
            title: 'Route Completed',
            message: `Route ${routeId} has been completed by ${driverName}`,
            icon: '✅',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending route completed notification:', error);
    }
};

/**
 * Send notification when new route is created
 */
export const notifyNewRoute = async (
    userId: string,
    organizationId: string,
    routeId: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'route',
            title: 'New Route Created',
            message: `A new route ${routeId} has been created and is pending assignment`,
            icon: '🗺️',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending new route notification:', error);
    }
};

/**
 * Send notification when driver is onboarded
 */
export const notifyDriverOnboarded = async (
    userId: string,
    organizationId: string,
    driverName: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'driver',
            title: 'Driver Onboarded',
            message: `${driverName} has been successfully onboarded to your fleet`,
            icon: '👤',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending driver onboarded notification:', error);
    }
};

/**
 * Send notification when vehicle maintenance is due
 */
export const notifyMaintenanceDue = async (
    userId: string,
    organizationId: string,
    vehicleId: string,
    dueDate: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'maintenance',
            title: 'Maintenance Due',
            message: `Vehicle ${vehicleId} is due for maintenance on ${dueDate}`,
            icon: '🔧',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending maintenance due notification:', error);
    }
};

/**
 * Send notification when payment is received
 */
export const notifyPaymentReceived = async (
    userId: string,
    organizationId: string,
    amount: string,
    invoiceId: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'payment',
            title: 'Payment Received',
            message: `Payment of ${amount} received for invoice ${invoiceId}`,
            icon: '💰',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending payment received notification:', error);
    }
};

/**
 * Send notification when expense is added to route
 */
export const notifyExpenseAdded = async (
    userId: string,
    organizationId: string,
    routeId: string,
    amount: number,
    type: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'route',
            title: 'Expense Added',
            message: `₦${amount.toLocaleString()} ${type} expense added to route ${routeId}`,
            icon: '💸',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending expense added notification:', error);
    }
};

/**
 * Send notification when new vehicle is added
 */
export const notifyVehicleAdded = async (
    userId: string,
    organizationId: string,
    plateNumber: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'vehicle',
            title: 'New Vehicle Added',
            message: `Vehicle ${plateNumber} has been added to your fleet`,
            icon: '🚚',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending vehicle added notification:', error);
    }
};

/**
 * Send notification when new client is added
 */
export const notifyClientAdded = async (
    userId: string,
    organizationId: string,
    clientName: string
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'system',
            title: 'New Client Added',
            message: `${clientName} has been added to your client list`,
            icon: '👥',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending client added notification:', error);
    }
};

/**
 * Send notification when payroll is generated
 */
export const notifyPayrollGenerated = async (
    userId: string,
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    driverCount: number
): Promise<void> => {
    try {
        const whatsappNumber = await getUserWhatsAppNumber(userId);

        await createNotification({
            userId,
            organizationId,
            type: 'payment',
            title: 'Payroll Generated',
            message: `Payroll for ${periodStart} to ${periodEnd} has been generated for ${driverCount} drivers`,
            icon: '💰',
            sendWhatsApp: !!whatsappNumber,
            whatsAppPhone: whatsappNumber || undefined,
        });
    } catch (error) {
        console.error('Error sending payroll generated notification:', error);
    }
};
