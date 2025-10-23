/**
 * WhatsApp Business API Service
 * Using WhatsApp Cloud API (Meta) - FREE for 1000 conversations/month
 */

import { WHATSAPP_CONFIG } from './config';

export interface WhatsAppMessage {
    to: string; // Phone number in international format (e.g., "2348012345678")
    type: 'text' | 'template' | 'image' | 'document' | 'location';
    content: {
        text?: string;
        templateName?: string;
        templateParams?: string[];
        imageUrl?: string;
        documentUrl?: string;
        location?: {
            latitude: number;
            longitude: number;
            name?: string;
            address?: string;
        };
    };
}

export interface WhatsAppResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}

class WhatsAppService {
    private config = WHATSAPP_CONFIG.meta;
    private messageQueue: WhatsAppMessage[] = [];
    private isProcessing = false;

    /**
     * Send a WhatsApp message
     */
    async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
        try {
            // Validate phone number
            const formattedPhone = this.formatPhoneNumber(message.to);
            if (!formattedPhone) {
                throw new Error('Invalid phone number');
            }

            // Check if WhatsApp is configured
            if (!this.config.accessToken || !this.config.phoneNumberId) {
                console.warn('WhatsApp not configured. Add VITE_WHATSAPP_ACCESS_TOKEN and VITE_WHATSAPP_PHONE_NUMBER_ID to .env');
                return { success: false, error: 'WhatsApp not configured' };
            }

            const url = `${this.config.apiUrl}/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;

            let body: any = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: message.type,
            };

            // Build message body based on type
            switch (message.type) {
                case 'text':
                    body.text = { body: message.content.text };
                    break;

                case 'template':
                    body.type = 'template';
                    body.template = {
                        name: message.content.templateName,
                        language: { code: 'en' },
                        components: message.content.templateParams ? [
                            {
                                type: 'body',
                                parameters: message.content.templateParams.map(param => ({
                                    type: 'text',
                                    text: param
                                }))
                            }
                        ] : []
                    };
                    break;

                case 'image':
                    body.image = { link: message.content.imageUrl };
                    break;

                case 'document':
                    body.document = { link: message.content.documentUrl };
                    break;

                case 'location':
                    body.location = message.content.location;
                    break;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error?.message || 'Failed to send WhatsApp message';
                console.error('WhatsApp API Error:', {
                    status: response.status,
                    error: data.error,
                    phoneNumberId: this.config.phoneNumberId,
                    to: formattedPhone
                });
                throw new Error(`WhatsApp API Error (${response.status}): ${errorMsg}`);
            }

            return {
                success: true,
                messageId: data.messages?.[0]?.id
            };

        } catch (error: any) {
            console.error('WhatsApp send error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send message'
            };
        }
    }

    /**
     * Send a template message (pre-approved by WhatsApp)
     */
    async sendTemplate(
        to: string,
        templateName: string,
        params?: string[]
    ): Promise<WhatsAppResponse> {
        return this.sendMessage({
            to,
            type: 'template',
            content: {
                templateName,
                templateParams: params
            }
        });
    }

    /**
     * Send a text message (requires user to message first in last 24 hours)
     */
    async sendText(to: string, text: string): Promise<WhatsAppResponse> {
        return this.sendMessage({
            to,
            type: 'text',
            content: { text }
        });
    }

    /**
     * Send location (for driver tracking)
     */
    async sendLocation(
        to: string,
        latitude: number,
        longitude: number,
        name?: string,
        address?: string
    ): Promise<WhatsAppResponse> {
        return this.sendMessage({
            to,
            type: 'location',
            content: {
                location: { latitude, longitude, name, address }
            }
        });
    }

    /**
     * Format phone number to international format
     */
    private formatPhoneNumber(phone: string): string {
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');

        // Handle Nigerian numbers
        if (cleaned.startsWith('0') && cleaned.length === 11) {
            // Nigerian local format (0801234567) -> 234801234567
            cleaned = '234' + cleaned.substring(1);
        } else if (cleaned.startsWith('234') && cleaned.length === 13) {
            // Already in international format
            return cleaned;
        } else if (cleaned.length === 10) {
            // Assume Nigerian number without leading 0
            cleaned = '234' + cleaned;
        }

        // Validate final format
        if (!/^234\d{10}$/.test(cleaned)) {
            console.error('Invalid Nigerian phone number:', phone);
            return '';
        }

        return cleaned;
    }

    /**
     * Bulk send messages with rate limiting
     */
    async sendBulk(messages: WhatsAppMessage[]): Promise<WhatsAppResponse[]> {
        const results: WhatsAppResponse[] = [];
        const batchSize = 10; // Send 10 messages at a time
        const delayBetweenBatches = 1000; // 1 second delay

        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(msg => this.sendMessage(msg))
            );

            results.push(...batchResults);

            // Rate limiting
            if (i + batchSize < messages.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }

        return results;
    }

    /**
     * Queue a message for later sending (for rate limiting)
     */
    queueMessage(message: WhatsAppMessage): void {
        this.messageQueue.push(message);
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Process queued messages with rate limiting
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                await this.sendMessage(message);
                // Rate limit: 80 messages per minute = 750ms between messages
                await new Promise(resolve => setTimeout(resolve, 750));
            }
        }

        this.isProcessing = false;
    }
}

// Export singleton instance
export const whatsAppService = new WhatsAppService();

// Notification helpers for common scenarios
export const whatsAppNotifications = {
    /**
     * Notify about new order/shipment
     */
    async notifyNewOrder(
        customerPhone: string,
        orderId: string,
        customerName: string,
        pickup: string,
        delivery: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            customerPhone,
            'order_created',
            [orderId, customerName, pickup, delivery]
        );
    },

    /**
     * Notify driver assignment
     */
    async notifyDriverAssigned(
        customerPhone: string,
        driverName: string,
        driverPhone: string,
        vehicleNumber: string,
        eta: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            customerPhone,
            'driver_assigned',
            [driverName, driverPhone, vehicleNumber, eta]
        );
    },

    /**
     * Notify delivery completion
     */
    async notifyDeliveryComplete(
        customerPhone: string,
        orderId: string,
        deliveryTime: string,
        ratingLink: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            customerPhone,
            'delivery_completed',
            [orderId, deliveryTime, ratingLink]
        );
    },

    /**
     * Send payment reminder
     */
    async sendPaymentReminder(
        customerPhone: string,
        invoiceNumber: string,
        amount: string,
        dueDate: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            customerPhone,
            'payment_reminder',
            [invoiceNumber, amount, dueDate]
        );
    },

    /**
     * Send driver location to customer
     */
    async sendDriverLocation(
        customerPhone: string,
        driverName: string,
        latitude: number,
        longitude: number
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendLocation(
            customerPhone,
            latitude,
            longitude,
            `${driverName}'s Current Location`,
            'Track your delivery driver'
        );
    },

    /**
     * ========== DRIVER NOTIFICATIONS ==========
     */

    /**
     * Notify driver about new route assignment
     * Template: "Hello! Driver {{1}} has been assigned to route {{2}}."
     */
    async notifyDriverRouteAssigned(
        driverPhone: string,
        driverName: string,
        routeId: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            driverPhone,
            'driver_assigned',
            [driverName, routeId]
        );
    },

    /**
     * Notify driver about route completion
     */
    async notifyDriverRouteCompleted(
        driverPhone: string,
        routeId: string,
        earnings: string,
        completionTime: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            driverPhone,
            'route_completed',
            [routeId, earnings, completionTime]
        );
    },

    /**
     * Notify driver about wallet credit
     */
    async notifyDriverPaymentReceived(
        driverPhone: string,
        amount: string,
        balance: string,
        paymentDate: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            driverPhone,
            'payment_received',
            [amount, balance, paymentDate]
        );
    },

    /**
     * Notify driver about vehicle maintenance due
     */
    async notifyDriverMaintenanceDue(
        driverPhone: string,
        vehiclePlate: string,
        maintenanceType: string,
        dueDate: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            driverPhone,
            'maintenance_due',
            [vehiclePlate, maintenanceType, dueDate]
        );
    },

    /**
     * Send driver credentials (username/password)
     */
    async sendDriverCredentials(
        driverPhone: string,
        driverName: string,
        username: string,
        password: string,
        loginUrl: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            driverPhone,
            'driver_credentials',
            [driverName, username, password, loginUrl]
        );
    },

    /**
     * Send emergency alert to driver
     */
    async sendDriverEmergencyAlert(
        driverPhone: string,
        alertMessage: string,
        contactNumber: string
    ): Promise<WhatsAppResponse> {
        return whatsAppService.sendTemplate(
            driverPhone,
            'emergency_alert',
            [alertMessage, contactNumber]
        );
    }
};