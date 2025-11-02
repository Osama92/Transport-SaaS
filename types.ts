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
        status: 'active' | 'inactive' | 'trial' | 'cancelled' | 'attention';
        billingEmail?: string;
        startDate?: string;
        endDate?: string;
        // Paystack Integration
        subscriptionCode?: string; // Paystack subscription code (e.g., SUB_xxxxx)
        paystackPlanCode?: string; // Paystack plan code (e.g., PLN_xxxxx)
        customerCode?: string; // Paystack customer code (e.g., CUS_xxxxx)
        emailToken?: string; // Token for enable/disable operations
        paystackReference?: string; // Latest payment reference
        // Billing Details
        nextPaymentDate?: string; // Next billing date
        lastPaymentDate?: string; // Last successful payment
        billingInterval?: 'monthly' | 'annually';
        amount?: number; // Subscription amount in Naira
        // Trial Information
        trialEndsAt?: string; // Trial expiration date
        convertedFromTrial?: boolean; // Whether this was converted from trial
        conversionDate?: string; // When trial was converted to paid
        // Plan Change Tracking
        lastPlanChange?: string; // Date of last plan change
        proratedCharge?: number; // Last prorated charge amount
        pendingDowngrade?: {
            newPlan: string;
            effectiveDate: string;
            newSubscriptionCode: string;
            paystackPlanCode: string;
        };
        // Payment History
        totalPayments?: number; // Total number of successful payments
        lifetimeValue?: number; // Total amount paid
        failedPaymentCount?: number; // Number of failed payments
        lastFailedPaymentDate?: string; // Date of last failed payment
    };
    companyDetails?: {
        address: string;
        email: string;
        phone: string;
        tin?: string;
        cacNumber?: string;
        logoUrl?: string;
        signatureUrl?: string;
        website?: string;
    };
    paymentDetails?: {
        bankAccountName: string;
        bankAccountNumber: string;
        bankName: string;
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
    phone: string; // Required: Primary phone number for authentication
    phoneVerified?: boolean; // Whether phone number has been verified
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
    // Driver Portal Access (Updated for phone-based auth)
    username?: string; // DEPRECATED: For driver portal login (use phone instead)
    hashedPassword?: string; // DEPRECATED: Hashed password for security (use OTP instead)
    portalAccess?: {
        enabled: boolean;
        lastLogin?: string;
        lastLoginIP?: string;
        loginAttempts?: number; // For rate limiting
        lastOTPRequest?: string; // Track OTP request frequency
        whatsappNotifications: boolean;
    };
    // Paystack Wallet Integration
    paystack?: {
        subaccountCode?: string; // Paystack subaccount code
        virtualAccountNumber?: string; // Dedicated virtual account number
        virtualAccountBank?: string; // Bank name for virtual account
        customerCode?: string; // Paystack customer code
        recipientCode?: string; // Transfer recipient code (for withdrawals)
    };
    walletBalance: number; // Driver's current wallet balance (default: 0)
    walletCurrency: string; // Wallet currency (default: NGN)
    // Transaction Limits
    transactionLimits?: {
        dailyWithdrawalLimit: number; // Max daily withdrawal
        singleTransactionLimit: number; // Max single transaction
        monthlyWithdrawalLimit: number; // Max monthly withdrawal
    };
    // Payroll Information
    payrollInfo: {
        baseSalary: number; // Annual base salary
        // NOTE: Bonuses are now managed separately via the Bonus system (see Bonus type)
        // Optional deductions (all in Naira, based on fiscalreforms.ng PIT calculator)
        pensionContribution?: number; // Annual pension contribution amount
        nhfContribution?: number; // Annual National Housing Fund contribution
        nhisContribution?: number; // Annual NHIS contribution amount
        loanInterest?: number; // Annual interest on loan for owner-occupied house
        lifeInsurance?: number; // Annual life insurance premium (self & spouse)
        annualRent?: number; // Annual rent payment (for rent relief)
        // Deprecated fields (kept for backward compatibility)
        pensionContributionRate?: number; // OLD: Employee's contribution percentage
        nhfContributionRate?: number; // OLD: National Housing Fund contribution percentage
    };
    // Bank Information (for withdrawals)
    bankInfo?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
        bankCode?: string; // For Nigerian banks (e.g., GTB = 058)
        verified?: boolean; // Whether bank account has been verified
    };
    // KYC Information
    kyc?: {
        status: 'pending' | 'verified' | 'rejected';
        bvn?: string; // Bank Verification Number
        governmentIdUrl?: string; // URL to government ID
        selfieUrl?: string; // URL to selfie photo
        verifiedAt?: string;
    };
    // Deprecated fields (for backward compatibility)
    lat?: number;
    lng?: number;
    baseSalary?: number;
    pensionContributionRate?: number;
    nhfContributionRate?: number;
}

// Wallet Transaction Types
export interface WalletTransaction extends FirestoreDocument {
    id: string;
    driverId: string;
    organizationId: string;
    type: 'credit' | 'debit'; // Money in or out
    amount: number;
    currency: string;
    balanceBefore: number; // Balance before transaction
    balanceAfter: number; // Balance after transaction
    status: 'pending' | 'success' | 'failed' | 'reversed';
    reference: string; // Unique transaction reference
    description: string;
    // Payment Method Details
    paymentMethod: 'paystack' | 'bank_transfer' | 'cash' | 'manual';
    paystackReference?: string; // Paystack transaction reference
    transferCode?: string; // Paystack transfer code (for withdrawals)
    // Recipient Details (for debit transactions)
    recipient?: {
        accountNumber?: string;
        accountName?: string;
        bankName?: string;
        bankCode?: string;
    };
    // Metadata
    metadata?: {
        source?: string; // Where the transaction originated (e.g., 'wallet_funding', 'route_payment', 'withdrawal')
        notes?: string;
        adminId?: string; // If manual transaction
        ipAddress?: string;
    };
    // Timestamps
    initiatedAt?: Timestamp | string;
    completedAt?: Timestamp | string;
    failedAt?: Timestamp | string;
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

// Driver Portal - Fuel Log Types
export interface FuelLog extends FirestoreDocument {
    id: string;
    driverId: string;
    organizationId: string;
    vehicleId: string;
    vehiclePlateNumber: string; // Denormalized for display
    routeId?: string; // Optional link to route
    // Odometer readings
    previousOdometer: number; // Last recorded odometer
    currentOdometer: number; // New odometer reading
    distanceTraveled: number; // currentOdometer - previousOdometer
    // Fuel details
    fuelQuantity: number; // Liters
    fuelCostPerLiter: number; // Cost per liter
    totalFuelCost: number; // fuelQuantity * fuelCostPerLiter
    // Calculated metrics
    fuelConsumption: number; // Liters per 100km
    kmPerLiter: number; // Distance / fuel quantity
    // Receipt and location
    receiptPhotoUrl?: string; // Storage URL for receipt photo
    location?: string; // Fuel station location
    stationName?: string; // Fuel station name
    latitude?: number;
    longitude?: number;
    // Timestamps
    refuelDate: string; // ISO date string
    submittedAt: Timestamp | string;
    // Status and approval
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    approvedBy?: string; // User ID who approved
    approvedAt?: Timestamp | string;
}

// Driver Portal - Expense Log Types
export interface DriverExpense extends FirestoreDocument {
    id: string;
    driverId: string;
    organizationId: string;
    vehicleId?: string; // Optional link to vehicle
    routeId?: string; // Optional link to route
    type: 'Fuel' | 'Tolls' | 'Parking' | 'Maintenance' | 'Meals' | 'Accommodation' | 'Other';
    description: string;
    amount: number;
    currency: string; // Default: NGN
    // Receipt and documentation
    receiptPhotoUrl?: string; // Storage URL for receipt photo
    receiptNumber?: string;
    vendorName?: string;
    location?: string;
    // Timestamps
    expenseDate: string; // ISO date string
    submittedAt: Timestamp | string;
    // Status and approval
    status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
    rejectionReason?: string;
    approvedBy?: string; // User ID who approved
    approvedAt?: Timestamp | string;
    reimbursedAt?: Timestamp | string;
    // Reimbursement details
    reimbursementMethod?: 'wallet' | 'bank_transfer' | 'salary';
    reimbursementReference?: string;
}

// Driver Portal - KPI Metrics
export interface DriverKPIMetrics {
    driverId: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: string;
    endDate: string;
    // Route metrics
    totalRoutes: number;
    completedRoutes: number;
    pendingRoutes: number;
    canceledRoutes: number;
    completionRate: number; // Percentage
    // Distance and time
    totalDistanceKm: number;
    totalDrivingHours: number;
    averageDistancePerRoute: number;
    // Delivery performance
    totalDeliveries: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    onTimeRate: number; // Percentage
    // Fuel efficiency
    totalFuelLiters: number;
    averageFuelConsumption: number; // Liters per 100km
    totalFuelCost: number;
    // Financial
    totalRevenue: number; // Total earnings from routes
    totalExpenses: number;
    netEarnings: number; // Revenue - expenses
    walletBalance: number;
    // Safety and compliance
    incidentCount: number;
    safetyScore: number; // 0-100
    complianceScore: number; // 0-100
    // POD completion
    podUploadRate: number; // Percentage of routes with POD
}

// Driver Portal - Proof of Delivery
export interface ProofOfDelivery extends FirestoreDocument {
    id: string;
    routeId: string;
    driverId: string;
    organizationId: string;
    vehicleId?: string;
    // Delivery details
    recipientName: string;
    recipientSignatureUrl?: string; // Storage URL for signature
    deliveryPhotoUrl?: string; // Storage URL for delivery photo
    deliveryNotes?: string;
    deliveryStatus: 'successful' | 'partial' | 'failed';
    failureReason?: string;
    // Location and timestamp
    deliveryLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    deliveryTimestamp: Timestamp | string;
    odometerReading?: number;
    // Verification
    verificationCode?: string; // Optional PIN/code from recipient
    verified: boolean;
}

// Route Stop Interface - for multi-stop deliveries
export interface RouteStop {
    id: string;                           // Unique stop ID
    sequence: number;                     // Order: 1, 2, 3...
    address: string;                      // Full address
    coordinates: {                        // Lat/lng from Google Places
        lat: number;
        lng: number;
    };
    recipientName?: string;               // Who receives delivery
    recipientPhone?: string;              // Contact number
    deliveryNotes?: string;               // Special instructions
    estimatedArrival?: string;            // Calculated by Google API
    actualArrival?: string;               // When driver checks in
    status: 'pending' | 'arrived' | 'completed' | 'failed';
    podPhotoUrl?: string;                 // POD photo per stop
    signatureUrl?: string;                // Signature per stop
    failureReason?: string;               // If delivery failed
    completedAt?: string;                 // Timestamp
}

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

    // NEW: Support both old (number) and new (RouteStop[]) formats
    stops: number | RouteStop[];          // Backward compatible
    stopAddresses?: string[];             // Deprecated - kept for old routes

    // NEW: Optimization fields
    optimizationMethod?: 'manual' | 'nearestNeighbor' | 'google';
    isOptimized?: boolean;                // Whether route was optimized
    totalDistanceKm?: number;             // Sum of all legs (overrides distanceKm when using stops array)
    estimatedDurationMinutes?: number;    // Total travel time
    routePolyline?: string;               // Encoded polyline for map display

    progress: number;
    status: 'In Progress' | 'Completed' | 'Pending';
    podUrl?: string;                      // Legacy - for old routes
    distanceKm: number;                   // Legacy - kept for backward compatibility
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
    template?: 'classic' | 'modern' | 'minimal' | 'professional' | 'pdf'; // Selected invoice template
    invoiceNumber?: string; // Formatted invoice number (e.g., INV-202501-001)
    clientName?: string; // Client name for easy filtering
    clientEmail?: string; // Client email
    clientAddress?: string; // Client address
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

// Subscription Payment History
export interface SubscriptionPayment extends FirestoreDocument {
    id: string;
    organizationId: string;
    subscriptionCode?: string; // Paystack subscription code
    paystackReference: string; // Paystack transaction reference
    amount: number; // Amount in Naira
    currency: string;
    status: 'success' | 'failed' | 'pending';
    plan: string; // Plan name (basic, pro, enterprise)
    planCode?: string; // Paystack plan code
    paidAt?: string; // Payment success timestamp
    failureReason?: string; // Reason for failure
    channel: string; // Payment channel (card, bank, ussd, etc.)
    customerEmail: string;
    metadata?: {
        type?: 'subscription' | 'upgrade' | 'downgrade' | 'prorated';
        previousPlan?: string;
        newPlan?: string;
        billingInterval?: 'monthly' | 'annually';
    };
}

export interface Material {
    id: string;
    name: string;
    description: string;
    defaultUom: string;
}

export interface Bonus extends FirestoreDocument {
    id: string;
    organizationId: string; // Foreign key to organization
    driverId: number | string; // Foreign key to driver
    driverName: string; // Denormalized for display
    amount: number; // Bonus amount in Naira
    reason: string; // Why the bonus is being given (shows on payslip)
    type: 'One-Time' | 'Recurring'; // One-time or recurring bonus
    payPeriod: string; // Format: 'Oct 2025' - which pay period to include the bonus
    status: 'Pending' | 'Approved' | 'Paid'; // Approval workflow
    approvedBy?: string; // User ID who approved
    approvedAt?: string; // Timestamp of approval
}

export interface Payslip {
    id: string;
    driverId: number;
    driverName: string;
    payPeriod: string;
    payDate: string;
    basePay: number; // Monthly base pay
    bonuses: number; // Total bonuses for this period (aggregated from Bonus records)
    bonusDetails?: Array<{ reason: string; amount: number }>; // Itemized bonus breakdown
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
    // Transparency fields (from calculateNigerianPAYE)
    annualGrossIncome?: number; // Annual gross salary
    cra?: number; // Consolidated Relief Allowance
    totalDeductions?: number; // Sum of all tax deductions/reliefs
    taxableIncome?: number; // Gross income used as taxable base
    taxBreakdown?: Array<{ bracket: string; rate: string; amount: number }>; // Progressive tax brackets
    effectiveTaxRate?: number; // Percentage of income paid as tax
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

// Pre-Trip Safety Inspection Types
export type InspectionItemStatus = 'good' | 'fair' | 'poor' | 'missing' | 'not_applicable';

export interface InspectionItem {
    id: string;
    category: string;
    question: string;
    status: InspectionItemStatus;
    notes?: string;
    photoUrl?: string;
    required: boolean;
}

export interface SafetyInspection extends FirestoreDocument {
    id: string;
    routeId: string;
    driverId: string;
    vehicleId: string;
    organizationId: string;
    inspectionDate: string;
    items: InspectionItem[];
    overallScore: number; // 0-100
    isPerfect: boolean; // All items marked as 'good'
    hasCriticalIssues: boolean; // Any items marked as 'poor' or 'missing'
    completedAt: string;
    timeToComplete: number; // seconds
}

export interface SafetyScore {
    driverId: string;
    organizationId: string;
    totalInspections: number;
    perfectInspections: number;
    score: number; // 0-100
    currentStreak: number; // consecutive perfect inspections
    longestStreak: number;
    lastInspectionDate?: string;
    incidents: number; // number of incidents/accidents
    updatedAt: string;
}