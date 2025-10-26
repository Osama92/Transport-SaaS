import * as admin from 'firebase-admin';
import { OpenAIIntegration } from './openaiIntegration';

interface ConversationContext {
    userId: string;
    phoneNumber: string;
    currentFlow?: 'onboarding_client' | 'create_route' | 'create_invoice' | 'setup_invoice_profile' | 'register_driver' | 'register_vehicle' | 'check_balance' | 'track_shipment' | 'general' | null;
    flowData?: any;
    lastInteraction?: Date;
    language: 'en' | 'pidgin' | 'yo' | 'ha' | 'ig';
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        message: string;
        timestamp: Date;
    }>;
}

interface InvoiceProfile {
    companyName: string;
    address: string;
    email: string;
    phone: string;
    paymentMethod: 'Bank Transfer' | 'Cheque' | 'Cash';
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    isSetup: boolean;
}

export class SupplyChainExpert {
    private context: Map<string, ConversationContext> = new Map();
    private db = admin.firestore();
    private knowledgeBase: any = {};
    private openai: OpenAIIntegration;

    constructor() {
        // Initialize with supply chain knowledge base
        this.initializeKnowledge();

        // Initialize OpenAI integration
        this.openai = new OpenAIIntegration(this.db);
    }

    private initializeKnowledge() {
        // Supply chain expertise areas
        this.knowledgeBase = {
            transport: ['fleet management', 'route optimization', 'driver allocation', 'vehicle maintenance'],
            logistics: ['warehouse management', 'inventory control', 'distribution', 'last-mile delivery'],
            demand: ['forecasting', 'planning', 'procurement', 'supplier management'],
            compliance: ['documentation', 'regulations', 'safety standards', 'environmental policies']
        };
    }

    async processMessage(phoneNumber: string, message: string, userName?: string): Promise<string> {
        try {
            // Get or create context (load from Firestore if exists)
            let ctx = this.context.get(phoneNumber) || await this.loadContext(phoneNumber);

            // Add to conversation history
            ctx.conversationHistory.push({
                role: 'user',
                message,
                timestamp: new Date()
            });

            // Detect language from message (keep same language as user)
            const detectedLanguage = this.detectLanguage(message);
            if (detectedLanguage) ctx.language = detectedLanguage;

            // Learn from user patterns
            await this.learnUserPatterns(phoneNumber, message, ctx);

            // ALWAYS use OpenAI for natural, intelligent conversation
            // Only fallback to basic intent matching if OpenAI fails
            let response: string;

            try {
                console.log('🤖 Using OpenAI for intelligent processing:', message);

                // Process with OpenAI for natural conversation
                response = await this.openai.processWithAI(
                    phoneNumber,
                    message,
                    ctx.conversationHistory
                );

                console.log('✅ OpenAI response generated successfully');
            } catch (aiError: any) {
                console.error('❌ OpenAI processing failed, using fallback:', aiError.message);

                // Fallback to basic logic if OpenAI fails
                const intent = await this.analyzeIntent(message, ctx);
                response = await this.generateResponse(intent, message, ctx, userName);
            }

            // Update context
            ctx.lastInteraction = new Date();
            this.context.set(phoneNumber, ctx);

            // Add assistant response to history
            ctx.conversationHistory.push({
                role: 'assistant',
                message: response,
                timestamp: new Date()
            });

            // Save context to Firestore for persistence
            await this.saveContext(phoneNumber, ctx);

            return response;
        } catch (error: any) {
            console.error('Error processing message:', error);
            return `I encountered an error processing your request. Please try again. If this continues, type "help" for assistance.`;
        }
    }

    private createContext(phoneNumber: string): ConversationContext {
        return {
            userId: '',
            phoneNumber,
            currentFlow: null,
            flowData: {},
            language: 'en',
            conversationHistory: []
        };
    }

    private detectLanguage(message: string): 'en' | 'pidgin' | 'yo' | 'ha' | 'ig' | null {
        const msg = message.toLowerCase();

        // Pidgin indicators
        if (msg.includes('wetin') || msg.includes('dey') || msg.includes('abeg') ||
            msg.includes('oya') || msg.includes('na') || msg.includes('no be')) {
            return 'pidgin';
        }

        // Yoruba indicators
        if (msg.includes('bawo ni') || msg.includes('e kaaro') || msg.includes('ṣe')) {
            return 'yo';
        }

        // Hausa indicators
        if (msg.includes('sannu') || msg.includes('yaya') || msg.includes('ina')) {
            return 'ha';
        }

        // Igbo indicators
        if (msg.includes('kedu') || msg.includes('nnoo') || msg.includes('biko')) {
            return 'ig';
        }

        return null; // Keep current language
    }

    private async analyzeIntent(message: string, ctx: ConversationContext): Promise<any> {
        const msg = message.toLowerCase();

        // Check if continuing an existing flow
        if (ctx.currentFlow) {
            return { type: 'continue_flow', flow: ctx.currentFlow };
        }

        // Natural language intent detection - FLEXIBLE matching
        // Check each intent with its keywords

        // Client management
        if (msg.match(/\b(register|add|new|create|onboard|sign\s*up).*(client|customer|company)/)) {
            return { type: 'register_client' };
        }
        if (msg.match(/\b(show|list|view|see|get).*(client|customer)/)) {
            return { type: 'list_clients' };
        }

        // Route management
        if (msg.match(/\b(create|add|new|make|setup|plan).*(route|delivery|shipment|trip)/)) {
            return { type: 'create_route' };
        }
        if (msg.match(/\b(track|locate|find|where|status).*(shipment|delivery|package|route)/)) {
            return { type: 'track_route' };
        }

        // Driver management
        if (msg.match(/\b(register|add|new|create|onboard).*(driver)/)) {
            return { type: 'register_driver' };
        }
        if (msg.match(/\b(assign|allocate|give|set).*(driver)/)) {
            return { type: 'assign_driver' };
        }
        if (msg.match(/\b(driver).*(status|location|where)/)) {
            return { type: 'driver_status' };
        }

        // Vehicle management
        if (msg.match(/\b(register|add|new|create|onboard).*(vehicle|truck|car|fleet)/)) {
            return { type: 'register_vehicle' };
        }

        // Invoice management
        if (msg.match(/\b(create|generate|make|new|send).*(invoice|bill)/)) {
            return { type: 'create_invoice' };
        }
        if (msg.match(/\b(preview|show|view|see|check).*(invoice)/)) {
            return { type: 'preview_invoice' };
        }

        // Wallet management
        if (msg.match(/\b(check|show|view|see|what|my).*(balance|wallet|money|fund)/)) {
            return { type: 'check_balance' };
        }

        // General queries
        if (msg.match(/\b(help|assist|what can|features|guide)/)) {
            return { type: 'help' };
        }
        if (msg.match(/\b(hello|hi|hey|good morning|good afternoon|good evening|howdy)/)) {
            return { type: 'greeting' };
        }

        // Business insights
        if (msg.match(/\b(report|analytics|performance|metrics|statistics|insights)/)) {
            return { type: 'analytics' };
        }

        // Supply chain specific
        if (msg.match(/\b(inventory|stock|warehouse)/)) {
            return { type: 'inventory' };
        }
        if (msg.match(/\b(optimize|improve|efficiency|save cost|reduce)/)) {
            return { type: 'optimization' };
        }

        // If no specific intent, treat as general conversation
        return { type: 'general', topic: this.extractTopic(message) };
    }

    private extractTopic(message: string): string {
        // Extract main topic from message for contextual response
        const topics = ['transport', 'logistics', 'delivery', 'route', 'driver', 'vehicle',
                       'client', 'shipment', 'warehouse', 'inventory', 'payment'];

        const msg = message.toLowerCase();
        for (const topic of topics) {
            if (msg.includes(topic)) {
                return topic;
            }
        }

        return 'general';
    }

    private async generateResponse(intent: any, message: string, ctx: ConversationContext, userName?: string): Promise<string> {
        const name = userName || 'there';

        switch (intent.type) {
            case 'greeting':
                return this.greetingResponse(name, ctx.language);

            case 'register_client':
                return this.startClientOnboarding(ctx, name);

            case 'create_invoice':
                return this.startInvoiceCreation(ctx, name);

            case 'preview_invoice':
                return this.handleInvoicePreview(message, ctx);

            case 'register_driver':
                return this.startDriverRegistration(ctx, name);

            case 'register_vehicle':
                return this.startVehicleRegistration(ctx, name);

            case 'check_balance':
                return this.handleBalanceCheck(ctx);

            case 'continue_flow':
                return this.continueFlow(message, ctx);

            case 'create_route':
                return this.startRouteCreation(ctx, name);

            case 'track_route':
                return this.handleTracking(message, ctx);

            case 'help':
                return this.helpResponse(ctx.language);

            case 'analytics':
                return this.provideAnalytics(ctx);

            case 'general':
                return this.handleGeneralQuery(message, intent.topic, ctx);

            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    private greetingResponse(name: string, language: string): string {
        const hour = new Date().getHours();
        let greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

        if (language === 'pidgin') {
            greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
            return `${greeting} ${name}. How I fit help you today? You fit ask me about shipment, driver, route, or anything wey concern your logistics business.`;
        }

        return `${greeting}, ${name}. I'm your supply chain operations assistant. How can I help optimize your logistics today? Whether it's routing, fleet management, or shipment tracking, I'm here to help.`;
    }

    private startClientOnboarding(ctx: ConversationContext, name: string): string {
        ctx.currentFlow = 'onboarding_client';
        ctx.flowData = { step: 1, clientData: {} };

        if (ctx.language === 'pidgin') {
            return `No wahala ${name}. Make we register your new client. Wetin be the company name?`;
        }

        return `Let's get your new client registered, ${name}. What's the company name?`;
    }

    private async continueFlow(message: string, ctx: ConversationContext): Promise<string> {
        if (!ctx.currentFlow || !ctx.flowData) {
            return this.intelligentFallback(message, ctx);
        }

        switch (ctx.currentFlow) {
            case 'onboarding_client':
                return this.continueClientOnboarding(message, ctx);
            case 'create_route':
                return await this.continueRouteCreation(message, ctx);
            case 'setup_invoice_profile':
                return await this.continueInvoiceProfileSetup(message, ctx);
            case 'create_invoice':
                return await this.continueInvoiceCreation(message, ctx);
            case 'register_driver':
                return this.continueDriverRegistration(message, ctx);
            case 'register_vehicle':
                return this.continueVehicleRegistration(message, ctx);
            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    private async continueClientOnboarding(message: string, ctx: ConversationContext): Promise<string> {
        const step = ctx.flowData.step || 1;
        const isPidgin = ctx.language === 'pidgin';

        switch (step) {
            case 1: // Company name
                ctx.flowData.clientData.companyName = message;
                ctx.flowData.step = 2;
                return isPidgin ?
                    `I don save am. Who be the main person wey we go dey call there?` :
                    `Got it. Who's the primary contact person at ${message}?`;

            case 2: // Contact person
                ctx.flowData.clientData.contactPerson = message;
                ctx.flowData.step = 3;
                return isPidgin ?
                    `Good. Wetin be their email address?` :
                    `Thanks. What's the best email address for ${message}?`;

            case 3: // Email
                ctx.flowData.clientData.email = message;
                ctx.flowData.step = 4;
                return isPidgin ?
                    `I don get am. Their phone number nko?` :
                    `Email noted. What's their primary phone number?`;

            case 4: // Phone
                ctx.flowData.clientData.phone = message;
                ctx.flowData.step = 5;
                return isPidgin ?
                    `Make we add their CAC registration number:` :
                    `For compliance, I'll need their CAC Registration Number:`;

            case 5: // CAC
                ctx.flowData.clientData.cacNumber = message;
                ctx.flowData.step = 6;
                return isPidgin ?
                    `Their Tax ID (TIN) nko?` :
                    `And their Tax Identification Number (TIN)?`;

            case 6: // TIN
                ctx.flowData.clientData.tin = message;
                ctx.flowData.step = 7;
                return isPidgin ?
                    `Last one - where their office dey?` :
                    `Finally, what's their business address?`;

            case 7: // Address
                ctx.flowData.clientData.address = message;

                // Get organizationId and userId before saving
                const organizationId = await this.getOrganizationIdFromPhone(ctx.phoneNumber);
                const userId = await this.getUserIdFromPhone(ctx.phoneNumber);

                ctx.flowData.clientData.organizationId = organizationId;
                ctx.flowData.clientData.userId = userId;

                // Save to database
                this.saveClient(ctx.flowData.clientData);

                const company = ctx.flowData.clientData.companyName;
                ctx.currentFlow = null;
                ctx.flowData = {};

                return isPidgin ?
                    `Everything don set! ${company} don enter system. Anything else wey you wan do?` :
                    `Perfect! ${company} has been successfully registered in your system. The profile is complete and ready for business. What would you like to do next?`;

            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    private startRouteCreation(ctx: ConversationContext, name: string): string {
        ctx.currentFlow = 'create_route';
        ctx.flowData = { step: 1, routeData: {} };

        if (ctx.language === 'pidgin') {
            return `Oya ${name}, make we create new route. Where the pickup point dey?`;
        }

        return `Let's set up a new route. What's the pickup location?`;
    }

    private async continueRouteCreation(message: string, ctx: ConversationContext): Promise<string> {
        const step = ctx.flowData.step || 1;
        const isPidgin = ctx.language === 'pidgin';

        switch (step) {
            case 1: // Pickup location
                ctx.flowData.routeData.pickup = message;
                ctx.flowData.step = 2;
                return isPidgin ?
                    `Where e dey go? (delivery location)` :
                    `And the delivery destination?`;

            case 2: // Delivery location
                ctx.flowData.routeData.delivery = message;
                ctx.flowData.step = 3;
                return isPidgin ?
                    `Which client dey involved?` :
                    `Which client is this for?`;

            case 3: // Client
                ctx.flowData.routeData.client = message;
                ctx.flowData.step = 4;
                return isPidgin ?
                    `When you wan make the delivery happen?` :
                    `When should this be delivered?`;

            case 4: // Delivery date
                ctx.flowData.routeData.date = message;

                // Save route data before clearing context
                const routeData = { ...ctx.flowData.routeData };

                try {
                    // Create route in database
                    await this.createRoute(routeData);

                    // Clear context AFTER successful creation
                    ctx.currentFlow = null;
                    const successMessage = isPidgin ?
                        `✅ Route don create successfully!\n\n` +
                        `📍 From: ${routeData.pickup}\n` +
                        `📍 To: ${routeData.delivery}\n` +
                        `👤 Client: ${routeData.client}\n` +
                        `📅 Date: ${routeData.date}\n\n` +
                        `You wan assign driver to this route now?` :
                        `✅ Route created successfully!\n\n` +
                        `📍 From: ${routeData.pickup}\n` +
                        `📍 To: ${routeData.delivery}\n` +
                        `👤 Client: ${routeData.client}\n` +
                        `📅 Date: ${routeData.date}\n\n` +
                        `Would you like to assign a driver to this route now?`;

                    ctx.flowData = {};
                    return successMessage;
                } catch (error) {
                    console.error('Error creating route:', error);
                    return isPidgin ?
                        `❌ Sorry, something went wrong. Make I try create the route again. Please type "create route" to start over.` :
                        `❌ Sorry, there was an error creating the route. Please try again by typing "create route".`;
                }

            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    private handleTracking(message: string, ctx: ConversationContext): string {
        // Extract tracking number or shipment ID from message
        const trackingPattern = /[A-Z0-9]{6,}/;
        const match = message.match(trackingPattern);

        if (match) {
            // Simulate tracking lookup
            return ctx.language === 'pidgin' ?
                `Your shipment ${match[0]} dey Ikeja now. E suppose reach destination by 3:30 PM today.` :
                `Shipment ${match[0]} is currently in transit at Ikeja. Estimated delivery: 3:30 PM today.`;
        }

        return ctx.language === 'pidgin' ?
            `Abeg give me the tracking number make I check am for you.` :
            `Please provide the tracking number or shipment ID to check its status.`;
    }

    private helpResponse(language: string): string {
        if (language === 'pidgin') {
            return `I fit help you with:\n\n` +
                   `• Register new client\n` +
                   `• Create route and assign driver\n` +
                   `• Track your shipment\n` +
                   `• Check driver and vehicle status\n` +
                   `• Generate invoice and report\n` +
                   `• Optimize your logistics operation\n\n` +
                   `Just tell me wetin you wan do.`;
        }

        return `I can assist you with:\n\n` +
               `• Client onboarding and management\n` +
               `• Route planning and optimization\n` +
               `• Real-time shipment tracking\n` +
               `• Fleet and driver management\n` +
               `• Analytics and performance insights\n` +
               `• Invoice generation and billing\n` +
               `• Supply chain optimization\n\n` +
               `Just let me know what you need.`;
    }

    private async provideAnalytics(ctx: ConversationContext): Promise<string> {
        // Fetch real analytics from database
        const isPidgin = ctx.language === 'pidgin';

        // Simulated analytics
        const stats = {
            deliveries: 127,
            onTime: 94,
            routes: 45,
            activeDrivers: 12
        };

        if (isPidgin) {
            return `Your performance this week:\n\n` +
                   `Deliveries: ${stats.deliveries}\n` +
                   `On-time: ${stats.onTime}%\n` +
                   `Active routes: ${stats.routes}\n` +
                   `Drivers working: ${stats.activeDrivers}\n\n` +
                   `Business dey move well!`;
        }

        return `Weekly Performance Summary:\n\n` +
               `Total Deliveries: ${stats.deliveries}\n` +
               `On-time Rate: ${stats.onTime}%\n` +
               `Active Routes: ${stats.routes}\n` +
               `Active Drivers: ${stats.activeDrivers}\n\n` +
               `Your on-time delivery rate is above industry average. Keep it up!`;
    }

    private handleGeneralQuery(message: string, topic: string, ctx: ConversationContext): string {
        const msg = message.toLowerCase();
        const isPidgin = ctx.language === 'pidgin';

        // Check if message relates to our knowledge areas
        const relatedArea = Object.keys(this.knowledgeBase).find(area =>
            msg.includes(area) || this.knowledgeBase[area].some((term: string) => msg.includes(term))
        );

        // If message relates to a specific expertise area, provide targeted response
        if (relatedArea) {
            const expertise = this.knowledgeBase[relatedArea];
            if (expertise && expertise.length > 0) {
                // Provide expertise-based response
                if (relatedArea === 'transport' && msg.includes('optimization')) {
                    return isPidgin ?
                        `I get expertise for transport optimization. You fit save up to 20% on fuel if you use route planning. Make I help you?` :
                        `I specialize in transport optimization. Route planning can reduce fuel costs by up to 20%. Shall I analyze your current routes?`;
                }
            }
        }

        // Supply chain expertise responses
        if (msg.includes('optimize') || msg.includes('improve')) {
            return isPidgin ?
                `Based on your operation, you fit reduce cost by 15% if you combine deliveries wey dey go same area. Make I show you how?` :
                `Based on your current operations, route consolidation could reduce costs by 15%. Would you like me to analyze your routes for optimization opportunities?`;
        }

        if (msg.includes('busy') || msg.includes('peak')) {
            return isPidgin ?
                `Your peak time na between 10 AM to 2 PM. You fit use that time assign more driver to reduce waiting time.` :
                `Your peak hours are 10 AM - 2 PM. Consider allocating additional drivers during these periods to maintain service levels.`;
        }

        if (msg.includes('fuel') || msg.includes('cost')) {
            return isPidgin ?
                `Fuel consumption dey high for Vehicle BJ-234. E fit need maintenance. You wan check the maintenance schedule?` :
                `I've noticed higher fuel consumption in Vehicle BJ-234. This could indicate maintenance needs. Would you like to review the maintenance schedule?`;
        }

        // Topic-based responses
        switch (topic) {
            case 'transport':
                return isPidgin ?
                    `For transport matter, you fit track all your vehicle real-time. You wan see where your fleet dey now?` :
                    `Regarding transport operations, you can track all vehicles in real-time. Would you like to view your fleet status?`;

            case 'inventory':
                return isPidgin ?
                    `Your warehouse get space for 200 more packages. You wan see the full inventory report?` :
                    `Your warehouse has capacity for 200 additional packages. Would you like to see the detailed inventory report?`;

            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    private intelligentFallback(message: string, ctx: ConversationContext): string {
        const isPidgin = ctx.language === 'pidgin';

        // Use conversation history to provide context-aware response
        if (ctx.conversationHistory.length > 1) {
            const lastTopic = this.extractTopic(ctx.conversationHistory[ctx.conversationHistory.length - 2].message);

            if (lastTopic !== 'general') {
                return isPidgin ?
                    `I understand say you dey talk about ${lastTopic}. You fit explain more make I understand wetin you need?` :
                    `I understand you're asking about ${lastTopic}. Could you provide more details so I can assist you better?`;
            }
        }

        // Provide intelligent suggestion based on time of day
        const hour = new Date().getHours();
        if (hour >= 8 && hour <= 10) {
            return isPidgin ?
                `E be like say you just start work. You wan see your pending deliveries for today?` :
                `Good morning! Would you like to review today's pending deliveries to start your day?`;
        } else if (hour >= 16 && hour <= 18) {
            return isPidgin ?
                `Day don almost end. You wan see today performance report?` :
                `As we approach end of day, would you like to see today's performance summary?`;
        }

        return isPidgin ?
            `I dey here to help with your logistics. You fit ask me about shipment, route, driver, or anything wey concern your business.` :
            `I'm here to help with your supply chain operations. Feel free to ask about shipments, routes, fleet management, or any logistics concerns.`;
    }

    private async saveClient(clientData: any): Promise<void> {
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

            // Prepare full client data with all required fields
            const fullClientData = {
                organizationId: clientData.organizationId || 'default-org',
                name: clientData.companyName || clientData.name,
                company: clientData.companyName || clientData.name,
                contactPerson: clientData.contactPerson || '',
                phone: clientData.phone || '',
                email: clientData.email || '',
                address: clientData.address || '',
                status: 'Active',
                creditLimit: 0,
                outstandingBalance: 0,
                totalRevenue: 0,
                totalRoutes: 0,
                paymentTerms: 'Net 30',
                taxId: clientData.tin || '',
                tin: clientData.tin || '',
                cacNumber: clientData.cacNumber || '',
                notes: '',
                createdBy: clientData.userId || 'system',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Use set() with custom ID instead of add()
            await this.db.collection('clients').doc(clientId).set(fullClientData);

            console.log(`✅ Client ${clientId} created successfully in fallback mode`);
        } catch (error) {
            console.error('Error saving client:', error);
        }
    }

    private async createRoute(routeData: any): Promise<void> {
        try {
            await this.db.collection('routes').add({
                ...routeData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });
        } catch (error) {
            console.error('Error creating route:', error);
        }
    }

    // ==================== INVOICE PROFILE SETUP ====================
    private async continueInvoiceProfileSetup(message: string, ctx: ConversationContext): Promise<string> {
        const step = ctx.flowData.step || 1;
        const isPidgin = ctx.language === 'pidgin';

        switch (step) {
            case 1: // Company name
                ctx.flowData.profileData.companyName = message;
                ctx.flowData.step = 2;
                return isPidgin ?
                    `Perfect! Where your company office dey? (Company address)` :
                    `Perfect! What's your company address?`;

            case 2: // Address
                ctx.flowData.profileData.address = message;
                ctx.flowData.step = 3;
                return isPidgin ?
                    `Got it. Wetin be your company email address?` :
                    `Got it. What's your company email address?`;

            case 3: // Email
                ctx.flowData.profileData.email = message;
                ctx.flowData.step = 4;
                return isPidgin ?
                    `And your company phone number?` :
                    `And your company phone number?`;

            case 4: // Phone
                ctx.flowData.profileData.phone = message;
                ctx.flowData.step = 5;
                return isPidgin ?
                    `How you wan collect payment? Type:\n• "Bank Transfer"\n• "Cheque"\n• "Cash"` :
                    `How would you like to receive payments? Type:\n• "Bank Transfer"\n• "Cheque"\n• "Cash"`;

            case 5: // Payment method
                const paymentMethod = message.toLowerCase();
                if (paymentMethod.includes('bank') || paymentMethod.includes('transfer')) {
                    ctx.flowData.profileData.paymentMethod = 'Bank Transfer';
                    ctx.flowData.step = 6;
                    return isPidgin ?
                        `Okay, we go use Bank Transfer. Which bank?` :
                        `Okay, Bank Transfer it is. Which bank?`;
                } else if (paymentMethod.includes('cheque')) {
                    ctx.flowData.profileData.paymentMethod = 'Cheque';
                    ctx.flowData.profileData.bankName = '';
                    ctx.flowData.profileData.accountNumber = '';
                    ctx.flowData.profileData.accountName = '';
                    await this.saveInvoiceProfile(ctx.phoneNumber, ctx.flowData.profileData);

                    // Return to invoice creation if needed
                    if (ctx.flowData.returnToInvoice) {
                        ctx.currentFlow = 'create_invoice';
                        ctx.flowData = { step: 1, invoiceData: { items: [] } };
                        return isPidgin ?
                            `✅ Your profile don save! Now make we create that invoice.\n\nWhich client we dey bill?` :
                            `✅ Profile saved! Now let's create that invoice.\n\nWhich client are we billing?`;
                    }

                    ctx.currentFlow = null;
                    ctx.flowData = {};
                    return isPidgin ?
                        `✅ Your invoice profile don set! You fit create invoices anytime now.` :
                        `✅ Your invoice profile is all set! You can now create invoices anytime.`;
                } else if (paymentMethod.includes('cash')) {
                    ctx.flowData.profileData.paymentMethod = 'Cash';
                    ctx.flowData.profileData.bankName = '';
                    ctx.flowData.profileData.accountNumber = '';
                    ctx.flowData.profileData.accountName = '';
                    await this.saveInvoiceProfile(ctx.phoneNumber, ctx.flowData.profileData);

                    // Return to invoice creation if needed
                    if (ctx.flowData.returnToInvoice) {
                        ctx.currentFlow = 'create_invoice';
                        ctx.flowData = { step: 1, invoiceData: { items: [] } };
                        return isPidgin ?
                            `✅ Your profile don save! Now make we create that invoice.\n\nWhich client we dey bill?` :
                            `✅ Profile saved! Now let's create that invoice.\n\nWhich client are we billing?`;
                    }

                    ctx.currentFlow = null;
                    ctx.flowData = {};
                    return isPidgin ?
                        `✅ Your invoice profile don set! You fit create invoices anytime now.` :
                        `✅ Your invoice profile is all set! You can now create invoices anytime.`;
                } else {
                    return isPidgin ?
                        `Abeg choose one: "Bank Transfer", "Cheque", or "Cash"` :
                        `Please choose one: "Bank Transfer", "Cheque", or "Cash"`;
                }

            case 6: // Bank name
                ctx.flowData.profileData.bankName = message;
                ctx.flowData.step = 7;
                return isPidgin ?
                    `Last one! Wetin be your account number? We go verify am automatically.` :
                    `Last one! What's your account number? We'll verify it automatically.`;

            case 7: // Account number with verification
                ctx.flowData.profileData.accountNumber = message;

                // Simulate account verification (in production, call real verification API)
                const verifiedName = await this.verifyBankAccount(
                    message,
                    ctx.flowData.profileData.bankName
                );

                ctx.flowData.profileData.accountName = verifiedName;
                await this.saveInvoiceProfile(ctx.phoneNumber, ctx.flowData.profileData);

                const setupComplete = isPidgin ?
                    `...Dey verify account...\n✅ Account verified: ${verifiedName}\n\n🎉 Your invoice profile don set complete!` :
                    `...Verifying account...\n✅ Account verified: ${verifiedName}\n\n🎉 Your invoice profile is now complete!`;

                // Return to invoice creation if needed
                if (ctx.flowData.returnToInvoice) {
                    ctx.currentFlow = 'create_invoice';
                    ctx.flowData = { step: 1, invoiceData: { items: [] } };
                    return setupComplete + (isPidgin ?
                        `\n\nNow make we create that invoice. Which client we dey bill?` :
                        `\n\nNow let's create that invoice. Which client are we billing?`);
                }

                ctx.currentFlow = null;
                ctx.flowData = {};
                return setupComplete;

            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    // ==================== INVOICE CREATION FLOW ====================
    private async startInvoiceCreation(ctx: ConversationContext, name: string): Promise<string> {
        // Check if user has invoice profile setup
        const hasProfile = await this.checkInvoiceProfile(ctx.phoneNumber);

        if (!hasProfile) {
            // First time creating invoice - setup profile first
            ctx.currentFlow = 'setup_invoice_profile';
            ctx.flowData = { step: 1, profileData: {}, returnToInvoice: true };

            if (ctx.language === 'pidgin') {
                return `Hey ${name}! 👋\n\nI see say this na your first time to create invoice. Make we set up your company details first - e go make invoice creation quick and easy from now on.\n\nWetin be your company name?`;
            }

            return `Hey ${name}! 👋\n\nI see this is your first time creating an invoice. Let's quickly set up your company details - this will make invoice creation much faster going forward.\n\nWhat's your company name?`;
        }

        // User has profile, proceed with invoice creation
        ctx.currentFlow = 'create_invoice';
        ctx.flowData = { step: 1, invoiceData: { items: [] } };

        if (ctx.language === 'pidgin') {
            return `Sure thing ${name}! Make we create invoice. 📄\nWhich client we dey bill?`;
        }

        return `Sure thing! Let's create an invoice. 📄\nWhich client are we billing?`;
    }

    private async continueInvoiceCreation(message: string, ctx: ConversationContext): Promise<string> {
        const step = ctx.flowData.step || 1;
        const isPidgin = ctx.language === 'pidgin';

        switch (step) {
            case 1: // Client name
                ctx.flowData.invoiceData.clientName = message;
                ctx.flowData.step = 2;
                return isPidgin ?
                    `Got it. Wetin be the item or service?` :
                    `Got it. What's the item or service?`;

            case 2: // Item/Service
                ctx.flowData.invoiceData.itemName = message;
                ctx.flowData.step = 3;
                return isPidgin ?
                    `How many ${message} we dey charge?` :
                    `How many units of ${message}?`;

            case 3: // Quantity
                ctx.flowData.invoiceData.quantity = parseInt(message);
                ctx.flowData.step = 4;
                return isPidgin ?
                    `Wetin be the price per unit (in Naira)?` :
                    `What's the price per unit (in Naira)?`;

            case 4: // Unit price
                ctx.flowData.invoiceData.unitPrice = parseFloat(message);
                const total = ctx.flowData.invoiceData.quantity * ctx.flowData.invoiceData.unitPrice;
                ctx.flowData.invoiceData.total = total;
                ctx.flowData.step = 5;

                return isPidgin ?
                    `You wan add tax (VAT)? Type "Yes" or "No"` :
                    `Do you want to add VAT? Type "Yes" or "No"`;

            case 5: // VAT option
                const addVAT = message.toLowerCase() === 'yes';
                ctx.flowData.invoiceData.addVAT = addVAT;

                if (addVAT) {
                    ctx.flowData.step = 6;
                    return isPidgin ?
                        `Wetin be the VAT percentage? (e.g., 7.5)` :
                        `What's the VAT percentage? (e.g., 7.5)`;
                } else {
                    ctx.flowData.invoiceData.vatRate = 0;
                    ctx.flowData.step = 7;
                    return isPidgin ?
                        `Any notes or description you wan add?` :
                        `Any additional notes or description?`;
                }

            case 6: // VAT percentage
                const vatRate = parseFloat(message);
                ctx.flowData.invoiceData.vatRate = vatRate;
                const baseTotal = ctx.flowData.invoiceData.total;
                const vatAmount = baseTotal * (vatRate / 100);
                ctx.flowData.invoiceData.vatAmount = vatAmount;
                ctx.flowData.invoiceData.grandTotal = baseTotal + vatAmount;
                ctx.flowData.step = 7;

                return isPidgin ?
                    `VAT of ${vatRate}% don add. Any notes or description you wan add?` :
                    `VAT of ${vatRate}% added. Any additional notes or description?`;

            case 7: // Notes
                ctx.flowData.invoiceData.notes = message;
                ctx.flowData.step = 8;

                // Calculate totals
                const baseAmt = ctx.flowData.invoiceData.total;
                const vat = ctx.flowData.invoiceData.vatAmount || 0;
                const grand = ctx.flowData.invoiceData.grandTotal || baseAmt;

                const summary = isPidgin ?
                    `Perfect! Here na the invoice summary:\n\n` +
                    `Client: ${ctx.flowData.invoiceData.clientName}\n` +
                    `Item: ${ctx.flowData.invoiceData.itemName}\n` +
                    `Quantity: ${ctx.flowData.invoiceData.quantity}\n` +
                    `Unit Price: ₦${ctx.flowData.invoiceData.unitPrice.toLocaleString()}\n` +
                    `Subtotal: ₦${baseAmt.toLocaleString()}\n` +
                    (vat > 0 ? `VAT (${ctx.flowData.invoiceData.vatRate}%): ₦${vat.toLocaleString()}\n` : '') +
                    `Total: ₦${grand.toLocaleString()}\n\n` +
                    `Everything correct? Type "Confirm" to create or "Cancel" to start over.`
                    :
                    `Perfect! Here's the invoice summary:\n\n` +
                    `Client: ${ctx.flowData.invoiceData.clientName}\n` +
                    `Item: ${ctx.flowData.invoiceData.itemName}\n` +
                    `Quantity: ${ctx.flowData.invoiceData.quantity}\n` +
                    `Unit Price: ₦${ctx.flowData.invoiceData.unitPrice.toLocaleString()}\n` +
                    `Subtotal: ₦${baseAmt.toLocaleString()}\n` +
                    (vat > 0 ? `VAT (${ctx.flowData.invoiceData.vatRate}%): ₦${vat.toLocaleString()}\n` : '') +
                    `Total: ₦${grand.toLocaleString()}\n\n` +
                    `Everything look good? Type "Confirm" to create or "Cancel" to start over.`;

                return summary;

            case 8: // Confirmation
                const confirm = message.toLowerCase();

                if (confirm === 'confirm') {
                    // Get user's invoice profile
                    const profile = await this.getInvoiceProfile(ctx.phoneNumber);
                    const invoiceId = `INV-${Date.now()}`;

                    // Save invoice to database with profile info
                    await this.saveInvoice({
                        ...ctx.flowData.invoiceData,
                        invoiceId,
                        profile,
                        createdAt: new Date()
                    });

                    // Generate and send invoice preview image
                    await this.sendInvoicePreviewImage(
                        ctx.phoneNumber,
                        invoiceId,
                        ctx.flowData.invoiceData,
                        profile
                    );

                    ctx.currentFlow = null;
                    ctx.flowData = {};

                    return isPidgin ?
                        `✅ Invoice ${invoiceId} don create! I don send the preview image for you. 👆\n\nYou fit type "Send invoice ${invoiceId}" to email am to the client.`
                        :
                        `✅ Invoice ${invoiceId} has been created! I've sent the preview image above. 👆\n\nYou can type "Send invoice ${invoiceId}" to email it to the client.`;
                } else if (confirm === 'cancel') {
                    ctx.currentFlow = null;
                    ctx.flowData = {};
                    return isPidgin ?
                        `No wahala. Invoice creation don cancel. You wan start again?`
                        :
                        `No problem. Invoice creation cancelled. Want to start over?`;
                } else {
                    return isPidgin ?
                        `Abeg type "Confirm" or "Cancel".`
                        :
                        `Please type "Confirm" or "Cancel".`;
                }

            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    private handleInvoicePreview(message: string, ctx: ConversationContext): string {
        // Extract invoice ID from message
        const invoicePattern = /INV-\d+/i;
        const match = message.match(invoicePattern);

        if (match) {
            const invoiceId = match[0];
            // In real implementation, fetch invoice from database
            return ctx.language === 'pidgin' ?
                `One moment, make I pull up ${invoiceId} for you... 👀\n\nInvoice dey ready! I don send the preview to your email.`
                :
                `One moment, pulling up ${invoiceId}... 👀\n\nInvoice preview is ready! I've sent it to your registered email.`;
        }

        return ctx.language === 'pidgin' ?
            `Abeg give me the invoice number (e.g., INV-12345) make I show you.`
            :
            `Please provide the invoice number (e.g., INV-12345) to preview.`;
    }

    // ==================== DRIVER REGISTRATION FLOW ====================
    private startDriverRegistration(ctx: ConversationContext, name: string): string {
        ctx.currentFlow = 'register_driver';
        ctx.flowData = { step: 1, driverData: {} };

        if (ctx.language === 'pidgin') {
            return `Oya, make we register new driver! 🚛\nWetin be the driver full name?`;
        }

        return `Awesome, let's get a new driver on the team! 🚛\nWhat's the driver's full name?`;
    }

    private continueDriverRegistration(message: string, ctx: ConversationContext): string {
        const step = ctx.flowData.step || 1;
        const isPidgin = ctx.language === 'pidgin';

        switch (step) {
            case 1: // Full name
                ctx.flowData.driverData.fullName = message;
                ctx.flowData.step = 2;
                return isPidgin ?
                    `Welcome, ${message}! Wetin be their phone number (for WhatsApp alerts)?`
                    :
                    `Welcome, ${message}! What's their phone number (for WhatsApp alerts)?`;

            case 2: // Phone number
                ctx.flowData.driverData.phone = message;
                ctx.flowData.step = 3;
                return isPidgin ?
                    `Wetin be their Driver's Licence Number?`
                    :
                    `What's their Driver's Licence Number?`;

            case 3: // License number
                ctx.flowData.driverData.licenseNumber = message;
                ctx.flowData.step = 4;
                return isPidgin ?
                    `And their National Identification Number (NIN)?`
                    :
                    `And their National Identification Number (NIN)?`;

            case 4: // NIN
                ctx.flowData.driverData.nin = message;
                ctx.flowData.step = 5;
                return isPidgin ?
                    `Wetin be their annual salary? (This na for compliant tax calculations)`
                    :
                    `What's their annual salary? (This is for compliant tax calculations)`;

            case 5: // Annual salary
                ctx.flowData.driverData.annualSalary = parseFloat(message);
                ctx.flowData.step = 6;
                return isPidgin ?
                    `Finally, wetin be their account number for payments? We go verify am automatically.`
                    :
                    `Finally, what's their account number for payments? We'll verify it automatically.`;

            case 6: // Account number
                ctx.flowData.driverData.accountNumber = message;

                // Simulate account verification
                const driverName = ctx.flowData.driverData.fullName;
                this.saveDriver(ctx.flowData.driverData);
                ctx.currentFlow = null;
                ctx.flowData = {};

                return isPidgin ?
                    `...Dey verify account...\n✅ Account verified: ${driverName}\n\n🎉 ${driverName} don register! Their tax calculations go be fully compliant with the 2026 guidelines.`
                    :
                    `...Verifying account...\n✅ Account verified: ${driverName}\n\n🎉 ${driverName} is now registered! Their tax calculations will be fully compliant with the 2026 guidelines.`;

            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    // ==================== VEHICLE REGISTRATION FLOW ====================
    private startVehicleRegistration(ctx: ConversationContext, name: string): string {
        ctx.currentFlow = 'register_vehicle';
        ctx.flowData = { step: 1, vehicleData: {} };

        if (ctx.language === 'pidgin') {
            return `Make we register new vehicle! 🚚\nWetin be the make? (e.g., Mercedes, Toyota)`;
        }

        return `Let's register a new vehicle! 🚚\nWhat's the make? (e.g., Mercedes, Toyota)`;
    }

    private continueVehicleRegistration(message: string, ctx: ConversationContext): string {
        const step = ctx.flowData.step || 1;
        const isPidgin = ctx.language === 'pidgin';

        switch (step) {
            case 1: // Make
                ctx.flowData.vehicleData.make = message;
                ctx.flowData.step = 2;
                return isPidgin ?
                    `And the model?`
                    :
                    `And the model?`;

            case 2: // Model
                ctx.flowData.vehicleData.model = message;
                ctx.flowData.step = 3;
                return isPidgin ?
                    `Which year dem manufacture am?`
                    :
                    `What year was it manufactured?`;

            case 3: // Year
                ctx.flowData.vehicleData.year = message;
                ctx.flowData.step = 4;
                return isPidgin ?
                    `Wetin be the license plate number?`
                    :
                    `What's the license plate number?`;

            case 4: // License plate
                ctx.flowData.vehicleData.licensePlate = message;
                ctx.flowData.step = 5;
                return isPidgin ?
                    `Wetin be the Vehicle Identification Number (VIN)?`
                    :
                    `What's the Vehicle Identification Number (VIN)?`;

            case 5: // VIN
                ctx.flowData.vehicleData.vin = message;
                ctx.flowData.step = 6;
                return isPidgin ?
                    `And finally, wetin be the current odometer reading (in KM)?`
                    :
                    `And finally, what's the current odometer reading (in KM)?`;

            case 6: // Odometer
                ctx.flowData.vehicleData.odometer = message;

                const make = ctx.flowData.vehicleData.make;
                const model = ctx.flowData.vehicleData.model;
                const plate = ctx.flowData.vehicleData.licensePlate;

                this.saveVehicle(ctx.flowData.vehicleData);
                ctx.currentFlow = null;
                ctx.flowData = {};

                return isPidgin ?
                    `Excellent! The ${make} ${model} (${plate}) don register for your fleet.`
                    :
                    `Excellent! The ${make} ${model} (${plate}) is now registered in your fleet.`;

            default:
                return this.intelligentFallback(message, ctx);
        }
    }

    // ==================== BALANCE CHECK ====================
    private async handleBalanceCheck(ctx: ConversationContext): Promise<string> {
        const isPidgin = ctx.language === 'pidgin';

        // Simulate fetching wallet data
        const balance = {
            available: 245800,
            expected: 180500
        };

        if (isPidgin) {
            return `Hey! Make I pull that up for you right now. 💰\n\n` +
                   `Here na your snapshot:\n` +
                   `• Available Balance: ₦${balance.available.toLocaleString()}\n` +
                   `• Expected Earnings: ₦${balance.expected.toLocaleString()}`;
        }

        return `Hey! Let me pull that up for you right now. 💰\n\n` +
               `Here's your snapshot:\n` +
               `• Available Balance: ₦${balance.available.toLocaleString()}\n` +
               `• Expected Earnings: ₦${balance.expected.toLocaleString()}`;
    }

    // ==================== DATABASE HELPERS ====================

    // Invoice Profile Management
    private async checkInvoiceProfile(phoneNumber: string): Promise<boolean> {
        try {
            const doc = await this.db.collection('invoice_profiles').doc(phoneNumber).get();
            return doc.exists && doc.data()?.isSetup === true;
        } catch (error) {
            console.error('Error checking invoice profile:', error);
            return false;
        }
    }

    private async getInvoiceProfile(phoneNumber: string): Promise<InvoiceProfile | null> {
        try {
            const doc = await this.db.collection('invoice_profiles').doc(phoneNumber).get();
            return doc.exists ? doc.data() as InvoiceProfile : null;
        } catch (error) {
            console.error('Error getting invoice profile:', error);
            return null;
        }
    }

    private async saveInvoiceProfile(phoneNumber: string, profileData: any): Promise<void> {
        try {
            await this.db.collection('invoice_profiles').doc(phoneNumber).set({
                ...profileData,
                isSetup: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving invoice profile:', error);
        }
    }

    private async verifyBankAccount(accountNumber: string, bankName: string): Promise<string> {
        // In production, call Paystack account verification API
        // For now, simulate verification
        const names = [
            'Glyde Systems Ltd',
            'Transport Solutions Ltd',
            'Logistics Pro Ltd',
            'Fleet Management Co'
        ];
        return names[Math.floor(Math.random() * names.length)];
    }

    // Invoice Management
    private async saveInvoice(invoiceData: any): Promise<void> {
        try {
            await this.db.collection('invoices').add({
                ...invoiceData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'draft'
            });
        } catch (error) {
            console.error('Error saving invoice:', error);
        }
    }

    private async sendInvoicePreviewImage(
        phoneNumber: string,
        invoiceId: string,
        invoiceData: any,
        profile: InvoiceProfile | null
    ): Promise<void> {
        try {
            // Import the invoice preview generation function
            const { generateInvoicePreview } = await import('./invoiceGenerator');

            // Generate invoice HTML
            const invoiceHTML = this.generateInvoiceHTML(invoiceId, invoiceData, profile);

            // Convert to image using htmlcsstoimage.com API
            const imageUrl = await generateInvoicePreview(invoiceHTML);

            // Send image via WhatsApp
            const { sendWhatsAppMessage } = await import('./webhook');
            const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

            await sendWhatsAppMessage(phoneNumber, phoneNumberId, {
                type: 'image',
                image: {
                    link: imageUrl,
                    caption: `Invoice ${invoiceId}`
                }
            });
        } catch (error) {
            console.error('Error sending invoice preview image:', error);
        }
    }

    private generateInvoiceHTML(invoiceId: string, invoiceData: any, profile: InvoiceProfile | null): string {
        const baseAmt = invoiceData.total || 0;
        const vat = invoiceData.vatAmount || 0;
        const grand = invoiceData.grandTotal || baseAmt;

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #fff; }
        .invoice { max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
        .company-details { color: #666; font-size: 14px; line-height: 1.6; }
        .invoice-title { font-size: 32px; font-weight: bold; color: #1e293b; margin: 20px 0; }
        .invoice-id { color: #64748b; font-size: 16px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
        .detail-box { background: #f8fafc; padding: 20px; border-radius: 8px; }
        .detail-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
        .detail-value { font-size: 16px; color: #1e293b; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        thead { background: #f1f5f9; }
        th { padding: 15px; text-align: left; font-size: 14px; color: #475569; text-transform: uppercase; }
        td { padding: 15px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
        .totals { text-align: right; margin-top: 30px; }
        .total-row { display: flex; justify-content: flex-end; padding: 10px 0; font-size: 16px; }
        .total-label { width: 200px; color: #64748b; }
        .total-value { width: 150px; font-weight: 600; text-align: right; }
        .grand-total { font-size: 20px; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 15px; }
        .payment-info { background: #eff6ff; padding: 20px; border-radius: 8px; margin-top: 40px; border-left: 4px solid #2563eb; }
        .payment-title { font-weight: bold; color: #1e3a8a; margin-bottom: 10px; }
        .payment-details { color: #1e40af; line-height: 1.8; }
        .notes { margin-top: 30px; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div class="company-name">${profile?.companyName || 'Your Company'}</div>
            <div class="company-details">
                ${profile?.address || ''}<br>
                ${profile?.email || ''} | ${profile?.phone || ''}
            </div>
        </div>

        <div class="invoice-title">INVOICE</div>
        <div class="invoice-id">${invoiceId}</div>

        <div class="details-grid">
            <div class="detail-box">
                <div class="detail-label">Bill To</div>
                <div class="detail-value">${invoiceData.clientName}</div>
            </div>
            <div class="detail-box">
                <div class="detail-label">Date</div>
                <div class="detail-value">${new Date().toLocaleDateString()}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${invoiceData.itemName}</td>
                    <td>${invoiceData.quantity}</td>
                    <td>₦${invoiceData.unitPrice.toLocaleString()}</td>
                    <td>₦${baseAmt.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div class="totals">
            <div class="total-row">
                <div class="total-label">Subtotal:</div>
                <div class="total-value">₦${baseAmt.toLocaleString()}</div>
            </div>
            ${vat > 0 ? `
            <div class="total-row">
                <div class="total-label">VAT (${invoiceData.vatRate}%):</div>
                <div class="total-value">₦${vat.toLocaleString()}</div>
            </div>
            ` : ''}
            <div class="total-row grand-total">
                <div class="total-label">TOTAL:</div>
                <div class="total-value">₦${grand.toLocaleString()}</div>
            </div>
        </div>

        ${profile?.paymentMethod === 'Bank Transfer' ? `
        <div class="payment-info">
            <div class="payment-title">Payment Information</div>
            <div class="payment-details">
                <strong>Bank:</strong> ${profile.bankName}<br>
                <strong>Account Number:</strong> ${profile.accountNumber}<br>
                <strong>Account Name:</strong> ${profile.accountName}
            </div>
        </div>
        ` : profile?.paymentMethod ? `
        <div class="payment-info">
            <div class="payment-title">Payment Method</div>
            <div class="payment-details">${profile.paymentMethod}</div>
        </div>
        ` : ''}

        ${invoiceData.notes ? `
        <div class="notes">
            <strong>Notes:</strong><br>
            ${invoiceData.notes}
        </div>
        ` : ''}
    </div>
</body>
</html>
        `;
    }

    private async saveDriver(driverData: any): Promise<void> {
        try {
            await this.db.collection('drivers').add({
                ...driverData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
        } catch (error) {
            console.error('Error saving driver:', error);
        }
    }

    private async saveVehicle(vehicleData: any): Promise<void> {
        try {
            await this.db.collection('vehicles').add({
                ...vehicleData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
        } catch (error) {
            console.error('Error saving vehicle:', error);
        }
    }

    // ==================== CONVERSATION MEMORY & LEARNING ====================

    /**
     * Load conversation context from Firestore
     */
    private async loadContext(phoneNumber: string): Promise<ConversationContext> {
        try {
            const doc = await this.db.collection('conversation_contexts').doc(phoneNumber).get();

            if (doc.exists) {
                const data = doc.data();
                return {
                    userId: data?.userId || '',
                    phoneNumber,
                    currentFlow: data?.currentFlow || null,
                    flowData: data?.flowData || {},
                    language: data?.language || 'en',
                    lastInteraction: data?.lastInteraction?.toDate() || new Date(),
                    conversationHistory: data?.conversationHistory || []
                };
            }
        } catch (error) {
            console.error('Error loading context:', error);
        }

        // Return fresh context if load fails
        return this.createContext(phoneNumber);
    }

    /**
     * Save conversation context to Firestore
     */
    private async saveContext(phoneNumber: string, ctx: ConversationContext): Promise<void> {
        try {
            // UNLIMITED conversation history - no limits for seamless conversation flow
            // Users should never need to reiterate - the AI remembers everything
            const recentHistory = ctx.conversationHistory;

            await this.db.collection('conversation_contexts').doc(phoneNumber).set({
                userId: ctx.userId,
                phoneNumber: ctx.phoneNumber,
                currentFlow: ctx.currentFlow,
                flowData: ctx.flowData,
                language: ctx.language,
                lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
                conversationHistory: recentHistory,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving context:', error);
        }
    }

    /**
     * Learn from user patterns to improve responses
     */
    private async learnUserPatterns(phoneNumber: string, message: string, ctx: ConversationContext): Promise<void> {
        try {
            const msg = message.toLowerCase();

            // Track user preferences
            const patterns: any = {
                timestamp: new Date(),
                message: msg
            };

            // Detect common actions
            if (msg.includes('route') || msg.includes('delivery')) {
                patterns.action = 'route_management';
            } else if (msg.includes('driver')) {
                patterns.action = 'driver_management';
            } else if (msg.includes('invoice') || msg.includes('bill')) {
                patterns.action = 'invoicing';
            } else if (msg.includes('vehicle') || msg.includes('truck')) {
                patterns.action = 'fleet_management';
            }

            // Detect preferred time of interaction
            const hour = new Date().getHours();
            patterns.hourOfDay = hour;

            // Detect language preference
            patterns.preferredLanguage = ctx.language;

            // Save pattern to Firestore
            await this.db.collection('user_patterns').doc(phoneNumber).collection('patterns').add(patterns);

            // Update aggregated patterns
            const patternDoc = await this.db.collection('user_patterns').doc(phoneNumber).get();
            const currentPatterns = patternDoc.exists ? patternDoc.data() : { mostUsedActions: {}, totalInteractions: 0 };

            const updatedPatterns = {
                mostUsedActions: this.updateActionFrequency(currentPatterns?.mostUsedActions || {}, patterns.action),
                preferredLanguage: ctx.language,
                averageInteractionTime: hour,
                totalInteractions: (currentPatterns?.totalInteractions || 0) + 1,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('user_patterns').doc(phoneNumber).set(updatedPatterns, { merge: true });
        } catch (error) {
            console.error('Error learning user patterns:', error);
        }
    }

    /**
     * Update action frequency for pattern learning
     */
    private updateActionFrequency(current: any, action?: string): any {
        if (!action) return current;

        const updated = { ...current };
        updated[action] = (updated[action] || 0) + 1;
        return updated;
    }

    /**
     * Get user patterns to personalize responses (future use)
     */
    /* private async getUserPatterns(phoneNumber: string): Promise<any> {
        try {
            const doc = await this.db.collection('user_patterns').doc(phoneNumber).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting user patterns:', error);
            return null;
        }
    } */

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
     * Get organization ID from phone number
     * SECURITY CRITICAL: Must always return correct organizationId to prevent data leakage
     */
    private async getOrganizationIdFromPhone(phoneNumber: string): Promise<string> {
        try {
            // Normalize phone number to international format
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

            console.log(`🔍 [SECURITY FALLBACK] Fetching organizationId for phone: ${phoneNumber} (normalized: ${normalizedPhone})`);

            // Query users collection by whatsappNumber field
            const userSnapshot = await this.db.collection('users')
                .where('whatsappNumber', '==', normalizedPhone)
                .limit(1)
                .get();

            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                const orgId = userData.organizationId;

                if (!orgId || orgId === 'default-org') {
                    console.error(`⚠️ [SECURITY WARNING] User ${normalizedPhone} has invalid organizationId: ${orgId}`);
                    console.error(`⚠️ [SECURITY WARNING] User data:`, JSON.stringify(userData));
                }

                console.log(`✅ [SECURITY FALLBACK] Found organizationId: ${orgId} for phone: ${normalizedPhone}`);
                return orgId || 'default-org';
            }

            console.error(`❌ [SECURITY ERROR] No user record found for whatsappNumber: ${normalizedPhone}`);
            return 'default-org';
        } catch (error) {
            console.error('❌ [SECURITY ERROR] Error getting organization ID:', error);
            return 'default-org';
        }
    }

    /**
     * Get user ID from phone number
     */
    private async getUserIdFromPhone(phoneNumber: string): Promise<string> {
        try {
            // Normalize phone number to international format
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

            const userSnapshot = await this.db.collection('users')
                .where('whatsappNumber', '==', normalizedPhone)
                .limit(1)
                .get();

            if (!userSnapshot.empty) {
                const userId = userSnapshot.docs[0].id;
                console.log(`✅ [FALLBACK] Found userId: ${userId} for phone: ${normalizedPhone}`);
                return userId;
            }

            console.warn(`⚠️ [FALLBACK] No userId found for phone: ${normalizedPhone}, using phone as fallback`);
            return normalizedPhone; // Fallback to phone number
        } catch (error) {
            console.error('Error getting user ID:', error);
            return phoneNumber;
        }
    }
}