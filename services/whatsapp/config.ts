/**
 * WhatsApp Business API Configuration
 *
 * Cost-Effective Options:
 * 1. Ultra.io - $0.005 per message (Nigeria)
 * 2. Twilio - $0.005-0.024 per message
 * 3. WhatsApp Cloud API (Meta) - Free tier: 1000 conversations/month
 *
 * We'll use WhatsApp Cloud API (FREE for 1000 conversations/month)
 */

export const WHATSAPP_CONFIG = {
    // WhatsApp Cloud API (Meta) - Most cost-effective
    provider: 'meta', // 'meta' | 'twilio' | 'ultra'

    // Meta WhatsApp Cloud API Settings
    meta: {
        accessToken: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '',
        phoneNumberId: import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '',
        businessAccountId: import.meta.env.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        apiVersion: 'v18.0',
        apiUrl: 'https://graph.facebook.com',
        webhookVerifyToken: import.meta.env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'transport_saas_verify_2024',
    },

    // Twilio Settings (Alternative)
    twilio: {
        accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
        authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
        fromNumber: import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886', // Twilio Sandbox
    },

    // Ultra.io Settings (Alternative for Africa)
    ultra: {
        apiKey: import.meta.env.VITE_ULTRA_API_KEY || '',
        apiUrl: 'https://api.ultra.io/v1',
        senderId: import.meta.env.VITE_ULTRA_SENDER_ID || '',
    },

    // Message Templates
    templates: {
        // These need to be approved by WhatsApp
        orderCreated: {
            name: 'order_created',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Order ID
                        { type: 'text', text: '{{2}}' }, // Customer Name
                        { type: 'text', text: '{{3}}' }, // Pickup Location
                        { type: 'text', text: '{{4}}' }, // Delivery Location
                    ]
                }
            ]
        },
        driverAssigned: {
            name: 'driver_assigned',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Driver Name
                        { type: 'text', text: '{{2}}' }, // Driver Phone
                        { type: 'text', text: '{{3}}' }, // Vehicle Number
                        { type: 'text', text: '{{4}}' }, // ETA
                    ]
                }
            ]
        },
        deliveryCompleted: {
            name: 'delivery_completed',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Order ID
                        { type: 'text', text: '{{2}}' }, // Delivery Time
                        { type: 'text', text: '{{3}}' }, // Rating Link
                    ]
                }
            ]
        },
        paymentReminder: {
            name: 'payment_reminder',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Invoice Number
                        { type: 'text', text: '{{2}}' }, // Amount
                        { type: 'text', text: '{{3}}' }, // Due Date
                    ]
                }
            ]
        },
        // Driver Templates
        routeAssigned: {
            name: 'route_assigned',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Route ID
                        { type: 'text', text: '{{2}}' }, // Origin
                        { type: 'text', text: '{{3}}' }, // Destination
                        { type: 'text', text: '{{4}}' }, // Pickup Time
                    ]
                }
            ]
        },
        routeCompleted: {
            name: 'route_completed',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Route ID
                        { type: 'text', text: '{{2}}' }, // Earnings
                        { type: 'text', text: '{{3}}' }, // Completion Time
                    ]
                }
            ]
        },
        paymentReceived: {
            name: 'payment_received',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Amount
                        { type: 'text', text: '{{2}}' }, // New Balance
                        { type: 'text', text: '{{3}}' }, // Payment Date
                    ]
                }
            ]
        },
        maintenanceDue: {
            name: 'maintenance_due',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Vehicle Plate
                        { type: 'text', text: '{{2}}' }, // Maintenance Type
                        { type: 'text', text: '{{3}}' }, // Due Date
                    ]
                }
            ]
        },
        driverCredentials: {
            name: 'driver_credentials',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Driver Name
                        { type: 'text', text: '{{2}}' }, // Username
                        { type: 'text', text: '{{3}}' }, // Password
                        { type: 'text', text: '{{4}}' }, // Login URL
                    ]
                }
            ]
        },
        emergencyAlert: {
            name: 'emergency_alert',
            language: 'en',
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '{{1}}' }, // Alert Message
                        { type: 'text', text: '{{2}}' }, // Contact Number
                    ]
                }
            ]
        }
    },

    // Rate Limiting
    rateLimits: {
        messagesPerMinute: 80, // WhatsApp limit
        messagesPerDay: 1000, // Free tier limit
    }
};

// Pricing Information
export const WHATSAPP_PRICING = {
    meta: {
        name: 'WhatsApp Cloud API (Meta)',
        free: {
            conversations: 1000, // per month
            description: 'Free for first 1000 user-initiated conversations/month'
        },
        paid: {
            userInitiated: 0.005, // USD per conversation (Nigeria)
            businessInitiated: 0.024, // USD per conversation (Nigeria)
        }
    },
    twilio: {
        name: 'Twilio WhatsApp',
        pricing: {
            perMessage: 0.005, // USD (receive)
            perMessageSent: 0.024, // USD (send to Nigeria)
        }
    },
    ultra: {
        name: 'Ultra.io',
        pricing: {
            perMessage: 0.005, // USD (Nigeria)
            bulk: 0.003, // USD for 10000+ messages
        }
    }
};