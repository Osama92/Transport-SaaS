# Firebase Firestore Setup Guide

This guide walks you through setting up Firebase Firestore for the Transport SaaS application.

## Prerequisites

1. Firebase project created at [Firebase Console](https://console.firebase.google.com/)
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Environment variables configured in `.env`

## Step 1: Configure Environment Variables

Ensure your `.env` file has the following Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Step 2: Deploy Firestore Security Rules

1. Login to Firebase CLI:
   ```bash
   firebase login
   ```

2. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your Firebase project
   - Use `firestore.rules` for rules file
   - Use `firestore.indexes.json` for indexes file

3. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. Deploy indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## Step 3: Database Structure

The Firestore database follows an **organization-based multi-tenancy** model:

### Root Collections

```
├── users/                # User accounts
├── organizations/        # Tenant/company data
├── drivers/             # Partner drivers (org-scoped)
├── vehicles/            # Fleet vehicles (org-scoped)
├── routes/              # Delivery routes (org-scoped)
├── clients/             # B2B clients (org-scoped)
├── invoices/            # Financial documents (org-scoped)
├── payrolls/            # Payroll runs (org-scoped)
├── notifications/       # User notifications (user-scoped)
├── shipments/           # Shipments (user or org-scoped)
└── materials/           # Product catalog (org-scoped)
```

### Key Design Principles

1. **Organization Isolation**: All partner data is scoped to `organizationId`
2. **Denormalization**: Driver names, vehicle plates stored in routes for performance
3. **Subcollections**: Used for:
   - `vehicles/{id}/maintenanceLogs`
   - `vehicles/{id}/documents`
   - `payrolls/{id}/payslips`
   - `drivers/{id}/performanceHistory`
4. **Timestamps**: All documents have `createdAt`, `updatedAt` (Firestore serverTimestamp)
5. **Audit Trail**: All documents have `createdBy` field with userId

## Step 4: Enable Firestore in Application

### Option A: Gradual Migration (Recommended)

Keep mock data alongside Firestore:

1. Add environment variable to toggle:
   ```env
   VITE_USE_FIRESTORE=false  # Set to true to use Firestore
   ```

2. Use conditional import in components:
   ```typescript
   // In PartnerDashboard.tsx
   const USE_FIRESTORE = import.meta.env.VITE_USE_FIRESTORE === 'true';

   const loadDrivers = async () => {
     if (USE_FIRESTORE) {
       const drivers = await getDriversByOrganization(organizationId);
       setDrivers(drivers);
     } else {
       const drivers = await getDrivers(); // Mock data
       setDrivers(drivers);
     }
   };
   ```

### Option B: Full Migration

Replace `firebase/config.ts` functions with Firestore service calls:

```typescript
// Before (mock data)
import { getDrivers } from '../firebase/config';

// After (Firestore)
import { getDriversByOrganization } from '../services/firestore/drivers';
```

## Step 5: Using Firestore Services

### Create a Driver

```typescript
import { createDriver } from '../services/firestore/drivers';
import { useAuth } from '../contexts/AuthContext';

const { organizationId, currentUser } = useAuth();

const newDriver = await createDriver(
  organizationId!,
  {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '08012345678',
    licenseNumber: 'DL12345',
    location: 'Lagos',
    status: 'Offline',
    avatar: 'https://example.com/avatar.jpg',
    payrollInfo: {
      baseSalary: 2400000, // Annual
      pensionContributionRate: 8,
      nhfContributionRate: 2.5,
    },
  },
  currentUser!.uid
);
```

### Query Drivers with Real-Time Updates

```typescript
import { useDrivers } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';

const { organizationId } = useAuth();
const { data: drivers, loading, error } = useDrivers(organizationId);

// drivers array updates automatically when Firestore data changes
```

### Update Driver Location (GPS Tracking)

```typescript
import { updateDriverLocation } from '../services/firestore/drivers';

await updateDriverLocation(driverId, 6.5244, 3.3792, 'On-route');
```

## Step 6: Security Rules Verification

Test security rules in Firebase Console:

1. Go to Firestore Database → Rules
2. Click "Rules playground"
3. Test scenarios:

```javascript
// Test: Partner can read their own drivers
Authenticated: true
Location: /databases/(default)/documents/drivers/driver123
Operation: get
Auth:
  uid: "user123"
  token: { organizationId: "org456" }

// Should succeed if driver123.organizationId == "org456"
```

## Step 7: Indexes

Composite indexes are required for complex queries. Deploy with:

```bash
firebase deploy --only firestore:indexes
```

Monitor index build progress in Firebase Console → Firestore → Indexes.

## Common Queries

### Get Active Drivers

```typescript
import { getDriversByStatus } from '../services/firestore/drivers';

const activeDrivers = await getDriversByStatus(organizationId, 'On-route');
```

### Get Routes by Status

```typescript
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const routesRef = collection(db, 'routes');
const q = query(
  routesRef,
  where('organizationId', '==', organizationId),
  where('status', '==', 'In Progress'),
  orderBy('createdAt', 'desc')
);

const querySnapshot = await getDocs(q);
const routes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

## Backward Compatibility

Types have been updated with deprecated fields for backward compatibility:

```typescript
interface Driver {
  // New nested structure
  payrollInfo: {
    baseSalary: number;
    pensionContributionRate: number;
    nhfContributionRate: number;
  };

  // Deprecated flat fields (for mock data compatibility)
  baseSalary?: number;
  pensionContributionRate?: number;
  nhfContributionRate?: number;
}
```

Service functions automatically map between nested and flat structures.

## Troubleshooting

### Error: Missing or insufficient permissions

**Cause**: Security rules not deployed or user doesn't have organizationId
**Fix**:
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Check user has organizationId in AuthContext

### Error: The query requires an index

**Cause**: Composite index not created
**Fix**:
1. Click the link in error message (opens Firebase Console)
2. Or deploy indexes: `firebase deploy --only firestore:indexes`

### Error: Cannot read property 'organizationId' of null

**Cause**: User not authenticated or organization not set
**Fix**:
```typescript
const { organizationId } = useAuth();

if (!organizationId) {
  console.error('User must select a role first');
  return;
}
```

## Next Steps

1. **Migrate Drivers** (complete ✓)
2. **Migrate Vehicles**
3. **Migrate Routes**
4. **Migrate Clients**
5. **Migrate Invoices**
6. **Migrate Payroll**
7. **Add real-time GPS tracking** with `onSnapshot`
8. **Cloud Functions** for:
   - Automated notifications
   - Payroll calculations
   - Invoice generation
   - Data validation

## Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Queries Documentation](https://firebase.google.com/docs/firestore/query-data/queries)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)
