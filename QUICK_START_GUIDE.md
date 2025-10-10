# Quick Start Guide - Firebase Integration

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
The `.env` file is already configured with Firebase credentials:
```env
VITE_FIREBASE_API_KEY=AIzaSyBYu5HlIjGoBsr8JJMkvNd2623yX2Y2iHE
VITE_FIREBASE_AUTH_DOMAIN=glyde-platform.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=glyde-platform
VITE_USE_FIRESTORE=true
```

### 3. Run Development Server
```bash
npm run dev
```
The app will be available at [http://localhost:3000](http://localhost:3000) (or 3001 if 3000 is in use).

## 📝 Test the Application

### Step 1: Sign Up
1. Open the app in your browser
2. Click "Sign Up"
3. Enter your details:
   - Email: `test@example.com`
   - Password: `password123` (at least 6 characters)
   - Full Name: `Test User`
   - Phone: `+234...`
4. Click "Create Account"

### Step 2: Select Role
After signing up, you'll be prompted to select a role:
- **Individual**: Personal driver/rider
- **Business**: Fleet management
- **Partner**: Shipping logistics partner

Select "Business" to access all features.

### Step 3: Explore the Dashboard
You'll now see the Business Dashboard with:
- **Overview**: Stats and metrics
- **Fleet Management**: Vehicles and drivers
- **Routes**: Active and completed routes
- **Clients**: Customer management
- **Invoices**: Billing and payments
- **Payroll**: Driver payroll processing

## 🔑 Key Features to Test

### Create a Driver
1. Go to "Fleet Management" → "Drivers"
2. Click "Add Driver"
3. Fill in driver details:
   - Name, phone, status
   - Base salary (for payroll)
   - Pension and NHF contribution rates

### Create a Vehicle
1. Go to "Fleet Management" → "Vehicles"
2. Click "Add Vehicle"
3. Fill in vehicle details:
   - Make, model, year
   - Plate number, VIN
   - Status, GPS location

### Create a Route
1. Go to "Routes"
2. Click "Create Route"
3. Fill in route details:
   - Origin and destination
   - Assign driver and vehicle
   - Client information
   - Cargo details

### Create an Invoice
1. Go to "Invoices"
2. Click "Create Invoice"
3. Select client
4. Add line items
5. Set payment terms and due date

### Process Payroll
1. Go to "Payroll"
2. Click "Create Payroll Run"
3. Select pay period
4. Review calculated payslips
5. Process payroll

## 🔥 Real-Time Features

### Test Real-Time Updates
1. Open the app in two browser tabs/windows
2. In Tab 1: Create a driver
3. In Tab 2: Watch the driver appear automatically (no refresh needed!)
4. Try with vehicles, routes, etc.

This works because we use Firebase's `onSnapshot` listeners in the hooks.

## 🧪 API Service Examples

### Using Firestore Services Directly

```typescript
import {
  createDriver,
  getDriversByOrganization,
  updateDriverLocation,
} from './services/firestore';

// Create a driver
const driverId = await createDriver(
  organizationId,
  {
    name: 'John Doe',
    phone: '+234...',
    status: 'Available',
    payrollInfo: {
      baseSalary: 200000,
      pensionContributionRate: 0.08,
      nhfContributionRate: 0.025,
    },
  },
  userId
);

// Get all drivers
const drivers = await getDriversByOrganization(organizationId);

// Update GPS location
await updateDriverLocation(driverId, 6.5244, 3.3792, 'On Duty');
```

### Using React Hooks

```typescript
import { useDrivers, useVehicles } from './hooks/useFirestore';
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { organizationId } = useAuth();
  const { data: drivers, loading, error } = useDrivers(organizationId);
  const { data: vehicles } = useVehicles(organizationId);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Drivers ({drivers.length})</h2>
      <h2>Vehicles ({vehicles.length})</h2>
    </div>
  );
}
```

## 🛠️ Troubleshooting

### Problem: "Permission denied" errors
**Solution**: Make sure you're signed in and have selected a role. The user must have an `organizationId` to access data.

### Problem: "auth/email-already-in-use"
**Solution**: The email is already registered. Try logging in instead, or use a different email.

### Problem: Real-time updates not working
**Solution**: Check your internet connection. Firebase requires an active connection for real-time sync.

### Problem: "Missing or insufficient permissions"
**Solution**:
1. Deploy Firestore rules: `firebase deploy --only firestore:rules`
2. Check that `organizationId` is set correctly in the user profile

## 📚 Documentation

- **FIREBASE_INTEGRATION_COMPLETE.md**: Full documentation of all services
- **FIRESTORE_MIGRATION_SUMMARY.md**: Architecture decisions and patterns
- **FIRESTORE_SETUP.md**: Deployment guide for production
- **CLAUDE.md**: Developer guide with code patterns

## 🎯 Common Tasks

### Check Current User
```typescript
const { currentUser, userRole, organizationId } = useAuth();
console.log('User:', currentUser);
console.log('Role:', userRole);
console.log('Organization:', organizationId);
```

### Sign Out
```typescript
const { logOut } = useAuth();
await logOut();
```

### Get Organization Details
```typescript
import { getOrganizationById } from './services/firestore/organizations';

const org = await getOrganizationById(organizationId);
console.log('Organization:', org);
```

### Calculate Payslip
```typescript
import { calculatePayslip } from './services/firestore/payroll';

const payslip = calculatePayslip(
  driver,
  '2025-10-01', // period start
  '2025-10-31', // period end
  50000, // bonuses
  10000  // deductions
);

console.log('Net Pay:', payslip.netPay);
console.log('PAYE Tax:', payslip.payeDeduction);
console.log('Pension:', payslip.pensionContribution);
```

## 🚦 Status

- ✅ Firebase Authentication working
- ✅ User profiles stored in Firestore
- ✅ Organization creation working
- ✅ All services implemented (Drivers, Vehicles, Routes, Clients, Invoices, Payroll)
- ✅ Real-time hooks functional
- ✅ Dev server running without errors

## 🎉 You're Ready!

Start building your transport management system with Firebase! All the backend infrastructure is in place and ready to use.

For questions or issues, refer to the full documentation in [FIREBASE_INTEGRATION_COMPLETE.md](./FIREBASE_INTEGRATION_COMPLETE.md).
