import * as admin from 'firebase-admin';
import { OpenAIIntegration } from './openaiIntegration';

/**
 * Proactive Notification Engine
 * Runs periodically to check for important business insights and send notifications
 */

export class NotificationEngine {
    private db: admin.firestore.Firestore;
    private openai: OpenAIIntegration;

    constructor(db: admin.firestore.Firestore) {
        this.db = db;
        this.openai = new OpenAIIntegration(db);
    }

    /**
     * Generate and send proactive notifications to all active users
     */
    async sendProactiveNotifications(): Promise<void> {
        try {
            console.log('Starting proactive notification scan...');

            // Get all active WhatsApp users
            const usersSnapshot = await this.db.collection('whatsapp_users')
                .where('active', '==', true)
                .get();

            console.log(`Found ${usersSnapshot.size} active users`);

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const phoneNumber = userData.phoneNumber;

                if (!phoneNumber) continue;

                try {
                    // Check if user wants notifications (check last notification time to avoid spam)
                    const lastNotification = await this.getLastNotificationTime(phoneNumber);
                    const hoursSinceLastNotification = lastNotification ?
                        (Date.now() - lastNotification.getTime()) / (1000 * 60 * 60) : 24;

                    // Only send if it's been at least 6 hours since last notification
                    if (hoursSinceLastNotification < 6) {
                        console.log(`Skipping ${phoneNumber} - notified recently`);
                        continue;
                    }

                    // Generate notifications
                    const notifications = await this.openai.generateProactiveNotifications(phoneNumber);

                    if (notifications.length > 0) {
                        // Send notifications via WhatsApp
                        await this.sendNotifications(phoneNumber, notifications);

                        // Update last notification time
                        await this.updateLastNotificationTime(phoneNumber);

                        console.log(`Sent ${notifications.length} notifications to ${phoneNumber}`);
                    }
                } catch (error) {
                    console.error(`Error processing notifications for ${phoneNumber}:`, error);
                }
            }

            console.log('Proactive notification scan completed');
        } catch (error) {
            console.error('Error in sendProactiveNotifications:', error);
        }
    }

    /**
     * Send daily summary to users
     */
    async sendDailySummary(phoneNumber: string): Promise<void> {
        try {
            // Get organization ID
            const userSnapshot = await this.db.collection('whatsapp_users')
                .where('phoneNumber', '==', phoneNumber)
                .limit(1)
                .get();

            if (userSnapshot.empty) return;

            const userData = userSnapshot.docs[0].data();
            const organizationId = userData.organizationId;

            if (!organizationId) return;

            // Generate comprehensive summary using OpenAI
            const summaryPrompt = `Generate a daily business summary for today. Include:
- Total routes completed today
- Revenue generated today
- Any overdue invoices
- Driver performance highlights
- Fleet utilization
- Key action items for tomorrow

Make it concise, actionable, and data-driven.`;

            const summary = await this.openai.processWithAI(
                phoneNumber,
                summaryPrompt,
                []
            );

            // Send summary
            await this.sendNotifications(phoneNumber, [
                `📊 Daily Business Summary\n\n${summary}`
            ]);

            console.log(`Sent daily summary to ${phoneNumber}`);
        } catch (error) {
            console.error(`Error sending daily summary to ${phoneNumber}:`, error);
        }
    }

    /**
     * Check for critical alerts that need immediate notification
     */
    async checkCriticalAlerts(phoneNumber: string): Promise<string[]> {
        try {
            const userSnapshot = await this.db.collection('whatsapp_users')
                .where('phoneNumber', '==', phoneNumber)
                .limit(1)
                .get();

            if (userSnapshot.empty) return [];

            const userData = userSnapshot.docs[0].data();
            const organizationId = userData.organizationId;

            if (!organizationId) return [];

            const criticalAlerts: string[] = [];

            // Check for routes with delays
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            const routesSnapshot = await this.db.collection('routes')
                .where('organizationId', '==', organizationId)
                .where('status', '==', 'In Progress')
                .where('date', '<=', today)
                .get();

            if (routesSnapshot.size > 0) {
                criticalAlerts.push(
                    `⚠️ ${routesSnapshot.size} route(s) in progress might be delayed. Consider checking their status.`
                );
            }

            // Check for vehicles in maintenance
            const maintenanceSnapshot = await this.db.collection('vehicles')
                .where('organizationId', '==', organizationId)
                .where('status', '==', 'Maintenance')
                .get();

            if (maintenanceSnapshot.size > 3) {
                criticalAlerts.push(
                    `🔧 ${maintenanceSnapshot.size} vehicles are in maintenance. This might affect operations.`
                );
            }

            // Check for very overdue invoices (>30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const overdueSnapshot = await this.db.collection('invoices')
                .where('organizationId', '==', organizationId)
                .where('status', '==', 'Overdue')
                .where('dueDate', '<', thirtyDaysAgo.toISOString().split('T')[0])
                .get();

            if (overdueSnapshot.size > 0) {
                const totalOverdue = overdueSnapshot.docs.reduce((sum, doc) => {
                    return sum + (doc.data().total || 0);
                }, 0);

                criticalAlerts.push(
                    `💰 URGENT: ${overdueSnapshot.size} invoice(s) are >30 days overdue, totaling ₦${totalOverdue.toLocaleString()}. Immediate action recommended.`
                );
            }

            return criticalAlerts;
        } catch (error) {
            console.error('Error checking critical alerts:', error);
            return [];
        }
    }

    /**
     * Send notifications via WhatsApp
     */
    private async sendNotifications(phoneNumber: string, notifications: string[]): Promise<void> {
        try {
            const { sendWhatsAppMessage } = await import('./webhook');
            const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

            const message = notifications.join('\n\n');

            await sendWhatsAppMessage(phoneNumber, phoneNumberId, {
                type: 'text',
                text: message
            });

            // Save to notifications collection
            await this.db.collection('notifications').add({
                phoneNumber,
                message,
                type: 'proactive',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                read: false
            });
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    }

    /**
     * Get last notification time for user
     */
    private async getLastNotificationTime(phoneNumber: string): Promise<Date | null> {
        try {
            const snapshot = await this.db.collection('notification_settings')
                .doc(phoneNumber)
                .get();

            if (snapshot.exists) {
                const data = snapshot.data();
                return data?.lastNotificationTime?.toDate() || null;
            }

            return null;
        } catch (error) {
            console.error('Error getting last notification time:', error);
            return null;
        }
    }

    /**
     * Update last notification time for user
     */
    private async updateLastNotificationTime(phoneNumber: string): Promise<void> {
        try {
            await this.db.collection('notification_settings').doc(phoneNumber).set({
                lastNotificationTime: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating last notification time:', error);
        }
    }
}
