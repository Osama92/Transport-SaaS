/**
 * WhatsApp AI Integration Types
 * Type definitions for WhatsApp webhook events and AI processing
 */

// WhatsApp Cloud API Webhook Event Types
export interface WhatsAppWebhookEvent {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string; // WhatsApp ID (phone number)
}

export interface WhatsAppMessage {
  from: string; // Phone number
  id: string; // Message ID
  timestamp: string;
  type: 'text' | 'audio' | 'image' | 'video' | 'document' | 'button' | 'interactive' | 'location';
  text?: {
    body: string;
  };
  audio?: {
    id: string;
    mime_type: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  button?: {
    text: string;
    payload: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description: string;
    };
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  context?: {
    from: string;
    id: string;
  };
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
}

// AI Intent Recognition Types
export enum Intent {
  // Invoice Management
  CREATE_INVOICE = 'create_invoice',
  PREVIEW_INVOICE = 'preview_invoice',
  SEND_INVOICE = 'send_invoice',
  LIST_INVOICES = 'list_invoices',
  VIEW_INVOICE = 'view_invoice',
  UPDATE_INVOICE_STATUS = 'update_invoice_status',
  RECORD_PAYMENT = 'record_payment',
  OVERDUE_INVOICES = 'overdue_invoices',

  // Client Management
  ADD_CLIENT = 'add_client',
  VIEW_CLIENT = 'view_client',
  LIST_CLIENTS = 'list_clients',
  UPDATE_CLIENT = 'update_client',

  // Wallet & Transactions
  VIEW_BALANCE = 'view_balance',
  LIST_TRANSACTIONS = 'list_transactions',
  SEND_MONEY = 'send_money',
  TRANSFER_TO_DRIVER = 'transfer_to_driver',

  // Routes & Shipments
  LIST_ROUTES = 'list_routes',
  VIEW_ROUTE = 'view_route',
  CREATE_ROUTE = 'create_route',
  UPDATE_ROUTE_STATUS = 'update_route_status',
  ASSIGN_ROUTE = 'assign_route',
  TRACK_SHIPMENT = 'track_shipment',
  ADD_ROUTE_EXPENSE = 'add_route_expense',
  GET_ROUTE_EXPENSES = 'get_route_expenses',

  // Driver Management
  ADD_DRIVER = 'add_driver',
  LIST_DRIVERS = 'list_drivers',
  VIEW_DRIVER = 'view_driver',
  DRIVER_STATUS = 'driver_status',
  DRIVER_LOCATION = 'driver_location',

  // Vehicle Management
  ADD_VEHICLE = 'add_vehicle',
  LIST_VEHICLES = 'list_vehicles',
  VIEW_VEHICLE = 'view_vehicle',
  VEHICLE_STATUS = 'vehicle_status',
  VEHICLE_LOCATION = 'vehicle_location',

  // Payroll
  LIST_PAYROLL = 'list_payroll',
  VIEW_PAYSLIP = 'view_payslip',
  DRIVER_SALARY = 'driver_salary',

  // Reports & Analytics
  VIEW_REPORT = 'view_report',
  REVENUE_SUMMARY = 'revenue_summary',
  EXPENSE_SUMMARY = 'expense_summary',

  // Utility
  HELP = 'help',
  CANCEL = 'cancel',
  CONFIRM = 'confirm',
  UNKNOWN = 'unknown'
}

export interface AIIntentResult {
  intent: Intent;
  confidence: number;
  language: 'en' | 'ha' | 'ig' | 'yo' | 'pidgin' | 'mixed'; // English, Hausa, Igbo, Yoruba, Pidgin, Mixed
  entities: Record<string, any>;
  rawText: string;
  translatedText?: string; // If translated from local language
}

// Invoice Creation Entities
export interface InvoiceCreationEntities {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice?: number;
    unit?: string;
  }>;
  totalAmount?: number;
  dueDate?: string;
  notes?: string;
  template?: 'classic' | 'modern' | 'minimal' | 'professional'; // Invoice template style
  vatInclusive?: boolean; // true = VAT included in price, false = VAT added on top
  vatRate?: number; // Custom VAT rate (defaults to 7.5% if not specified)
}

// Client Addition Entities
export interface ClientAdditionEntities {
  name: string;  // Company name
  contactPerson?: string;  // Contact person at the company
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;  // TIN (Tax Identification Number)
  rcNumber?: string;  // CAC/RC Number (Corporate Affairs Commission Registration)
  companyName?: string;  // Deprecated - use 'name' instead
}

// Money Transfer Entities
export interface MoneyTransferEntities {
  recipientType: 'driver' | 'bank';
  recipientName?: string;
  recipientId?: string;
  accountNumber?: string;
  bankCode?: string;
  amount: number;
  description?: string;
}

// Conversation State Management
export interface ConversationState {
  userId: string;
  organizationId: string;
  whatsappNumber: string;
  sessionId: string;
  currentIntent?: Intent;
  lastIntent?: Intent;
  awaitingConfirmation: boolean;
  awaitingInput?: 'client_name' | 'invoice_details' | 'retry' | 'invoice_confirmation' | 'logo_upload' | 'signature_upload' | null;
  conversationData: Record<string, any>;
  lastError?: string; // Store last error for retry context
  retryCount: number; // Track retry attempts
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    message: string;
    timestamp: Date;
    intent?: Intent;
  }>;
  lastMessageAt: Date;
  createdAt: Date;
  language: 'en' | 'ha' | 'ig' | 'yo';
  // Context tracking for natural follow-ups
  lastInvoiceNumber?: string | null;  // Track last created/viewed invoice
  lastClientName?: string | null;     // Track last client mentioned
  lastDriverId?: string | null;       // Track last driver mentioned
}

// WhatsApp User Session
export interface WhatsAppUser {
  whatsappNumber: string;
  userId: string; // Firebase user ID
  organizationId: string;
  name: string;
  verified: boolean;
  language: 'en' | 'ha' | 'ig' | 'yo';
  lastActiveAt: Date;
  createdAt: Date;
}

// Message Response Types
export interface WhatsAppTextResponse {
  type: 'text';
  text: string;
}

export interface WhatsAppButtonResponse {
  type: 'button';
  text: string;
  buttons: Array<{
    id: string;
    title: string;
  }>;
}

export interface WhatsAppListResponse {
  type: 'list';
  text: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface WhatsAppDocumentResponse {
  type: 'document';
  url: string;
  filename: string;
  caption?: string;
}

export type WhatsAppResponse =
  | WhatsAppTextResponse
  | WhatsAppButtonResponse
  | WhatsAppListResponse
  | WhatsAppDocumentResponse;
