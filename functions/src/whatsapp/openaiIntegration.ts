import OpenAI from 'openai';
import * as admin from 'firebase-admin';
import { FirebaseQueries } from './firebaseQueries';
import { AnalyticsEngine } from './analyticsEngine';

/**
 * OpenAI Integration with Function Calling
 * This enables the AI to query Firebase database and generate intelligent insights
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export class OpenAIIntegration {
    private openai: OpenAI;
    private queries: FirebaseQueries;
    private analytics: AnalyticsEngine;
    private db: admin.firestore.Firestore;

    constructor(db: admin.firestore.Firestore) {
        this.openai = new OpenAI({
            apiKey: OPENAI_API_KEY
        });
        this.db = db;
        this.queries = new FirebaseQueries(db);
        this.analytics = new AnalyticsEngine(db);
    }

    /**
     * Get user's organization ID from phone number
     */
    private async getOrganizationId(phoneNumber: string): Promise<string> {
        try {
            // Try to get user from whatsapp_users collection
            const userSnapshot = await this.db.collection('whatsapp_users')
                .where('phoneNumber', '==', phoneNumber)
                .limit(1)
                .get();

            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                return userData.organizationId || 'default_org';
            }

            // If no user found, return default
            return 'default_org';
        } catch (error) {
            console.error('Error getting organization ID:', error);
            return 'default_org';
        }
    }

    /**
     * Get user ID from phone number
     */
    private async getUserId(phoneNumber: string): Promise<string> {
        try {
            const userSnapshot = await this.db.collection('whatsapp_users')
                .where('phoneNumber', '==', phoneNumber)
                .limit(1)
                .get();

            if (!userSnapshot.empty) {
                return userSnapshot.docs[0].id;
            }

            return phoneNumber; // Fallback to phone number
        } catch (error) {
            console.error('Error getting user ID:', error);
            return phoneNumber;
        }
    }

    /**
     * Process message with OpenAI using function calling
     */
    async processWithAI(
        phoneNumber: string,
        message: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; message: string; timestamp: Date }>
    ): Promise<string> {
        try {
            const organizationId = await this.getOrganizationId(phoneNumber);
            const userId = await this.getUserId(phoneNumber);

            // Build conversation messages for OpenAI
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content: `You are an intelligent, conversational logistics assistant for a Nigerian transport/logistics company. You communicate via WhatsApp and help manage the entire business.

YOUR CAPABILITIES:
You can query AND create data in the Firebase database. You have access to:
- Routes (deliveries/shipments)
- Drivers and their wallet balances
- Vehicles
- Clients
- Invoices
- Expenses
- Analytics and performance metrics

IMPORTANT RULES:
1. **ALWAYS use functions to get real data** - NEVER make up or assume data
2. When user asks about "my balance" or "wallet", call get_wallet_balance()
3. When user asks to create something (route, client, driver, vehicle), gather ALL required information first, then call the appropriate create function
4. If information is missing, ask the user for it conversationally
5. Use Nigerian Naira (₦) for all currency
6. Be warm, friendly, and professional - use emojis sparingly
7. Keep responses concise (2-3 sentences max unless analysis is requested)

CONVERSATION STYLE:
- Natural and conversational (like "Hey! Let me check that for you")
- Professional but friendly
- Acknowledge requests immediately
- Provide specific numbers and details from real data
- Offer proactive insights when relevant

Current context:
- Organization ID: ${organizationId}
- User ID: ${userId}

EXAMPLES:
User: "What's my balance?"
You: Call get_wallet_balance() → "Your wallet balance is ₦245,800 💰"

User: "Create a route from Lagos to Abuja"
You: "Great! I'll help you create that route. Who is the client, and what's the delivery date?"

User: "How many active drivers do I have?"
You: Call get_drivers({status: 'Active'}) → "You have 12 active drivers ready for assignments"

NEVER return mock data. ALWAYS use functions to get real Firebase data.`
                }
            ];

            // Add conversation history (last 10 messages)
            const recentHistory = conversationHistory.slice(-10);
            for (const msg of recentHistory) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.message
                });
            }

            // Add current message
            messages.push({
                role: 'user',
                content: message
            });

            // Define available functions
            const functions: OpenAI.Chat.ChatCompletionTool[] = [
                {
                    type: 'function',
                    function: {
                        name: 'get_routes',
                        description: 'Get routes/deliveries with optional filters by status or date range',
                        parameters: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
                                    description: 'Filter routes by status'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of routes to return (default 50)'
                                },
                                startDate: {
                                    type: 'string',
                                    description: 'Start date for filtering (YYYY-MM-DD format)'
                                },
                                endDate: {
                                    type: 'string',
                                    description: 'End date for filtering (YYYY-MM-DD format)'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_drivers',
                        description: 'Get list of drivers with optional status filter',
                        parameters: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    enum: ['Active', 'Inactive', 'On Leave'],
                                    description: 'Filter drivers by status'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of drivers to return (default 50)'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_vehicles',
                        description: 'Get list of vehicles with optional status filter',
                        parameters: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    enum: ['Active', 'Maintenance', 'Out of Service'],
                                    description: 'Filter vehicles by status'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of vehicles to return (default 50)'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_invoices',
                        description: 'Get invoices with optional filters by status, amount, or date range',
                        parameters: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
                                    description: 'Filter invoices by status'
                                },
                                minAmount: {
                                    type: 'number',
                                    description: 'Minimum invoice amount to filter'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of invoices to return (default 50)'
                                },
                                startDate: {
                                    type: 'string',
                                    description: 'Start date for filtering (YYYY-MM-DD format)'
                                },
                                endDate: {
                                    type: 'string',
                                    description: 'End date for filtering (YYYY-MM-DD format)'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_clients',
                        description: 'Get list of clients',
                        parameters: {
                            type: 'object',
                            properties: {
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of clients to return (default 50)'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_expenses',
                        description: 'Get expenses with optional filters by category or date range',
                        parameters: {
                            type: 'object',
                            properties: {
                                category: {
                                    type: 'string',
                                    description: 'Filter expenses by category (e.g., Fuel, Maintenance, Salary)'
                                },
                                startDate: {
                                    type: 'string',
                                    description: 'Start date for filtering (YYYY-MM-DD format)'
                                },
                                endDate: {
                                    type: 'string',
                                    description: 'End date for filtering (YYYY-MM-DD format)'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of expenses to return (default 100)'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'analyze_route_performance',
                        description: 'Analyze route completion rates, efficiency, and performance metrics',
                        parameters: {
                            type: 'object',
                            properties: {
                                period: {
                                    type: 'string',
                                    enum: ['week', 'month', 'year'],
                                    description: 'Time period for analysis'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'analyze_driver_performance',
                        description: 'Analyze driver performance, identify top performers and idle drivers',
                        parameters: {
                            type: 'object',
                            properties: {
                                topN: {
                                    type: 'number',
                                    description: 'Number of top performers to return (default 5)'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'analyze_invoices',
                        description: 'Analyze invoice status, revenue, and identify overdue payments',
                        parameters: {
                            type: 'object',
                            properties: {
                                period: {
                                    type: 'string',
                                    enum: ['week', 'month', 'year'],
                                    description: 'Time period for analysis'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'analyze_expenses',
                        description: 'Analyze expenses by category and identify cost optimization opportunities',
                        parameters: {
                            type: 'object',
                            properties: {
                                period: {
                                    type: 'string',
                                    enum: ['week', 'month', 'year'],
                                    description: 'Time period for analysis'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'analyze_fleet',
                        description: 'Analyze fleet utilization, vehicle status, and identify idle vehicles',
                        parameters: {
                            type: 'object',
                            properties: {}
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_wallet_balance',
                        description: 'Get user wallet balance',
                        parameters: {
                            type: 'object',
                            properties: {}
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_notifications',
                        description: 'Get user notifications, optionally filter for unread only',
                        parameters: {
                            type: 'object',
                            properties: {
                                unreadOnly: {
                                    type: 'boolean',
                                    description: 'Return only unread notifications'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of notifications to return (default 20)'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'create_route',
                        description: 'Create a new delivery route',
                        parameters: {
                            type: 'object',
                            properties: {
                                pickup: {
                                    type: 'string',
                                    description: 'Pickup location address'
                                },
                                delivery: {
                                    type: 'string',
                                    description: 'Delivery destination address'
                                },
                                client: {
                                    type: 'string',
                                    description: 'Client name'
                                },
                                date: {
                                    type: 'string',
                                    description: 'Delivery date (YYYY-MM-DD format)'
                                }
                            },
                            required: ['pickup', 'delivery', 'client', 'date']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'create_client',
                        description: 'Register a new client',
                        parameters: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'Client company name'
                                },
                                contactPerson: {
                                    type: 'string',
                                    description: 'Contact person name'
                                },
                                phone: {
                                    type: 'string',
                                    description: 'Client phone number'
                                },
                                email: {
                                    type: 'string',
                                    description: 'Client email address'
                                },
                                address: {
                                    type: 'string',
                                    description: 'Client business address'
                                }
                            },
                            required: ['name', 'phone']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'create_driver',
                        description: 'Register a new driver',
                        parameters: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'Driver full name'
                                },
                                phone: {
                                    type: 'string',
                                    description: 'Driver phone number'
                                },
                                email: {
                                    type: 'string',
                                    description: 'Driver email address'
                                },
                                licenseNumber: {
                                    type: 'string',
                                    description: 'Driver license number'
                                }
                            },
                            required: ['name', 'phone', 'licenseNumber']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'create_vehicle',
                        description: 'Register a new vehicle',
                        parameters: {
                            type: 'object',
                            properties: {
                                plateNumber: {
                                    type: 'string',
                                    description: 'Vehicle plate/registration number'
                                },
                                model: {
                                    type: 'string',
                                    description: 'Vehicle make and model'
                                },
                                type: {
                                    type: 'string',
                                    description: 'Vehicle type (e.g., Truck, Van, Trailer)'
                                },
                                capacity: {
                                    type: 'string',
                                    description: 'Vehicle cargo capacity'
                                }
                            },
                            required: ['plateNumber', 'model', 'type']
                        }
                    }
                }
            ];

            // Call OpenAI with function calling
            let response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages,
                tools: functions,
                tool_choice: 'auto'
            });

            // Handle function calls
            let assistantMessage = response.choices[0].message;

            // Loop to handle multiple function calls
            while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                // Add assistant's message with tool calls
                messages.push(assistantMessage);

                // Execute each function call
                for (const toolCall of assistantMessage.tool_calls) {
                    if (toolCall.type !== 'function') continue;

                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    console.log(`Calling function: ${functionName} with args:`, functionArgs);

                    let functionResult: any;

                    // Execute the appropriate function
                    switch (functionName) {
                        case 'get_routes':
                            functionResult = await this.queries.getRoutes({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'get_drivers':
                            functionResult = await this.queries.getDrivers({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'get_vehicles':
                            functionResult = await this.queries.getVehicles({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'get_invoices':
                            functionResult = await this.queries.getInvoices({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'get_clients':
                            functionResult = await this.queries.getClients({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'get_expenses':
                            functionResult = await this.queries.getExpenses({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'analyze_route_performance':
                            functionResult = await this.analytics.analyzeRoutePerformance({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'analyze_driver_performance':
                            functionResult = await this.analytics.analyzeDriverPerformance({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'analyze_invoices':
                            functionResult = await this.analytics.analyzeInvoices({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'analyze_expenses':
                            functionResult = await this.analytics.analyzeExpenses({
                                organizationId,
                                ...functionArgs
                            });
                            break;

                        case 'analyze_fleet':
                            functionResult = await this.analytics.analyzeFleet({
                                organizationId
                            });
                            break;

                        case 'get_wallet_balance':
                            functionResult = await this.queries.getWalletBalance(userId);
                            break;

                        case 'get_notifications':
                            functionResult = await this.queries.getNotifications({
                                userId,
                                ...functionArgs
                            });
                            break;

                        case 'create_route':
                            functionResult = await this.createRoute(organizationId, functionArgs);
                            break;

                        case 'create_client':
                            functionResult = await this.createClient(organizationId, functionArgs);
                            break;

                        case 'create_driver':
                            functionResult = await this.createDriver(organizationId, functionArgs);
                            break;

                        case 'create_vehicle':
                            functionResult = await this.createVehicle(organizationId, functionArgs);
                            break;

                        default:
                            functionResult = { error: `Unknown function: ${functionName}` };
                    }

                    // Add function result to messages
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(functionResult)
                    });
                }

                // Get next response from OpenAI
                response = await this.openai.chat.completions.create({
                    model: 'gpt-4-turbo-preview',
                    messages,
                    tools: functions,
                    tool_choice: 'auto'
                });

                assistantMessage = response.choices[0].message;
            }

            // Return final response
            return assistantMessage.content || 'I processed your request but encountered an issue generating a response.';
        } catch (error) {
            console.error('Error in OpenAI processing:', error);
            throw error;
        }
    }

    /**
     * Create a new route in Firebase
     */
    private async createRoute(organizationId: string, data: any): Promise<any> {
        try {
            const routeData = {
                organizationId,
                pickup: data.pickup,
                delivery: data.delivery,
                client: data.client,
                date: data.date,
                status: 'Pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const routeRef = await this.db.collection('routes').add(routeData);

            return {
                success: true,
                routeId: routeRef.id,
                message: 'Route created successfully',
                data: routeData
            };
        } catch (error) {
            console.error('Error creating route:', error);
            return {
                success: false,
                error: 'Failed to create route'
            };
        }
    }

    /**
     * Create a new client in Firebase
     */
    private async createClient(organizationId: string, data: any): Promise<any> {
        try {
            const clientData = {
                organizationId,
                name: data.name,
                contactPerson: data.contactPerson || '',
                phone: data.phone,
                email: data.email || '',
                address: data.address || '',
                status: 'Active',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const clientRef = await this.db.collection('clients').add(clientData);

            return {
                success: true,
                clientId: clientRef.id,
                message: 'Client registered successfully',
                data: clientData
            };
        } catch (error) {
            console.error('Error creating client:', error);
            return {
                success: false,
                error: 'Failed to register client'
            };
        }
    }

    /**
     * Create a new driver in Firebase
     */
    private async createDriver(organizationId: string, data: any): Promise<any> {
        try {
            const driverData = {
                organizationId,
                name: data.name,
                phone: data.phone,
                email: data.email || '',
                licenseNumber: data.licenseNumber,
                status: 'Active',
                walletBalance: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const driverRef = await this.db.collection('drivers').add(driverData);

            return {
                success: true,
                driverId: driverRef.id,
                message: 'Driver registered successfully',
                data: driverData
            };
        } catch (error) {
            console.error('Error creating driver:', error);
            return {
                success: false,
                error: 'Failed to register driver'
            };
        }
    }

    /**
     * Create a new vehicle in Firebase
     */
    private async createVehicle(organizationId: string, data: any): Promise<any> {
        try {
            const vehicleData = {
                organizationId,
                plateNumber: data.plateNumber,
                model: data.model,
                type: data.type,
                capacity: data.capacity || '',
                status: 'Active',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const vehicleRef = await this.db.collection('vehicles').add(vehicleData);

            return {
                success: true,
                vehicleId: vehicleRef.id,
                message: 'Vehicle registered successfully',
                data: vehicleData
            };
        } catch (error) {
            console.error('Error creating vehicle:', error);
            return {
                success: false,
                error: 'Failed to register vehicle'
            };
        }
    }

    /**
     * Generate proactive notifications based on data insights
     */
    async generateProactiveNotifications(phoneNumber: string): Promise<string[]> {
        try {
            const organizationId = await this.getOrganizationId(phoneNumber);
            const notifications: string[] = [];

            // Check for overdue invoices
            const invoiceAnalysis = await this.analytics.analyzeInvoices({
                organizationId,
                period: 'month'
            });

            if (invoiceAnalysis.overdueInvoices > 0) {
                notifications.push(
                    `⚠️ You have ${invoiceAnalysis.overdueInvoices} overdue invoices totaling ${invoiceAnalysis.overdueRevenue}. Consider sending payment reminders.`
                );
            }

            // Check for idle drivers
            const driverAnalysis = await this.analytics.analyzeDriverPerformance({
                organizationId,
                topN: 5
            });

            if (driverAnalysis.idleDrivers && driverAnalysis.idleDrivers.length > 0) {
                notifications.push(
                    `📊 ${driverAnalysis.idleDrivers.length} driver(s) are currently idle. Consider optimizing route assignments.`
                );
            }

            // Check fleet utilization
            const fleetAnalysis = await this.analytics.analyzeFleet({
                organizationId
            });

            const utilizationRate = parseFloat(fleetAnalysis.utilizationRate);
            if (utilizationRate < 50) {
                notifications.push(
                    `🚗 Fleet utilization is at ${fleetAnalysis.utilizationRate}. ${fleetAnalysis.idleVehicles} vehicles are idle.`
                );
            }

            return notifications;
        } catch (error) {
            console.error('Error generating proactive notifications:', error);
            return [];
        }
    }

    /**
     * Determine if a message should use OpenAI or basic flow
     * Now ALWAYS uses OpenAI unless in a multi-step flow that needs structured guidance
     */
    shouldUseAI(message: string, currentFlow: string | null | undefined): boolean {
        // If in a multi-step flow (like invoice profile setup), use structured flow
        // Otherwise, ALWAYS use OpenAI
        if (currentFlow === 'setup_invoice_profile') {
            return false;
        }

        // Use OpenAI for EVERYTHING else
        return true;
    }
}
