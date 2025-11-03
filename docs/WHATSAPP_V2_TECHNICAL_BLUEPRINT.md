# WhatsApp V2 Technical Implementation Blueprint

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     WhatsApp User                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            WhatsApp Business API (Twilio)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Firebase Cloud Function (Webhook)               │
│                 /whatsapp-webhook-v2                     │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬─────────────┐
        ▼                         ▼             ▼
┌───────────────┐     ┌───────────────┐  ┌──────────────┐
│  User Service │     │   AI Engine   │  │ Rate Limiter │
│  (Auth/Roles) │     │   (GPT-4)     │  │   & Queue    │
└───────┬───────┘     └───────┬───────┘  └──────────────┘
        │                     │
        ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Action Processors                       │
├──────────┬─────────┬──────────┬────────┬───────────────┤
│ Drivers  │ Vehicles│  Routes  │Invoices│   Payroll     │
└──────────┴─────────┴──────────┴────────┴───────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Firestore Database                    │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Web Dashboard (Real-time Sync)              │
└─────────────────────────────────────────────────────────┘
```

## Core Implementation Files

```typescript
// functions/src/whatsapp-v2/index.ts
export const whatsappWebhookV2 = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 30,
  })
  .https.onRequest(async (req, res) => {
    // Main entry point
  });
```

## 1. Session Management System

```typescript
// functions/src/whatsapp-v2/session/SessionManager.ts

interface UserSession {
  userId: string;
  phoneNumber: string;
  organizationId: string;
  role: 'manager' | 'driver' | 'client';
  context: {
    lastAction?: string;
    pendingData?: any;
    conversationState: 'idle' | 'collecting_data' | 'confirming';
    currentFlow?: 'invoice' | 'route' | 'driver_registration';
    stepIndex?: number;
  };
  lastActive: Timestamp;
  pinHash?: string; // For sensitive operations
}

class SessionManager {
  private static sessions = new Map<string, UserSession>();

  static async getOrCreateSession(phoneNumber: string): Promise<UserSession> {
    let session = this.sessions.get(phoneNumber);

    if (!session || this.isExpired(session)) {
      session = await this.createSession(phoneNumber);
    }

    session.lastActive = Timestamp.now();
    return session;
  }

  static async createSession(phoneNumber: string): Promise<UserSession> {
    // Check if user exists in whatsapp_users
    const user = await db.collection('whatsapp_users')
      .where('phoneNumber', '==', phoneNumber)
      .get();

    if (user.empty) {
      // New user - start registration flow
      return {
        userId: '',
        phoneNumber,
        organizationId: '',
        role: 'manager',
        context: {
          conversationState: 'collecting_data',
          currentFlow: 'registration',
          stepIndex: 0,
        },
        lastActive: Timestamp.now(),
      };
    }

    // Existing user - load profile
    const userData = user.docs[0].data();
    return {
      userId: user.docs[0].id,
      phoneNumber,
      organizationId: userData.organizationId,
      role: userData.role,
      context: {
        conversationState: 'idle',
      },
      lastActive: Timestamp.now(),
    };
  }

  static isExpired(session: UserSession): boolean {
    const thirtyMinutes = 30 * 60 * 1000;
    return Date.now() - session.lastActive.toMillis() > thirtyMinutes;
  }
}
```

## 2. AI Engine with Function Calling

```typescript
// functions/src/whatsapp-v2/ai/AmanaAI.ts

interface AIFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any, session: UserSession) => Promise<any>;
}

class AmanaAI {
  private static functions: AIFunction[] = [
    {
      name: 'create_invoice',
      description: 'Create an invoice for a client',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          amount: { type: 'number' },
          items: { type: 'array' },
          dueDate: { type: 'string' },
        },
      },
      handler: InvoiceProcessor.create,
    },
    {
      name: 'register_driver',
      description: 'Register a new driver',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          license: { type: 'string' },
          experience: { type: 'string' },
        },
      },
      handler: DriverProcessor.register,
    },
    // ... 50+ more functions
  ];

  static async process(
    message: string,
    session: UserSession,
    mediaUrl?: string
  ): Promise<WhatsAppResponse> {

    // Handle ongoing flows
    if (session.context.currentFlow) {
      return FlowManager.continueFlow(message, session, mediaUrl);
    }

    // Determine intent using GPT-4
    const intent = await this.determineIntent(message, session);

    // Execute appropriate function
    if (intent.function) {
      const fn = this.functions.find(f => f.name === intent.function);
      if (fn) {
        const result = await fn.handler(intent.parameters, session);
        return this.formatResponse(result, session);
      }
    }

    // Natural conversation
    return this.generateResponse(message, session);
  }

  private static async determineIntent(
    message: string,
    session: UserSession
  ): Promise<any> {
    const systemPrompt = `You are Amana, an AI assistant for Nigerian logistics companies.

    User Role: ${session.role}
    Organization: ${session.organizationId}

    Available functions: ${JSON.stringify(this.functions.map(f => ({
      name: f.name,
      description: f.description,
    })))}

    Analyze the user message and determine:
    1. What function to call (if any)
    2. Extract parameters needed
    3. Or respond conversationally if no function needed`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      functions: this.functions.map(f => ({
        name: f.name,
        description: f.description,
        parameters: f.parameters,
      })),
      function_call: 'auto',
    });

    return response.choices[0].message.function_call ||
           { function: null, parameters: {} };
  }
}
```

## 3. Flow Management for Multi-Step Operations

```typescript
// functions/src/whatsapp-v2/flows/FlowManager.ts

interface FlowStep {
  prompt: string;
  field: string;
  validator?: (input: string) => boolean;
  options?: string[]; // For menu selections
}

class FlowManager {
  private static flows: Record<string, FlowStep[]> = {
    driver_registration: [
      {
        prompt: "Let's register a new driver. What's their full name?",
        field: 'name',
      },
      {
        prompt: "What's their phone number? (They'll get WhatsApp notifications)",
        field: 'phone',
        validator: (input) => /^\+234\d{10}$/.test(input),
      },
      {
        prompt: "Driver's license number?",
        field: 'license',
      },
      {
        prompt: "Select experience level:\n1️⃣ Trainee (0-1 years)\n2️⃣ Junior (1-3 years)\n3️⃣ Senior (3-5 years)\n4️⃣ Expert (5+ years)",
        field: 'experience',
        options: ['1', '2', '3', '4'],
      },
    ],
    create_invoice: [
      {
        prompt: "Creating an invoice. Who's the client?",
        field: 'clientName',
      },
      {
        prompt: "What's the total amount? (Enter number only)",
        field: 'amount',
        validator: (input) => !isNaN(parseFloat(input)),
      },
      {
        prompt: "Describe the service or list items (comma separated)",
        field: 'items',
      },
      {
        prompt: "Payment terms?\n1️⃣ Due on receipt\n2️⃣ Net 15\n3️⃣ Net 30\n4️⃣ Net 60",
        field: 'terms',
        options: ['1', '2', '3', '4'],
      },
    ],
    // More flows...
  };

  static async continueFlow(
    message: string,
    session: UserSession,
    mediaUrl?: string
  ): Promise<WhatsAppResponse> {
    const flow = this.flows[session.context.currentFlow!];
    const currentStep = flow[session.context.stepIndex || 0];

    // Validate input
    if (currentStep.validator && !currentStep.validator(message)) {
      return {
        text: `❌ Invalid input. ${currentStep.prompt}`,
        quickReplies: currentStep.options,
      };
    }

    // Store data
    if (!session.context.pendingData) {
      session.context.pendingData = {};
    }
    session.context.pendingData[currentStep.field] = message;

    // Move to next step
    session.context.stepIndex = (session.context.stepIndex || 0) + 1;

    // Check if flow is complete
    if (session.context.stepIndex >= flow.length) {
      return this.completeFlow(session);
    }

    // Get next step
    const nextStep = flow[session.context.stepIndex];
    return {
      text: nextStep.prompt,
      quickReplies: nextStep.options,
    };
  }

  static async completeFlow(session: UserSession): Promise<WhatsAppResponse> {
    const flowType = session.context.currentFlow;
    const data = session.context.pendingData;

    // Reset session context
    session.context.currentFlow = undefined;
    session.context.stepIndex = 0;
    session.context.pendingData = undefined;
    session.context.conversationState = 'idle';

    // Process based on flow type
    switch (flowType) {
      case 'driver_registration':
        return DriverProcessor.register(data, session);
      case 'create_invoice':
        return InvoiceProcessor.create(data, session);
      default:
        return { text: 'Flow completed!' };
    }
  }
}
```

## 4. Media Processing (Photos, Voice, Documents)

```typescript
// functions/src/whatsapp-v2/media/MediaProcessor.ts

class MediaProcessor {
  static async processMedia(
    mediaUrl: string,
    mediaType: string,
    session: UserSession
  ): Promise<any> {
    switch (mediaType) {
      case 'image':
        return this.processImage(mediaUrl, session);
      case 'audio':
        return this.processVoiceNote(mediaUrl, session);
      case 'document':
        return this.processDocument(mediaUrl, session);
      default:
        return null;
    }
  }

  private static async processImage(url: string, session: UserSession) {
    // Download image
    const imageBuffer = await this.downloadMedia(url);

    // Determine context
    if (session.context.currentFlow === 'vehicle_registration') {
      // Store vehicle photo
      const storagePath = `vehicles/${session.organizationId}/${Date.now()}.jpg`;
      const publicUrl = await this.uploadToStorage(imageBuffer, storagePath);
      session.context.pendingData.photoUrl = publicUrl;
      return 'Vehicle photo received!';
    }

    if (session.context.lastAction === 'route_completed') {
      // Process as POD
      const podUrl = await this.uploadToStorage(
        imageBuffer,
        `pod/${session.organizationId}/${Date.now()}.jpg`
      );

      // Use Vision API to verify POD
      const analysis = await this.analyzeWithVision(imageBuffer);

      return {
        text: `✅ POD received!\n\nDetected:\n${analysis.summary}`,
        podUrl,
        analysis,
      };
    }

    return 'Image received. How can I help with this?';
  }

  private static async processVoiceNote(url: string, session: UserSession) {
    // Download audio
    const audioBuffer = await this.downloadMedia(url);

    // Transcribe using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-1',
      language: 'en',
    });

    // Process as text message
    return AmanaAI.process(transcription.text, session);
  }

  private static async analyzeWithVision(imageBuffer: Buffer): Promise<any> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this delivery image. Look for: signatures, package count, condition of goods, timestamps.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
              },
            },
          ],
        },
      ],
    });

    return {
      summary: response.choices[0].message.content,
      timestamp: new Date().toISOString(),
    };
  }
}
```

## 5. Real-Time Location Tracking

```typescript
// functions/src/whatsapp-v2/location/LocationTracker.ts

class LocationTracker {
  static async processLocation(
    lat: number,
    lng: number,
    session: UserSession
  ): Promise<WhatsAppResponse> {
    // Get driver info
    const driver = await db.collection('drivers')
      .where('whatsappNumber', '==', session.phoneNumber)
      .get();

    if (driver.empty) {
      return {
        text: '❌ You need to be registered as a driver to share location.',
      };
    }

    const driverId = driver.docs[0].id;
    const driverData = driver.docs[0].data();

    // Update driver location
    await db.collection('drivers').doc(driverId).update({
      'location.lat': lat,
      'location.lng': lng,
      'location.lastUpdate': FieldValue.serverTimestamp(),
    });

    // Check if driver is on active route
    const activeRoute = await db.collection('routes')
      .where('assignedDriverId', '==', driverId)
      .where('status', '==', 'In Progress')
      .get();

    if (!activeRoute.empty) {
      const route = activeRoute.docs[0];
      const routeData = route.data();

      // Calculate proximity to next stop
      const nextStop = routeData.stops.find((s: any) => !s.completed);
      if (nextStop) {
        const distance = this.calculateDistance(lat, lng, nextStop.lat, nextStop.lng);

        if (distance < 0.5) { // Within 500m
          return {
            text: `📍 You're approaching ${nextStop.name}!\n\nRemember to:\n1. Take POD photo\n2. Get signature\n3. Mark as complete`,
            buttons: [
              { id: 'complete_stop', title: 'Complete Stop' },
              { id: 'report_issue', title: 'Report Issue' },
            ],
          };
        }
      }

      // Send location update to manager
      await this.notifyManager(driverData.organizationId, {
        driverId,
        driverName: driverData.name,
        location: { lat, lng },
        routeId: route.id,
      });

      return {
        text: `✅ Location updated!\n\nYou're on route: ${routeData.name}\nNext stop: ${nextStop?.name || 'Final destination'}`,
      };
    }

    return {
      text: '✅ Location updated. You have no active routes.',
    };
  }

  private static calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
```

## 6. Interactive Menus & Quick Actions

```typescript
// functions/src/whatsapp-v2/menus/MenuBuilder.ts

class MenuBuilder {
  static buildMainMenu(role: string): InteractiveMenu {
    const menus = {
      manager: {
        title: 'Manager Dashboard',
        sections: [
          {
            title: 'Operations',
            rows: [
              { id: 'view_routes', title: '📍 Routes', description: 'Manage all routes' },
              { id: 'view_drivers', title: '👤 Drivers', description: 'Driver management' },
              { id: 'view_vehicles', title: '🚗 Vehicles', description: 'Fleet management' },
            ],
          },
          {
            title: 'Financial',
            rows: [
              { id: 'create_invoice', title: '📄 Create Invoice', description: 'Bill clients' },
              { id: 'view_wallet', title: '💰 Wallet', description: 'Check balance' },
              { id: 'run_payroll', title: '💵 Payroll', description: 'Process salaries' },
            ],
          },
          {
            title: 'Analytics',
            rows: [
              { id: 'daily_report', title: '📊 Daily Report', description: "Today's summary" },
              { id: 'performance', title: '📈 Performance', description: 'KPIs & metrics' },
            ],
          },
        ],
      },
      driver: {
        title: 'Driver Menu',
        sections: [
          {
            title: 'Routes',
            rows: [
              { id: 'my_routes', title: '🗺️ My Routes', description: 'View assigned routes' },
              { id: 'start_route', title: '🚀 Start Route', description: 'Begin journey' },
              { id: 'share_location', title: '📍 Share Location', description: 'Update position' },
            ],
          },
          {
            title: 'Support',
            rows: [
              { id: 'request_advance', title: '⛽ Fuel Advance', description: 'Request funds' },
              { id: 'report_issue', title: '⚠️ Report Issue', description: 'Vehicle/route problem' },
              { id: 'sos', title: '🆘 Emergency', description: 'Get immediate help' },
            ],
          },
        ],
      },
      client: {
        title: 'Track & Manage',
        sections: [
          {
            title: 'Shipments',
            rows: [
              { id: 'track_shipment', title: '📦 Track Shipment', description: 'Real-time tracking' },
              { id: 'shipment_history', title: '📋 History', description: 'Past deliveries' },
            ],
          },
          {
            title: 'Account',
            rows: [
              { id: 'pending_invoices', title: '📄 Invoices', description: 'View & pay bills' },
              { id: 'support', title: '💬 Support', description: 'Get help' },
            ],
          },
        ],
      },
    };

    return menus[role] || menus.client;
  }
}
```

## 7. Notification System

```typescript
// functions/src/whatsapp-v2/notifications/NotificationService.ts

class NotificationService {
  static async sendNotification(
    phoneNumber: string,
    template: string,
    params: Record<string, any>
  ): Promise<void> {
    const templates = {
      route_assigned: `🚗 New Route Assigned!\n\n${params.routeName}\nFrom: ${params.from}\nTo: ${params.to}\nPickup: ${params.pickupTime}\n\nReply START to begin or VIEW for details.`,

      invoice_created: `📄 Invoice #${params.invoiceId}\n\nAmount: ₦${params.amount.toLocaleString()}\nDue: ${params.dueDate}\n\nView: ${params.link}`,

      payment_received: `✅ Payment Received!\n\nAmount: ₦${params.amount.toLocaleString()}\nFrom: ${params.clientName}\nInvoice: #${params.invoiceId}\n\nThank you for your business!`,

      payslip_ready: `💰 Your Payslip is Ready!\n\nMonth: ${params.month}\nGross: ₦${params.gross.toLocaleString()}\nNet: ₦${params.net.toLocaleString()}\n\nReply DETAILS for breakdown.`,

      maintenance_due: `🔧 Maintenance Alert!\n\nVehicle: ${params.vehicleNumber}\n${params.maintenanceType} due in ${params.daysUntil} days\n\nSchedule now to avoid breakdown.`,

      sos_alert: `🆘 EMERGENCY ALERT!\n\nDriver: ${params.driverName}\nLocation: ${params.location}\nIssue: ${params.issue}\n\nImmediate action required!`,
    };

    const message = templates[template] || params.customMessage;

    await twilio.messages.create({
      from: 'whatsapp:+14155238886',
      to: `whatsapp:${phoneNumber}`,
      body: message,
    });

    // Log notification
    await db.collection('notifications').add({
      phoneNumber,
      template,
      params,
      sentAt: FieldValue.serverTimestamp(),
      status: 'sent',
    });
  }

  static async broadcastToRole(
    organizationId: string,
    role: string,
    message: string
  ): Promise<void> {
    const users = await db.collection('whatsapp_users')
      .where('organizationId', '==', organizationId)
      .where('role', '==', role)
      .get();

    const promises = users.docs.map(user =>
      this.sendNotification(
        user.data().phoneNumber,
        'custom',
        { customMessage: message }
      )
    );

    await Promise.all(promises);
  }
}
```

## 8. Database Schema

```typescript
// functions/src/whatsapp-v2/database/schema.ts

// WhatsApp Users Collection
interface WhatsAppUser {
  phoneNumber: string;
  organizationId: string;
  userId: string; // Links to main users collection
  role: 'manager' | 'driver' | 'client';
  name: string;
  pinHash?: string; // For approvals
  preferences: {
    language: 'en' | 'yo' | 'ig' | 'ha';
    notifications: boolean;
    voiceNotes: boolean;
  };
  registeredAt: Timestamp;
  lastActive: Timestamp;
}

// Conversation History
interface ConversationHistory {
  phoneNumber: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
    mediaUrl?: string;
    metadata?: any;
  }>;
  context: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Pending Approvals
interface PendingApproval {
  id: string;
  type: 'fuel_advance' | 'expense' | 'route_change' | 'leave_request';
  requesterId: string;
  requesterPhone: string;
  approverId: string;
  approverPhone: string;
  data: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
  respondedAt?: Timestamp;
  responseMethod?: 'whatsapp' | 'web';
}
```

## 9. Testing Strategy

```typescript
// functions/src/whatsapp-v2/tests/e2e.test.ts

describe('WhatsApp V2 E2E Tests', () => {
  test('Complete invoice creation flow', async () => {
    const session = await SessionManager.getOrCreateSession('+2348012345678');

    // Start flow
    let response = await AmanaAI.process('create invoice', session);
    expect(response.text).toContain("Who's the client");

    // Provide client
    response = await AmanaAI.process('Dangote Industries', session);
    expect(response.text).toContain('amount');

    // Provide amount
    response = await AmanaAI.process('500000', session);
    expect(response.text).toContain('service');

    // Provide items
    response = await AmanaAI.process('5 trips Lagos to Abuja', session);
    expect(response.text).toContain('Payment terms');

    // Select terms
    response = await AmanaAI.process('3', session);
    expect(response.text).toContain('Invoice created');
    expect(response.text).toContain('INV-');
  });

  test('Driver location update', async () => {
    const response = await LocationTracker.processLocation(
      6.5244, 3.3792, // Lagos coordinates
      mockDriverSession
    );

    expect(response.text).toContain('Location updated');

    // Verify database update
    const driver = await db.collection('drivers').doc('driver123').get();
    expect(driver.data()?.location.lat).toBe(6.5244);
  });
});
```

## 10. Deployment & Monitoring

```yaml
# .github/workflows/whatsapp-v2-deploy.yml
name: Deploy WhatsApp V2

on:
  push:
    branches: [main]
    paths:
      - 'functions/src/whatsapp-v2/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test -- whatsapp-v2
      - run: npx firebase deploy --only functions:whatsappWebhookV2
```

## Performance Optimization

1. **Response Caching**: Cache frequent queries (routes, driver lists)
2. **Session Pooling**: Keep warm sessions in memory
3. **Batch Operations**: Group Firestore writes
4. **Media CDN**: Use Cloudinary for image optimization
5. **Rate Limiting**: Max 20 messages/minute per user

## Security Measures

1. **Webhook Verification**: Validate Twilio signatures
2. **PIN Authentication**: For sensitive operations
3. **Role-Based Access**: Check permissions per action
4. **Audit Logging**: Track all operations
5. **Data Encryption**: Sensitive data encrypted at rest

## Migration Plan

### Week 1: Foundation
- [ ] Set up WhatsApp Business API (Twilio)
- [ ] Create webhook endpoint
- [ ] Build session management
- [ ] Implement basic AI processing

### Week 2: Core Features
- [ ] Driver registration flow
- [ ] Route assignment/tracking
- [ ] Invoice creation
- [ ] Wallet queries

### Week 3: Advanced Features
- [ ] Voice note processing
- [ ] Image analysis (POD)
- [ ] Location tracking
- [ ] Approval workflows

### Week 4: Polish & Launch
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Soft launch with pilot users

## Success Metrics

- Response time < 2 seconds
- 95% intent recognition accuracy
- Zero data sync issues
- 90% user satisfaction
- 50% reduction in support tickets

This blueprint provides a complete technical roadmap for implementing WhatsApp V2 with full feature parity to the web platform!