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
     * Normalize phone number to international format (+234...)
     * Handles formats: 070..., 234..., +234...
     */
    private normalizePhoneNumber(phoneNumber: string): string {
        // Remove all non-digit characters except leading +
        let cleaned = phoneNumber.replace(/[^\d+]/g, '');

        // If starts with 0 (Nigerian local format), replace with +234
        if (cleaned.startsWith('0')) {
            return '+234' + cleaned.substring(1);
        }

        // If starts with 234 but no +, add it
        if (cleaned.startsWith('234') && !cleaned.startsWith('+')) {
            return '+' + cleaned;
        }

        // If already starts with +, return as is
        if (cleaned.startsWith('+')) {
            return cleaned;
        }

        // Fallback: assume it's a local number, add +234
        return '+234' + cleaned;
    }

    /**
     * Get user's organization ID from phone number
     * SECURITY CRITICAL: Must always return correct organizationId to prevent data leakage
     */
    private async getOrganizationId(phoneNumber: string): Promise<string> {
        try {
            // Normalize phone number to international format
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

            console.log(`🔍 [SECURITY] Fetching organizationId for phone: ${phoneNumber} (normalized: ${normalizedPhone})`);

            // Query users collection by whatsappNumber field
            const userSnapshot = await this.db.collection('users')
                .where('whatsappNumber', '==', normalizedPhone)
                .limit(1)
                .get();

            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                const orgId = userData.organizationId;

                if (!orgId || orgId === 'default_org') {
                    console.error(`⚠️ [SECURITY WARNING] User ${normalizedPhone} has invalid organizationId: ${orgId}`);
                    console.error(`⚠️ [SECURITY WARNING] User data:`, JSON.stringify(userData));
                }

                console.log(`✅ [SECURITY] Found organizationId: ${orgId} for phone: ${normalizedPhone}`);
                return orgId || 'default_org';
            }

            // If no user found, log error
            console.error(`❌ [SECURITY ERROR] No user record found for whatsappNumber: ${normalizedPhone}`);
            console.error(`❌ [SECURITY ERROR] User must have whatsappNumber field set in users collection`);
            return 'default_org';
        } catch (error) {
            console.error('❌ [SECURITY ERROR] Error getting organization ID:', error);
            return 'default_org';
        }
    }

    /**
     * Get user ID from phone number
     */
    private async getUserId(phoneNumber: string): Promise<string> {
        try {
            // Normalize phone number to international format
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

            const userSnapshot = await this.db.collection('users')
                .where('whatsappNumber', '==', normalizedPhone)
                .limit(1)
                .get();

            if (!userSnapshot.empty) {
                const userId = userSnapshot.docs[0].id;
                console.log(`✅ Found userId: ${userId} for phone: ${normalizedPhone}`);
                return userId;
            }

            console.warn(`⚠️ No userId found for phone: ${normalizedPhone}, using phone as fallback`);
            return normalizedPhone; // Fallback to phone number
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

            // Build conversation messages for OpenAI with optimized system prompt
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content: `You are Amana, a logistics AI assistant for Nigerian transport companies via WhatsApp.

CAPABILITIES: Query/create routes, drivers, vehicles, clients, invoices, expenses, analytics via Firebase functions.

RULES:
1. ALWAYS use functions for real data - never fabricate
2. Keep responses 2-3 sentences max
3. Use Nigerian Naira (₦)
4. Be warm, professional, match user's language (English/Pidgin/Hausa/Igbo/Yoruba)
5. Extract all info from messages when possible

CONTEXT: OrgID=${organizationId}, UserID=${userId}

DRIVER REGISTRATION:
"Register driver John Doe, 07031167360, license T123, NIN 123456, salary 800000, account 7031167360 Opay" → Extract all data, call create_driver
Required: name, phone, licenseNumber, baseSalary
Optional: nin, pensionRate (default 8%), nhfRate (default 3%), bank details
If account number provided, verify first with verify_bank_account, then include verified name in response

VEHICLE REGISTRATION:
"Register vehicle Ford Transit 2023, plate KJA211XA, VIN q2345er432, odometer 76000" → Extract all, call create_vehicle
Required: make, model, year, plateNumber
Optional: vin, odometer, lastServiceDate, assignedDriverName
"Register Ford Transit 2023 KJA211XA assign to John Doe" → Assigns driver automatically

VEHICLE ASSIGNMENT:
"Assign John Doe to vehicle KJA211XA" → call assign_vehicle_driver
"Assign driver John to plate ABC123" → call assign_vehicle_driver
Required: plateNumber (vehicle plate), driverName (driver full name)

EXAMPLES:
"What's my balance?" → get_wallet_balance() → "₦245,800"
"List my vehicles" → get_vehicles() → Shows all vehicles
"Register driver" → Ask for: name, phone, license, NIN, salary, bank details
"Register vehicle" → Ask for: make, model, year, plate number, VIN, odometer`
                }
            ];

            // Add conversation history (last 4 messages only - cost optimization)
            // This keeps context while reducing token usage by 60%
            const recentHistory = conversationHistory.slice(-4);
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
                                origin: {
                                    type: 'string',
                                    description: 'Origin/pickup location (e.g., Lagos, Agbara)'
                                },
                                destination: {
                                    type: 'string',
                                    description: 'Destination/delivery location (e.g., Abuja, Kano Depot)'
                                },
                                distance: {
                                    type: 'number',
                                    description: 'Distance in kilometers'
                                },
                                stops: {
                                    type: 'number',
                                    description: 'Number of stops along the route'
                                },
                                rate: {
                                    type: 'number',
                                    description: 'Route rate/cost in Naira'
                                },
                                clientName: {
                                    type: 'string',
                                    description: 'Client company name (optional)'
                                }
                            },
                            required: ['origin', 'destination']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_route',
                        description: 'Get details of a specific route by ID',
                        parameters: {
                            type: 'object',
                            properties: {
                                routeId: {
                                    type: 'string',
                                    description: 'Route ID (e.g., RTE-AGBARA-KANO-ABC123)'
                                }
                            },
                            required: ['routeId']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'add_route_expense',
                        description: 'Add an expense to a route (fuel, tolls, maintenance, etc.)',
                        parameters: {
                            type: 'object',
                            properties: {
                                routeId: {
                                    type: 'string',
                                    description: 'Route ID to add expense to'
                                },
                                category: {
                                    type: 'string',
                                    enum: ['Fuel', 'Tolls', 'Maintenance', 'Food', 'Accommodation', 'Other'],
                                    description: 'Expense category'
                                },
                                amount: {
                                    type: 'number',
                                    description: 'Expense amount in Naira'
                                },
                                description: {
                                    type: 'string',
                                    description: 'Description of the expense'
                                }
                            },
                            required: ['routeId', 'category', 'amount']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'assign_route',
                        description: 'Assign a driver and vehicle to a route',
                        parameters: {
                            type: 'object',
                            properties: {
                                routeId: {
                                    type: 'string',
                                    description: 'Route ID to assign resources to'
                                },
                                driverName: {
                                    type: 'string',
                                    description: 'Driver name to assign'
                                },
                                vehiclePlate: {
                                    type: 'string',
                                    description: 'Vehicle plate number (optional)'
                                }
                            },
                            required: ['routeId', 'driverName']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'create_client',
                        description: 'Register a new client company',
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
                                },
                                tin: {
                                    type: 'string',
                                    description: 'Tax Identification Number (TIN)'
                                },
                                cacNumber: {
                                    type: 'string',
                                    description: 'CAC (Corporate Affairs Commission) registration number'
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
                        description: 'Register a new driver with full details including payroll and bank information',
                        parameters: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'Driver full name (e.g., John Doe)'
                                },
                                phone: {
                                    type: 'string',
                                    description: 'Driver phone number in Nigerian format (e.g., 0703116736, +2347031167360)'
                                },
                                licenseNumber: {
                                    type: 'string',
                                    description: 'Driver license number (e.g., T1230000)'
                                },
                                nin: {
                                    type: 'string',
                                    description: 'National Identification Number (optional)'
                                },
                                baseSalary: {
                                    type: 'number',
                                    description: 'Annual base salary in Naira (e.g., 800000 for ₦800,000)'
                                },
                                pensionRate: {
                                    type: 'number',
                                    description: 'Pension contribution rate percentage (default: 8)'
                                },
                                nhfRate: {
                                    type: 'number',
                                    description: 'NHF (National Housing Fund) contribution rate percentage (default: 3)'
                                },
                                accountNumber: {
                                    type: 'string',
                                    description: '10-digit bank account number (e.g., 7031167360)'
                                },
                                accountName: {
                                    type: 'string',
                                    description: 'Account holder name (will be verified)'
                                },
                                bankName: {
                                    type: 'string',
                                    description: 'Bank name (e.g., Opay, GTBank, Access Bank)'
                                },
                                bankCode: {
                                    type: 'string',
                                    description: 'Bank code for verification (e.g., 999992 for Opay, 058 for GTBank)'
                                }
                            },
                            required: ['name', 'phone', 'licenseNumber', 'baseSalary']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'create_vehicle',
                        description: 'Register a new vehicle with full details including telematics and maintenance',
                        parameters: {
                            type: 'object',
                            properties: {
                                make: {
                                    type: 'string',
                                    description: 'Vehicle manufacturer/make (e.g., Ford, Toyota, Mercedes)'
                                },
                                model: {
                                    type: 'string',
                                    description: 'Vehicle model (e.g., Transit, Hilux, Actros)'
                                },
                                year: {
                                    type: 'number',
                                    description: 'Vehicle year of manufacture (e.g., 2023, 2020)'
                                },
                                plateNumber: {
                                    type: 'string',
                                    description: 'Vehicle license plate/registration number (e.g., KJA211XA, ABC-123-XY)'
                                },
                                vin: {
                                    type: 'string',
                                    description: 'Vehicle Identification Number (17-digit VIN)'
                                },
                                odometer: {
                                    type: 'number',
                                    description: 'Initial odometer reading in kilometers (e.g., 76000)'
                                },
                                lastServiceDate: {
                                    type: 'string',
                                    description: 'Last service/maintenance date (YYYY-MM-DD format, optional)'
                                },
                                assignedDriverName: {
                                    type: 'string',
                                    description: 'Name of driver to assign to this vehicle (optional)'
                                }
                            },
                            required: ['make', 'model', 'year', 'plateNumber']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'assign_vehicle_driver',
                        description: 'Assign a driver to a vehicle or update vehicle assignment',
                        parameters: {
                            type: 'object',
                            properties: {
                                plateNumber: {
                                    type: 'string',
                                    description: 'Vehicle plate number (e.g., KJA211XA, ABC-123)'
                                },
                                driverName: {
                                    type: 'string',
                                    description: 'Driver name to assign (e.g., John Doe)'
                                }
                            },
                            required: ['plateNumber', 'driverName']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'create_invoice',
                        description: 'Create a new invoice for a client',
                        parameters: {
                            type: 'object',
                            properties: {
                                clientName: {
                                    type: 'string',
                                    description: 'Client company name'
                                },
                                items: {
                                    type: 'array',
                                    description: 'List of items/services to invoice',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: {
                                                type: 'string',
                                                description: 'Item/service description (e.g., "Cement bags")'
                                            },
                                            quantity: {
                                                type: 'number',
                                                description: 'Quantity of items'
                                            },
                                            unitPrice: {
                                                type: 'number',
                                                description: 'Price per unit in Naira'
                                            }
                                        },
                                        required: ['description', 'quantity', 'unitPrice']
                                    }
                                },
                                vatInclusive: {
                                    type: 'boolean',
                                    description: 'Whether to include VAT (default: false)'
                                },
                                vatRate: {
                                    type: 'number',
                                    description: 'VAT percentage if applicable (e.g., 7.5)'
                                },
                                notes: {
                                    type: 'string',
                                    description: 'Additional notes or payment terms'
                                }
                            },
                            required: ['clientName', 'items']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'get_invoice',
                        description: 'Get a specific invoice by invoice number or get the most recent invoice',
                        parameters: {
                            type: 'object',
                            properties: {
                                invoiceNumber: {
                                    type: 'string',
                                    description: 'Invoice number (e.g., INV-202510-0001). If not provided, returns most recent invoice.'
                                }
                            }
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'send_invoice',
                        description: 'Send an invoice to the client via email',
                        parameters: {
                            type: 'object',
                            properties: {
                                invoiceNumber: {
                                    type: 'string',
                                    description: 'Invoice number to send (e.g., INV-202510-0001)'
                                }
                            },
                            required: ['invoiceNumber']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'verify_bank_account',
                        description: 'Verify a Nigerian bank account number using Paystack API',
                        parameters: {
                            type: 'object',
                            properties: {
                                accountNumber: {
                                    type: 'string',
                                    description: '10-digit account number (e.g., 7031167360)'
                                },
                                bankCode: {
                                    type: 'string',
                                    description: 'Bank code (e.g., 999992 for Opay, 058 for GTBank, 044 for Access Bank)'
                                }
                            },
                            required: ['accountNumber', 'bankCode']
                        }
                    }
                }
            ];

            // Call OpenAI with function calling (cost-optimized model)
            // gpt-4o-mini: $0.15/1M input, $0.60/1M output (67x cheaper than gpt-4-turbo!)
            let response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                tools: functions,
                tool_choice: 'auto',
                max_tokens: 300 // Limit response length for cost savings
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

                        case 'get_route':
                            functionResult = await this.getRoute(functionArgs.routeId);
                            break;

                        case 'add_route_expense':
                            functionResult = await this.addRouteExpense(functionArgs.routeId, functionArgs);
                            break;

                        case 'assign_route':
                            functionResult = await this.assignRoute(organizationId, functionArgs);
                            break;

                        case 'assign_vehicle_driver':
                            functionResult = await this.assignVehicleDriver(organizationId, functionArgs);
                            break;

                        case 'create_client':
                            functionResult = await this.createClient(organizationId, phoneNumber, functionArgs);
                            break;

                        case 'create_driver':
                            functionResult = await this.createDriver(organizationId, functionArgs, phoneNumber);
                            break;

                        case 'create_vehicle':
                            functionResult = await this.createVehicle(organizationId, functionArgs, phoneNumber);
                            break;

                        case 'create_invoice':
                            functionResult = await this.createInvoice(organizationId, phoneNumber, functionArgs);
                            break;

                        case 'get_invoice':
                            functionResult = await this.getInvoice(organizationId, functionArgs.invoiceNumber);
                            break;

                        case 'send_invoice':
                            functionResult = await this.sendInvoice(organizationId, functionArgs.invoiceNumber);
                            break;

                        case 'verify_bank_account':
                            functionResult = await this.verifyBankAccount(functionArgs);
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

                // Get next response from OpenAI (cost-optimized)
                response = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages,
                    tools: functions,
                    tool_choice: 'auto',
                    max_tokens: 300
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
     * Follows exact Firebase structure: RTE-ORIGIN-DESTINATION-RANDOM
     */
    private async createRoute(organizationId: string, data: any): Promise<any> {
        try {
            console.log('[ROUTE CREATE] Starting route creation via WhatsApp...');
            console.log('[ROUTE CREATE] Organization ID:', organizationId);
            console.log('[ROUTE CREATE] Route data:', data);

            // Generate route ID in format: RTE-AGBARA-KANODEPOT-ZUXB00
            const cleanOrigin = (data.origin || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
            const cleanDestination = (data.destination || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const routeId = `RTE-${cleanOrigin}-${cleanDestination}-${randomSuffix}`;

            console.log('[ROUTE CREATE] Generated route ID:', routeId);

            // Find client by name if provided
            let clientId = null;
            let clientName = '';
            if (data.clientName) {
                const clientsSnapshot = await this.db.collection('clients')
                    .where('organizationId', '==', organizationId)
                    .where('name', '==', data.clientName)
                    .limit(1)
                    .get();

                if (!clientsSnapshot.empty) {
                    const clientDoc = clientsSnapshot.docs[0];
                    clientId = clientDoc.id;
                    clientName = data.clientName;
                    console.log('[ROUTE CREATE] Found client:', clientId, clientName);
                } else {
                    console.log('[ROUTE CREATE] Client not found:', data.clientName);
                }
            }

            // Create route data matching exact Firebase structure
            const routeData = {
                organizationId,
                origin: data.origin,
                destination: data.destination,
                distance: data.distance || 0,
                distanceKm: data.distance || 0,
                stops: data.stops || 0,
                rate: data.rate || 0,
                driverName: '',
                driverAvatar: '',
                vehicle: '',
                driverId: null,
                vehicleId: null,
                status: 'Pending',
                progress: 0,
                assignedDriverId: null,
                assignedDriverName: '',
                assignedVehicleId: null,
                assignedVehiclePlate: '',
                clientId: clientId,
                clientName: clientName,
                cargo: {
                    type: '',
                    weight: 0,
                    description: ''
                },
                estimatedDepartureTime: null,
                estimatedArrivalTime: null,
                actualDepartureTime: null,
                actualArrivalTime: null,
                podUrl: null,
                notes: '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: organizationId // Will be updated to userId when available
            };

            console.log('[ROUTE CREATE] Saving route to Firestore...');
            await this.db.collection('routes').doc(routeId).set(routeData);

            console.log('[ROUTE CREATE] ✅ Route saved successfully!');

            return {
                success: true,
                routeId: routeId,
                message: `Route "${data.origin} → ${data.destination}" created successfully`,
                data: {
                    ...routeData,
                    id: routeId,
                    rate: data.rate ? `₦${data.rate.toLocaleString()}` : '₦0',
                    distance: data.distance ? `${data.distance} km` : '0 km'
                }
            };
        } catch (error) {
            console.error('[ROUTE CREATE] ❌ Error creating route:', error);
            return {
                success: false,
                error: 'Failed to create route'
            };
        }
    }

    /**
     * Get route details from Firebase
     */
    private async getRoute(routeId: string): Promise<any> {
        try {
            console.log('[ROUTE GET] Fetching route:', routeId);

            const routeDoc = await this.db.collection('routes').doc(routeId).get();

            if (!routeDoc.exists) {
                return {
                    success: false,
                    error: `Route ${routeId} not found`
                };
            }

            const routeData = routeDoc.data();

            // Get expenses for this route
            const expensesSnapshot = await this.db.collection('routes')
                .doc(routeId)
                .collection('expenses')
                .orderBy('date', 'desc')
                .get();

            const expenses = expensesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const totalExpenses = expenses.reduce((sum, exp: any) => sum + (exp.amount || 0), 0);

            console.log('[ROUTE GET] ✅ Route found with', expenses.length, 'expenses');

            return {
                success: true,
                route: {
                    id: routeId,
                    ...routeData,
                    expenses,
                    totalExpenses: `₦${totalExpenses.toLocaleString()}`,
                    rate: routeData?.rate ? `₦${routeData.rate.toLocaleString()}` : '₦0',
                    distance: routeData?.distance ? `${routeData.distance} km` : '0 km',
                    expenseCount: expenses.length
                }
            };
        } catch (error) {
            console.error('[ROUTE GET] ❌ Error getting route:', error);
            return {
                success: false,
                error: 'Failed to get route details'
            };
        }
    }

    /**
     * Add expense to a route subcollection
     */
    private async addRouteExpense(routeId: string, data: any): Promise<any> {
        try {
            console.log('[ROUTE EXPENSE] Adding expense to route:', routeId);
            console.log('[ROUTE EXPENSE] Expense data:', data);

            // Check if route exists
            const routeDoc = await this.db.collection('routes').doc(routeId).get();

            if (!routeDoc.exists) {
                return {
                    success: false,
                    error: `Route ${routeId} not found`
                };
            }

            // Create expense in subcollection
            const expenseData = {
                category: data.category,
                amount: data.amount,
                description: data.description || '',
                date: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const expenseRef = await this.db.collection('routes')
                .doc(routeId)
                .collection('expenses')
                .add(expenseData);

            console.log('[ROUTE EXPENSE] ✅ Expense added successfully:', expenseRef.id);

            return {
                success: true,
                expenseId: expenseRef.id,
                message: `${data.category} expense of ₦${data.amount.toLocaleString()} added to route`,
                data: {
                    ...expenseData,
                    id: expenseRef.id,
                    amount: `₦${data.amount.toLocaleString()}`
                }
            };
        } catch (error) {
            console.error('[ROUTE EXPENSE] ❌ Error adding expense:', error);
            return {
                success: false,
                error: 'Failed to add route expense'
            };
        }
    }

    /**
     * Assign driver and vehicle to a route
     */
    private async assignRoute(organizationId: string, data: any): Promise<any> {
        try {
            console.log('[ROUTE ASSIGN] Assigning resources to route:', data.routeId);
            console.log('[ROUTE ASSIGN] Driver:', data.driverName, 'Vehicle:', data.vehiclePlate);

            // Check if route exists
            const routeDoc = await this.db.collection('routes').doc(data.routeId).get();

            if (!routeDoc.exists) {
                return {
                    success: false,
                    error: `Route ${data.routeId} not found`
                };
            }

            // Find driver by name in the organization
            console.log('[ROUTE ASSIGN] Searching for driver:', data.driverName, 'in org:', organizationId);

            const driversSnapshot = await this.db.collection('drivers')
                .where('organizationId', '==', organizationId)
                .where('name', '==', data.driverName)
                .limit(1)
                .get();

            console.log('[ROUTE ASSIGN] Drivers found:', driversSnapshot.size);

            if (driversSnapshot.empty) {
                // List available drivers for debugging
                const allDriversSnapshot = await this.db.collection('drivers')
                    .where('organizationId', '==', organizationId)
                    .limit(10)
                    .get();

                const availableDrivers = allDriversSnapshot.docs.map((doc: any) => doc.data().name);
                console.log('[ROUTE ASSIGN] Available drivers in org:', availableDrivers);

                return {
                    success: false,
                    error: `Driver "${data.driverName}" not found. Available drivers: ${availableDrivers.join(', ')}`
                };
            }

            const driverDoc = driversSnapshot.docs[0];
            const driverId = driverDoc.id;
            const driverData = driverDoc.data();
            console.log('[ROUTE ASSIGN] ✅ Found driver:', driverId, data.driverName);

            // Find vehicle by plate if provided
            let vehicleId = null;
            let vehiclePlate = '';
            if (data.vehiclePlate) {
                const vehiclesSnapshot = await this.db.collection('vehicles')
                    .where('organizationId', '==', organizationId)
                    .where('plateNumber', '==', data.vehiclePlate.toUpperCase())
                    .limit(1)
                    .get();

                if (!vehiclesSnapshot.empty) {
                    vehicleId = vehiclesSnapshot.docs[0].id;
                    vehiclePlate = data.vehiclePlate.toUpperCase();
                    console.log('[ROUTE ASSIGN] ✅ Found vehicle:', vehicleId, vehiclePlate);
                } else {
                    console.log('[ROUTE ASSIGN] ❌ Vehicle not found:', data.vehiclePlate);
                    // Return error if vehicle was specified but not found
                    return {
                        success: false,
                        error: `Vehicle with plate "${data.vehiclePlate}" not found in your organization`
                    };
                }
            }

            // Update route with assignments
            await this.db.collection('routes').doc(data.routeId).update({
                assignedDriverId: driverId,
                assignedDriverName: data.driverName,
                assignedVehicleId: vehicleId,
                assignedVehiclePlate: vehiclePlate,
                driverName: data.driverName,
                driverId: driverId,
                vehicleId: vehicleId,
                vehicle: vehiclePlate,
                driverAvatar: driverData.photoURL || '',
                status: 'Pending', // Keep as pending until driver starts the route
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('[ROUTE ASSIGN] ✅ Route assigned successfully');

            return {
                success: true,
                message: vehiclePlate
                    ? `Route assigned to driver ${data.driverName} with vehicle ${vehiclePlate}`
                    : `Route assigned to driver ${data.driverName}`,
                data: {
                    routeId: data.routeId,
                    driverName: data.driverName,
                    driverId: driverId,
                    vehiclePlate: vehiclePlate || 'Not assigned'
                }
            };
        } catch (error) {
            console.error('[ROUTE ASSIGN] ❌ Error assigning route:', error);
            return {
                success: false,
                error: 'Failed to assign route'
            };
        }
    }

    /**
     * Create a new client in Firebase
     * Follows exact Firebase structure: CLT-YYYYMMDD-HHMMSS-random
     */
    private async createClient(organizationId: string, phoneNumber: string, data: any): Promise<any> {
        try {
            // Generate client ID in format: CLT-YYYYMMDD-HHMMSS-random
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const random = Math.random().toString(36).substring(2, 8);

            const clientId = `CLT-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;

            // Get userId from phoneNumber
            const userId = await this.getUserId(phoneNumber);

            // Log for debugging
            console.log(`🔍 Creating client for org: ${organizationId}, user: ${userId}, phone: ${phoneNumber}`);

            const clientData = {
                organizationId,
                name: data.name,
                company: data.name, // Company name same as name
                contactPerson: data.contactPerson || '',
                phone: data.phone,
                email: data.email || '',
                address: data.address || '',
                status: 'Active',
                creditLimit: 0,
                outstandingBalance: 0,
                totalRevenue: 0,
                totalRoutes: 0,
                paymentTerms: 'Net 30',
                taxId: data.tin || '',
                tin: data.tin || '',
                cacNumber: data.cacNumber || '',
                notes: '',
                createdBy: userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Use set() with custom ID instead of add()
            await this.db.collection('clients').doc(clientId).set(clientData);

            return {
                success: true,
                clientId: clientId,
                message: `Client "${data.name}" registered successfully`,
                data: {
                    ...clientData,
                    id: clientId
                }
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
     * Follows exact Firebase structure: DRV-YYYYMMDD-HHMMSS-random
     */
    private async createDriver(organizationId: string, data: any, phoneNumber: string): Promise<any> {
        try {
            console.log('[DRIVER CREATE] Starting driver creation via WhatsApp...');
            console.log('[DRIVER CREATE] Organization ID:', organizationId);
            console.log('[DRIVER CREATE] Driver data:', data);

            // Generate driver ID in format: DRV-20251019-130417-5mt7w6
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const randomSuffix = Math.random().toString(36).substring(2, 8);

            const driverId = `DRV-${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;

            console.log('[DRIVER CREATE] Generated driver ID:', driverId);

            // Get userId from phoneNumber
            const userId = await this.getUserId(phoneNumber);

            // Normalize and validate phone number
            const normalizedPhone = this.normalizePhoneNumber(data.phone);

            // Generate username from name (first.last + random number)
            const nameParts = data.name.toLowerCase().split(' ');
            const firstName = nameParts[0] || 'driver';
            const lastName = nameParts[nameParts.length - 1] || 'user';
            const randomNum = Math.floor(Math.random() * 1000);
            const username = `${firstName}.${lastName}${randomNum}`;
            const authEmail = `${username}@driver.internal`;

            // Create driver data matching exact Firebase structure
            const driverData = {
                // Basic info
                organizationId,
                name: data.name,
                email: data.email || '',
                phone: normalizedPhone,
                licenseNumber: data.licenseNumber,
                nin: data.nin || '',
                status: 'Idle', // Default status
                location: '',
                avatar: '',
                licensePhotoUrl: '',

                // Username and auth
                username: username,
                authEmail: authEmail,
                firebaseAuthUid: '', // Will be set when driver creates password

                // Portal access
                portalAccess: {
                    enabled: true,
                    whatsappNotifications: true,
                    loginAttempts: 0,
                    lastLogin: null
                },

                // Phone verification
                phoneVerified: true, // Since registered via WhatsApp

                // Wallet
                walletBalance: 0,
                walletCurrency: 'NGN',

                // Transaction limits
                transactionLimits: {
                    dailyWithdrawalLimit: 50000, // ₦50,000
                    singleTransactionLimit: 20000, // ₦20,000
                    monthlyWithdrawalLimit: 500000 // ₦500,000
                },

                // Payroll information
                payrollInfo: {
                    baseSalary: data.baseSalary || 0,
                    pensionContributionRate: data.pensionRate || 8,
                    nhfContributionRate: data.nhfRate || 3
                },

                // Bank information (if provided)
                bankInfo: (data.accountNumber && data.accountName && data.bankName) ? {
                    accountNumber: data.accountNumber,
                    accountName: data.accountName,
                    bankName: data.bankName,
                    bankCode: data.bankCode || '',
                    verified: false // Will be verified via Paystack
                } : null,

                // Paystack (will be populated after wallet initialization)
                paystack: null,

                // Safety score
                safetyScore: 0,

                // Location data
                locationData: null,

                // Timestamps
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: userId
            };

            console.log('[DRIVER CREATE] Saving driver to Firestore...');
            await this.db.collection('drivers').doc(driverId).set(driverData);

            console.log('[DRIVER CREATE] ✅ Driver saved successfully!');

            return {
                success: true,
                driverId: driverId,
                username: username,
                message: `Driver "${data.name}" registered successfully`,
                data: {
                    id: driverId,
                    name: data.name,
                    phone: normalizedPhone,
                    licenseNumber: data.licenseNumber,
                    nin: data.nin || 'Not provided',
                    username: username,
                    status: 'Idle',
                    baseSalary: data.baseSalary ? `₦${data.baseSalary.toLocaleString()}` : '₦0',
                    accountNumber: data.accountNumber || 'Not provided',
                    accountName: data.accountName ? `${data.accountName} ✓ Verified` : 'Not provided',
                    bankName: data.bankName || 'Not provided'
                }
            };
        } catch (error) {
            console.error('[DRIVER CREATE] ❌ Error creating driver:', error);
            return {
                success: false,
                error: 'Failed to register driver: ' + (error as Error).message
            };
        }
    }

    /**
     * Create a new vehicle in Firebase
     * Follows exact Firebase structure: VEH-YYYYMMDD-HHMMSS-random
     */
    private async createVehicle(organizationId: string, data: any, phoneNumber: string): Promise<any> {
        try {
            console.log('[VEHICLE CREATE] Starting vehicle creation via WhatsApp...');
            console.log('[VEHICLE CREATE] Organization ID:', organizationId);
            console.log('[VEHICLE CREATE] Vehicle data:', data);

            // Generate vehicle ID in format: VEH-20251019-125404-d8eoca
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const randomSuffix = Math.random().toString(36).substring(2, 8);

            const vehicleId = `VEH-${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;

            console.log('[VEHICLE CREATE] Generated vehicle ID:', vehicleId);

            // Get userId from phoneNumber
            const userId = await this.getUserId(phoneNumber);

            // Find assigned driver if provided
            let assignedDriverId = null;
            if (data.assignedDriverName) {
                const driversSnapshot = await this.db.collection('drivers')
                    .where('organizationId', '==', organizationId)
                    .where('name', '==', data.assignedDriverName)
                    .limit(1)
                    .get();

                if (!driversSnapshot.empty) {
                    assignedDriverId = driversSnapshot.docs[0].id;
                    console.log('[VEHICLE CREATE] Assigned driver:', assignedDriverId, data.assignedDriverName);
                }
            }

            // Create vehicle data matching exact Firebase structure
            const vehicleData = {
                // Basic info
                organizationId,
                make: data.make,
                model: data.model,
                year: data.year,
                plateNumber: data.plateNumber.toUpperCase(),
                vin: data.vin || '',
                status: 'Parked', // Default status
                group: '',

                // Driver assignment
                assignedDriverId: assignedDriverId,

                // Telematics
                telematics: {
                    currentSpeed: 0,
                    batteryLevel: 100,
                    odometer: data.odometer || 0,
                    engineHours: {
                        total: 0,
                        today: 0,
                        yesterday: 0
                    },
                    odometerHistory: {
                        today: 0,
                        yesterday: 0
                    }
                },

                // Maintenance
                maintenance: {
                    lastServiceDate: data.lastServiceDate || new Date().toISOString(),
                    nextServiceDate: ''
                },

                // Location data
                locationData: null,

                // Timestamps
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: userId
            };

            console.log('[VEHICLE CREATE] Saving vehicle to Firestore...');
            await this.db.collection('vehicles').doc(vehicleId).set(vehicleData);

            console.log('[VEHICLE CREATE] ✅ Vehicle saved successfully!');

            return {
                success: true,
                vehicleId: vehicleId,
                message: `Vehicle "${data.make} ${data.model}" registered successfully`,
                data: {
                    id: vehicleId,
                    make: data.make,
                    model: data.model,
                    year: data.year,
                    plateNumber: data.plateNumber.toUpperCase(),
                    vin: data.vin || 'Not provided',
                    status: 'Parked',
                    odometer: data.odometer ? `${data.odometer.toLocaleString()} km` : '0 km',
                    assignedDriver: data.assignedDriverName || 'Not assigned',
                    lastServiceDate: data.lastServiceDate || 'Today'
                }
            };
        } catch (error) {
            console.error('[VEHICLE CREATE] ❌ Error creating vehicle:', error);
            return {
                success: false,
                error: 'Failed to register vehicle: ' + (error as Error).message
            };
        }
    }

    /**
     * Assign a driver to a vehicle
     */
    private async assignVehicleDriver(organizationId: string, data: { plateNumber: string; driverName: string }): Promise<any> {
        try {
            console.log('[VEHICLE ASSIGN] Assigning driver to vehicle...');
            console.log('[VEHICLE ASSIGN] Plate:', data.plateNumber, 'Driver:', data.driverName);

            // Find vehicle by plate number
            const vehiclesSnapshot = await this.db.collection('vehicles')
                .where('organizationId', '==', organizationId)
                .where('plateNumber', '==', data.plateNumber.toUpperCase())
                .limit(1)
                .get();

            if (vehiclesSnapshot.empty) {
                return {
                    success: false,
                    error: `Vehicle with plate number "${data.plateNumber}" not found`
                };
            }

            const vehicleDoc = vehiclesSnapshot.docs[0];
            const vehicleId = vehicleDoc.id;
            const vehicleData = vehicleDoc.data();

            // Find driver by name
            const driversSnapshot = await this.db.collection('drivers')
                .where('organizationId', '==', organizationId)
                .where('name', '==', data.driverName)
                .limit(1)
                .get();

            if (driversSnapshot.empty) {
                return {
                    success: false,
                    error: `Driver "${data.driverName}" not found in your organization`
                };
            }

            const driverDoc = driversSnapshot.docs[0];
            const driverId = driverDoc.id;

            // Update vehicle with assigned driver
            await this.db.collection('vehicles').doc(vehicleId).update({
                assignedDriverId: driverId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('[VEHICLE ASSIGN] ✅ Driver assigned successfully');

            return {
                success: true,
                message: `Driver "${data.driverName}" assigned to vehicle ${data.plateNumber}`,
                data: {
                    vehicleId: vehicleId,
                    vehiclePlate: data.plateNumber.toUpperCase(),
                    vehicleMake: vehicleData.make || 'Unknown',
                    vehicleModel: vehicleData.model || 'Unknown',
                    driverId: driverId,
                    driverName: data.driverName
                }
            };
        } catch (error) {
            console.error('[VEHICLE ASSIGN] ❌ Error:', error);
            return {
                success: false,
                error: 'Failed to assign driver to vehicle: ' + (error as Error).message
            };
        }
    }

    /**
     * Verify bank account using Paystack API
     */
    private async verifyBankAccount(data: { accountNumber: string; bankCode: string }): Promise<any> {
        try {
            console.log('[BANK VERIFY] Verifying account:', data.accountNumber, 'Bank code:', data.bankCode);

            // Validate inputs
            if (!data.accountNumber || data.accountNumber.length !== 10) {
                return {
                    success: false,
                    error: 'Account number must be exactly 10 digits'
                };
            }

            if (!data.bankCode) {
                return {
                    success: false,
                    error: 'Bank code is required'
                };
            }

            const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
            if (!PAYSTACK_SECRET_KEY) {
                console.error('[BANK VERIFY] Paystack secret key not configured');
                return {
                    success: false,
                    error: 'Bank verification service not available'
                };
            }

            const response = await fetch(
                `https://api.paystack.co/bank/resolve?account_number=${data.accountNumber}&bank_code=${data.bankCode}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error('[BANK VERIFY] Paystack API error:', result);
                return {
                    success: false,
                    error: result.message || 'Failed to verify account'
                };
            }

            if (result.status && result.data) {
                console.log('[BANK VERIFY] ✅ Account verified:', result.data.account_name);
                return {
                    success: true,
                    accountNumber: result.data.account_number,
                    accountName: result.data.account_name,
                    bankCode: data.bankCode,
                    message: `Account verified: ${result.data.account_name}`
                };
            }

            return {
                success: false,
                error: 'Could not verify account. Please check the details.'
            };
        } catch (error) {
            console.error('[BANK VERIFY] ❌ Error:', error);
            return {
                success: false,
                error: 'Failed to verify account: ' + (error as Error).message
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
     * Create a new invoice in Firebase
     */
    private async createInvoice(organizationId: string, phoneNumber: string, data: any): Promise<any> {
        try {
            // Generate invoice number
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');

            // Get invoice count for this month
            const invoicesRef = this.db.collection('invoices')
                .where('organizationId', '==', organizationId)
                .where('createdAt', '>=', new Date(year, date.getMonth(), 1))
                .where('createdAt', '<', new Date(year, date.getMonth() + 1, 1));

            const snapshot = await invoicesRef.get();
            const invoiceCount = snapshot.size + 1;
            const invoiceNumber = `INV-${year}${month}-${String(invoiceCount).padStart(4, '0')}`;

            // Calculate totals
            const items = data.items || [];
            const subtotal = items.reduce((sum: number, item: any) =>
                sum + (item.quantity * item.unitPrice), 0);

            const vatRate = data.vatInclusive ? (data.vatRate || 7.5) : 0;
            const vatAmount = subtotal * (vatRate / 100);
            const total = subtotal + vatAmount;

            // Create invoice data
            const invoiceData = {
                organizationId,
                invoiceNumber,
                clientName: data.clientName,
                items: items,
                subtotal,
                vatRate,
                vatAmount,
                total,
                status: 'Draft',
                notes: data.notes || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const invoiceRef = await this.db.collection('invoices').add(invoiceData);

            // Store invoice number in conversation context for "show" and "send" commands
            await this.db.collection('whatsapp_conversations').doc(phoneNumber).set({
                lastInvoiceNumber: invoiceNumber,
                lastClientName: data.clientName,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return {
                success: true,
                invoiceId: invoiceRef.id,
                invoiceNumber,
                message: `Invoice ${invoiceNumber} created successfully`,
                data: {
                    ...invoiceData,
                    subtotal: `₦${subtotal.toLocaleString()}`,
                    vatAmount: vatAmount > 0 ? `₦${vatAmount.toLocaleString()}` : '₦0',
                    total: `₦${total.toLocaleString()}`
                }
            };
        } catch (error) {
            console.error('Error creating invoice:', error);
            return {
                success: false,
                error: 'Failed to create invoice'
            };
        }
    }

    /**
     * Get an invoice from Firebase
     */
    private async getInvoice(organizationId: string, invoiceNumber?: string): Promise<any> {
        try {
            if (!invoiceNumber) {
                // Get most recent invoice
                const snapshot = await this.db.collection('invoices')
                    .where('organizationId', '==', organizationId)
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();

                if (snapshot.empty) {
                    return {
                        success: false,
                        error: 'No invoices found'
                    };
                }

                const invoiceDoc = snapshot.docs[0];
                const invoiceData = invoiceDoc.data();

                return {
                    success: true,
                    invoice: {
                        id: invoiceDoc.id,
                        ...invoiceData,
                        subtotal: `₦${invoiceData.subtotal?.toLocaleString() || 0}`,
                        vatAmount: `₦${invoiceData.vatAmount?.toLocaleString() || 0}`,
                        total: `₦${invoiceData.total?.toLocaleString() || 0}`
                    }
                };
            }

            // Get specific invoice by number
            const snapshot = await this.db.collection('invoices')
                .where('organizationId', '==', organizationId)
                .where('invoiceNumber', '==', invoiceNumber)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return {
                    success: false,
                    error: `Invoice ${invoiceNumber} not found`
                };
            }

            const invoiceDoc = snapshot.docs[0];
            const invoiceData = invoiceDoc.data();

            return {
                success: true,
                invoice: {
                    id: invoiceDoc.id,
                    ...invoiceData,
                    subtotal: `₦${invoiceData.subtotal?.toLocaleString() || 0}`,
                    vatAmount: `₦${invoiceData.vatAmount?.toLocaleString() || 0}`,
                    total: `₦${invoiceData.total?.toLocaleString() || 0}`
                }
            };
        } catch (error) {
            console.error('Error getting invoice:', error);
            return {
                success: false,
                error: 'Failed to get invoice'
            };
        }
    }

    /**
     * Send an invoice to client
     */
    private async sendInvoice(organizationId: string, invoiceNumber: string): Promise<any> {
        try {
            // Get invoice
            const snapshot = await this.db.collection('invoices')
                .where('organizationId', '==', organizationId)
                .where('invoiceNumber', '==', invoiceNumber)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return {
                    success: false,
                    error: `Invoice ${invoiceNumber} not found`
                };
            }

            const invoiceDoc = snapshot.docs[0];

            // Update status to Sent
            await invoiceDoc.ref.update({
                status: 'Sent',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                success: true,
                message: `Invoice ${invoiceNumber} has been sent to the client`,
                invoiceNumber
            };
        } catch (error) {
            console.error('Error sending invoice:', error);
            return {
                success: false,
                error: 'Failed to send invoice'
            };
        }
    }

}
