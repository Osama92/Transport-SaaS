import React from 'react';
import { Timestamp } from 'firebase/firestore';

// Base interface for Firestore documents with metadata
export interface FirestoreDocument {
    createdAt?: Timestamp | string;
    updatedAt?: Timestamp | string;
    createdBy?: string; // userId who created the document
}

// Organization/Tenant
export interface Organization extends FirestoreDocument {
    id: string;
    name: string;
    type: 'partner' | 'business' | 'individual';
    ownerId: string; // User who created the organization
    members?: OrganizationMember[];
    walletBalance?: number; // Available balance for payroll and expenses
    settings?: {
        currency: string;
        timezone: string;
        language: string;
    };
    subscription?: {
        plan: string;
        status: 'active' | 'inactive' | 'trial' | 'cancelled';
        billingEmail?: string;
        startDate?: string;
        endDate?: string;
    };
    companyDetails?: {
        address: string;
        email: string;
        phone: string;
        tin?: string;
        cacNumber?: string;
        logoUrl?: string;
        website?: string;
    };
}

export interface OrganizationMember {
    userId: string;
    role: 'owner' | 'admin' | 'member';
    permissions?: string[];
    addedAt?: string;
}

// New User type
export interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    phone?: string;
    whatsappNumber?: string; // WhatsApp number for receiving notifications
    whatsappOptIn?: boolean; // Whether user wants WhatsApp notifications
    organizationId?: string; // Link to organization
    role?: 'individual' | 'business' | 'partner';
    createdAt?: Timestamp | string;
    updatedAt?: Timestamp | string;
}

export interface Visit {
    // FIX: Add id property to conform to the seedAndGetData function's type constraint.
    id: number;
    name: string;
    role: string;
    avatar: string;
    time: string;
    date: string;
}

export interface Product {
    id: string;
    name: string;
    company: string;
    date: string;
    price: number;
    sellPrice: number;
    stock: number;
    status: 'Process' | 'Out Stock' | 'Inactive' | 'Draft List';
    image: string;
}

export interface DeliveryContact {
  id: string;
  name: string; // Nickname for the contact, e.g., "Home Office"
  recipientName: string; // Actual recipient's name
  address: string;
  phone: string;
}

export interface DeliveryStop {
  id: string;
  recipientName: string;
  destination: string;
  contactPhone: string;
  itemName: string;
  quantity: number;
  uom: string;
  status: 'Pending' | 'Out for Delivery' | 'Delivered' | 'Failed';
  imageUrl?: string;
}

export interface Transporter {
    id: string;
    name: string;
    rating: number;
    status: 'Active' | 'Inactive';
    contactEmail: string;
    contactPhone: string;
    lat?: number;
    lng?: number;
}

export interface TrackingEvent {
  title: string;
  subtitle: string;
  timestamp: string;
  status: 'completed' | 'active' | 'pending';
}

export interface Shipment {
    id: string;
    origin: string;
    date: string;
    status: 'Pending' | 'Assigned to Transporter' | 'In Transit' | 'Partially Delivered' | 'Completed';
    stops: DeliveryStop[];
    transporterId?: string;
    trackingHistory?: TrackingEvent[];
    imageUrl?: string;
    cost: number;
    estimatedDeliveryTimestamp?: string;
    completedTimestamp?: string;
}


export interface Driver extends FirestoreDocument {
    id: string; // Changed from number to string for Firestore compatibility
    organizationId: string; // Foreign key to organization
    name: string;
    email?: string;
    location: string;
    status: 'On-route' | 'Idle' | 'Offline' | 'Active' | 'Inactive';
    avatar: string;
    photo?: string; // Alias for avatar
    licenseNumber: string;
    phone: string;
    nin?: string;
    licensePhotoUrl?: string;
    currentRouteId?: string; // Currently assigned route
    currentRouteStatus?: 'Pending' | 'In Progress' | 'Completed'; // Status of current route
    locationData?: {
        lat: number;
        lng: number;
        lastUpdated: Timestamp | string;
    };
    safetyScore?: number;
    // Driver Portal Access
    username?: string; // For driver portal login
    hashedPassword?: string; // Hashed password for security
    portalAccess?: {
        enabled: boolean;
        lastLogin?: string;
        whatsappNotifications: boolean;
    };
    payrollInfo: {
        baseSalary: number; // Annual base salary
        pensionContributionRate: number; // Employee's contribution percentage, e.g., 8 for 8%
        nhfContributionRate: number; // National Housing Fund contribution, e.g., 2.5 for 2.5%
    };
    bankInfo?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
        bankCode?: string; // For Nigerian banks (e.g., GTB = 058)
    };
    walletBalance?: number; // Driver's current wallet balance for withdrawals
    // Deprecated fields (for backward compatibility)
    lat?: number;
    lng?: number;
    baseSalary?: number;
    pensionContributionRate?: number;
    nhfContributionRate?: number;
}

export interface Expense {
  id: string;
  type: 'Fuel' | 'Tolls' | 'Maintenance' | 'Other';
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

// Alias for route expenses (stored in Firestore subcollection)
export type RouteExpense = Expense;

export interface Route extends FirestoreDocument {
    id: string;
    organizationId: string; // Foreign key to organization
    driverId?: string; // Foreign key to driver
    driverName: string; // Denormalized for display
    driverAvatar: string; // Denormalized for display
    vehicleId?: string; // Foreign key to vehicle
    vehicle: string; // Denormalized vehicle plate number
    clientId?: string; // Foreign key to client
    origin?: string;
    destination?: string;
    stops: number;
    stopAddresses?: string[]; // Array of stop addresses
    progress: number;
    status: 'In Progress' | 'Completed' | 'Pending';
    podUrl?: string;
    distanceKm: number;
    rate: number;
    expenses?: Expense[];
    completionDate?: string;
}

export interface MaintenanceLog {
  id: string;
  date: string;
  type: 'Service' | 'Repair' | 'Tires' | 'Fuel' | 'Other';
  odometer: number;
  description: string;
  cost: number;
}

export interface VehicleDocument {
  id: string;
  name: string;
  type: 'Registration' | 'Insurance' | 'License Renewal';
  expiryDate: string;
  fileUrl: string; // a mock URL
}

export interface Vehicle extends FirestoreDocument {
  id: string;
  organizationId: string; // Foreign key to organization
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  vin: string;
  status: 'On the Move' | 'Parked' | 'Idle' | 'Inactive' | 'In-Shop';
  group?: string;
  assignedDriverId?: string; // Currently assigned driver
  currentRouteId?: string; // Currently assigned route
  currentRouteStatus?: 'Pending' | 'In Progress' | 'Completed'; // Status of current route
  telematics: {
    odometer: number;
    odometerHistory?: { today: number; yesterday: number };
    currentSpeed?: number;
    engineHours?: { total: number; today: number; yesterday: number };
    batteryLevel?: number;
  };
  locationData?: {
    lat: number;
    lng: number;
    lastUpdated: Timestamp | string;
  };
  maintenance: {
    lastServiceDate: string;
    nextServiceDate: string;
  };
  // Note: maintenanceLogs and documents moved to subcollections
  // Use Firestore subcollections: vehicles/{id}/maintenanceLogs and vehicles/{id}/documents
  maintenanceLogs?: MaintenanceLog[]; // Kept for backward compatibility
  documents?: VehicleDocument[]; // Kept for backward compatibility
  // Deprecated fields (for backward compatibility)
  odometer?: number;
  lat?: number;
  lng?: number;
  lastUpdated?: string;
  currentSpeed?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
}

export interface Client extends FirestoreDocument {
    id: string;
    organizationId: string; // Foreign key to organization
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    tin?: string;
    cacNumber?: string;
    status: 'Active' | 'Inactive';
}

export interface DriverPerformanceData {
    driverId: number;
    date: string; // YYYY-MM-DD
    completedRoutes: number;
    totalDeliveries: number;
    onTimeDeliveries: number;
    distanceKm: number;
}

// Invoice Feature Types
export interface InvoiceItem {
    id: number;
    description: string;
    units: number;
    price: number;
}

export interface CompanyDetails {
    name: string;
    address: string;
    email: string;
    phone: string;
    abn?: string;
    website?: string;
    logoUrl?: string;
}

export interface PaymentDetails {
    method: string;
    accountName: string;
    accountNumber: string;
    code?: string; // BSB or Sort Code
    bankName?: string;
}

export interface Invoice extends FirestoreDocument {
    id: string;
    organizationId: string; // Foreign key to organization
    clientId?: string; // Foreign key to client
    routeIds?: string[]; // Foreign keys to routes included in invoice
    project: string;
    issuedDate: string;
    dueDate: string;
    from: CompanyDetails;
    to: CompanyDetails;
    items: InvoiceItem[];
    subtotal?: number;
    tax?: number;
    total: number;
    notes: string;
    paymentDetails: PaymentDetails;
    signatureUrl?: string;
    companyLogoUrl?: string;
    vatRate?: number; // VAT percentage (e.g., 7.5 for 7.5%)
    vatInclusive?: boolean; // true = VAT included in price, false = VAT added on top
    status: 'Draft' | 'Sent' | 'Paid';
    paidDate?: string;
}

export type NotificationType = 'Order' | 'Driver' | 'Vehicle' | 'System';

export interface Notification {
    id: number | string; // Support both number (mock) and string (Firestore)
    icon: string; // Changed from React.ReactNode to string
    iconBg: string;
    title: string;
    description: string;
    timestamp: string; // ISO string for proper sorting
    type: NotificationType;
    read: boolean;
}

export interface SubscriptionPlan {
    key: string;
    price: number;
    isPopular: boolean;
    limits?: {
        vehicles?: number;  // -1 for unlimited
        drivers?: number;   // -1 for unlimited
        routes?: number;    // Monthly active routes limit, -1 for unlimited
        clients?: number;   // -1 for unlimited
    };
}

export interface Material {
    id: string;
    name: string;
    description: string;
    defaultUom: string;
}

export interface Payslip {
    id: string;
    driverId: number;
    driverName: string;
    payPeriod: string;
    payDate: string;
    basePay: number; // Monthly base pay
    bonuses: number;
    grossPay: number; // base + bonuses
    tax: number; // PAYE tax
    pension: number; // Employee pension contribution
    nhf: number; // National Housing Fund
    netPay: number; // gross - tax - pension - nhf
    status: 'Draft' | 'Paid';
    bankInfo?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
    };
}

export interface PayrollRun extends FirestoreDocument {
    id: string;
    organizationId: string; // Foreign key to organization
    periodStart: string;
    periodEnd: string;
    payDate: string;
    status: 'Draft' | 'Processed' | 'Paid';
    totalGrossPay?: number;
    totalNetPay?: number;
    totalTax?: number;
    totalDeductions?: number;
    // Note: payslips moved to subcollection
    // Use Firestore subcollection: payrolls/{id}/payslips
    payslips?: Payslip[]; // Kept for backward compatibility
}

// API Integration Support
export interface Integration extends FirestoreDocument {
    id: string;
    organizationId: string;
    type: 'zoho_books' | 'quickbooks' | 'sage' | 'xero' | 'wave' | 'whatsapp' | 'twilio' | 'slack';
    name: string; // User-friendly name
    status: 'active' | 'inactive' | 'error' | 'pending';
    credentials: {
        accessToken?: string; // Encrypted
        refreshToken?: string; // Encrypted
        apiKey?: string; // Encrypted
        webhookSecret?: string;
        expiresAt?: string;
        scope?: string[];
    };
    config: {
        syncEnabled: boolean;
        syncInterval: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
        lastSync?: string;
        lastError?: string;
        syncSettings: {
            syncInvoices?: boolean;
            syncPayments?: boolean;
            syncCustomers?: boolean;
            syncProducts?: boolean;
            syncExpenses?: boolean;
            autoCreateCustomers?: boolean;
            autoSendInvoices?: boolean;
        };
        webhookUrl?: string;
    };
    fieldMappings?: Record<string, string>; // Map local fields to external API fields
    metadata?: Record<string, any>; // Store any integration-specific data
}

// Sync Queue for API operations
export interface SyncJob extends FirestoreDocument {
    id: string;
    organizationId: string;
    integrationId: string;
    type: 'export' | 'import' | 'sync';
    entity: 'invoice' | 'payment' | 'customer' | 'driver' | 'vehicle' | 'route' | 'expense';
    entityId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'critical';
    attempts: number;
    maxAttempts: number;
    payload: Record<string, any>;
    result?: Record<string, any>;
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
    scheduledAt: string;
    startedAt?: string;
    completedAt?: string;
    nextRetryAt?: string;
}