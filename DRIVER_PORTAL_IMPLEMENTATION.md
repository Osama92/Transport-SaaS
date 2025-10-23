# Driver Portal Implementation Guide

## Overview
Complete transformation of the driver wallet into a professional driver portal with comprehensive features for route management, vehicle tracking, fuel management, expenses, and profile management.

## Architecture

### New Type Definitions (types.ts)
- **FuelLog**: Track fuel refills with automatic consumption calculations
- **DriverExpense**: Expense tracking with receipt uploads
- **DriverKPIMetrics**: Comprehensive driver performance metrics
- **ProofOfDelivery**: POD with photo, signature, and location

### Components Created

#### 1. DriverPortalDashboard.tsx
Main navigation hub with sidebar
- Responsive mobile/desktop layout
- Navigation: Home, Routes, Fuel, Expenses, Wallet, Profile
- Auto-refresh driver data every 30 seconds

#### 2. DriverPortalHome.tsx
KPI dashboard with metrics and recent activity
- Real-time KPI calculations from Firestore
- Quick action buttons
- Recent routes display
- Monthly performance summary
- Earnings summary

#### 3. DriverRoutesScreen.tsx
Route management with completion workflow
- View assigned routes (Pending, In Progress, Completed)
- Start route workflow
- Complete route with POD upload
- Progress tracking
- Auto-update driver and vehicle status

#### 4. ProofOfDeliveryModal.tsx
POD capture with photo upload
- Recipient name capture
- Delivery photo upload (camera/gallery)
- Odometer reading
- Delivery notes
- Auto-updates route, driver, and vehicle status

#### 5. DriverFuelManagement.tsx
Fuel tracking with automatic calculations
- View assigned vehicle details
- Current odometer display
- Fuel log history with metrics
- Statistics: Total cost, distance, consumption, efficiency
- Automatic calculation of:
  - Distance traveled (current - previous odometer)
  - Fuel consumption (L/100km)
  - Fuel efficiency (km/L)
  - Total cost

#### 6. AddFuelLogModal.tsx
Fuel refill logging with real-time calculations
- Previous odometer display
- Current odometer input
- Fuel quantity and cost inputs
- Station name and location
- Receipt photo upload
- Live calculation preview:
  - Distance traveled
  - Fuel consumption
  - Fuel efficiency
  - Total cost

## Key Features Implemented

### 1. Route Management
- **Start Route**: Driver can start assigned routes
  - Updates route status to "In Progress"
  - Sets driver status to "On-route"
  - Sets vehicle status to "On the Move"

- **Complete Route**: Driver completes with POD
  - Upload delivery photo
  - Capture recipient name
  - Optional odometer reading
  - Optional delivery notes
  - Creates POD document in Firestore
  - Updates route status to "Completed"
  - Resets driver and vehicle status to "Idle"

### 2. Fuel Management (Smart Calculations)
- **Automatic Odometer Tracking**:
  ```typescript
  previousOdometer = vehicle.telematics.odometer
  distanceTraveled = currentOdometer - previousOdometer
  ```

- **Fuel Consumption Calculation**:
  ```typescript
  fuelConsumption = (fuelQuantity / distanceTraveled) * 100  // L/100km
  kmPerLiter = distanceTraveled / fuelQuantity                // km/L
  totalFuelCost = fuelQuantity * fuelCostPerLiter
  ```

- **Statistics Aggregation**:
  - Total fuel cost across all logs
  - Total liters consumed
  - Total distance covered
  - Average fuel consumption
  - Average km per liter

### 3. KPI Metrics
Comprehensive performance tracking:
- **Route Metrics**: Total, completed, pending, completion rate
- **Distance**: Total km, average per route, driving hours
- **Delivery Performance**: Total deliveries, on-time rate
- **Fuel Efficiency**: Total liters, consumption, cost
- **Financial**: Revenue, expenses, net earnings, wallet balance
- **Safety**: Incidents, safety score, compliance score
- **POD**: Upload rate percentage

### 4. Real-time Updates
All data synced via Firestore listeners:
- Driver status changes
- Route assignments
- Wallet balance updates
- Fuel log submissions
- KPI recalculations

## Firestore Collections

### New Collections:
- **fuelLogs**: Fuel refill records
  ```
  {
    driverId, organizationId, vehicleId,
    previousOdometer, currentOdometer, distanceTraveled,
    fuelQuantity, fuelCostPerLiter, totalFuelCost,
    fuelConsumption, kmPerLiter,
    receiptPhotoUrl, location, stationName,
    status: 'pending' | 'approved' | 'rejected'
  }
  ```

- **driverExpenses**: Expense records (TO BE IMPLEMENTED)
  ```
  {
    driverId, organizationId,
    type: 'Fuel' | 'Tolls' | 'Parking' | 'Maintenance' | 'Meals' | 'Other',
    amount, description,
    receiptPhotoUrl, vendorName, location,
    status: 'pending' | 'approved' | 'rejected' | 'reimbursed'
  }
  ```

- **proofOfDelivery**: POD records
  ```
  {
    routeId, driverId, organizationId, vehicleId,
    recipientName, deliveryPhotoUrl,
    deliveryNotes, deliveryStatus,
    deliveryLocation: { latitude, longitude, address },
    odometerReading, verified
  }
  ```

### Modified Collections:
- **routes**: Added `podUrl`, `completionDate`
- **drivers**: Added `currentRouteId`, `currentRouteStatus`
- **vehicles**: Added `currentRouteId`, `currentRouteStatus`, updated `telematics.odometer`

## Firebase Storage Structure
```
storage/
├── fuel-receipts/{organizationId}/{driverId}/{timestamp}_{filename}
├── expense-receipts/{organizationId}/{driverId}/{timestamp}_{filename}
├── pod/{organizationId}/{routeId}/{timestamp}_{filename}
└── profile-photos/{organizationId}/{driverId}/{timestamp}_{filename}
```

## Remaining Tasks

### TODO: DriverExpensesScreen.tsx
Expense tracking with receipt uploads
- View all expenses with filtering
- Add expense modal
- Receipt photo upload
- Expense categories: Fuel, Tolls, Parking, Maintenance, Meals, Accommodation, Other
- Status tracking: pending, approved, rejected, reimbursed
- Statistics: Total expenses, pending amount, reimbursed amount

### TODO: DriverWalletScreen.tsx
Simplified wallet view (reuse existing components)
- Display wallet balance
- Transaction history
- Withdraw funds
- Virtual account details
- Quick stats: Total earned, total spent, available balance

### TODO: DriverProfileScreen.tsx
Profile management
- Upload/change profile photo
- View and edit personal details
- Change password
- Bank account details
- License information
- View KYC status
- Portal access settings

### TODO: Firestore Services
Create service files for new features:
- `services/firestore/fuelLogs.ts`
- `services/firestore/driverExpenses.ts`
- `services/firestore/proofOfDelivery.ts`
- `services/firestore/driverKPIs.ts`

## Integration Points

### Entry Point Changes
Update `DriverPortalLogin.tsx` to load `DriverPortalDashboard` instead of `DriverDashboardWallet`

### Parent Component
```typescript
import DriverPortalDashboard from './components/driver-portal/DriverPortalDashboard';

// In your main App component or driver portal route:
<DriverPortalDashboard
  driver={authenticatedDriver}
  onLogout={handleLogout}
/>
```

## User Experience Flow

### 1. Driver Login
Phone number + password → Driver Portal Dashboard

### 2. Dashboard (Home)
View KPIs → Quick actions → Recent routes → Performance summary

### 3. Route Management
View assigned routes → Start route → Navigate → Complete with POD upload

### 4. Fuel Management
Check vehicle odometer → Log refuel → Upload receipt → Auto-calculate consumption

### 5. Expenses
Log expense → Upload receipt → Submit for approval → Track reimbursement

### 6. Wallet
View balance → Check transactions → Withdraw funds → View virtual account

### 7. Profile
Update photo → Change password → Edit details → Manage bank account

## Mobile Responsiveness
- Collapsible sidebar on mobile
- Touch-friendly buttons
- Camera access for photo uploads
- Responsive grid layouts
- Mobile-optimized forms

## Security Features
- Photo file size validation (5MB max)
- Photo file type validation (images only)
- Odometer validation (must be greater than previous)
- Input validation on all forms
- Firestore security rules for multi-tenancy
- Driver can only access their own data

## Performance Optimizations
- Real-time listeners only for active data
- Pagination for large lists (limit queries)
- Image compression before upload
- Lazy loading of modal components
- Auto-refresh intervals (30 seconds)
- Efficient Firestore queries with indexes

## Next Steps
1. Create remaining screens (Expenses, Wallet, Profile)
2. Create Firestore service files
3. Add partner-side approval workflow for fuel logs and expenses
4. Implement push notifications for route assignments
5. Add offline support with Firestore offline persistence
6. Implement WhatsApp notifications integration
7. Add map navigation integration
8. Create analytics dashboard for partners to view driver performance

## Notes
- All currency is Nigerian Naira (₦)
- Fuel measurements in Liters and Kilometers
- All timestamps are ISO 8601 strings or Firestore Timestamps
- Photos uploaded to Firebase Storage with public URLs
- Driver can only see and manage their own data (enforced by organizationId + driverId queries)
