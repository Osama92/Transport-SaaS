# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production (TypeScript compilation + Vite build)
npm run build

# Preview production build
npm run preview

# Lint TypeScript/React code
npm run lint
```

## Firebase Configuration

The app supports **both mock data and Firestore**:

1. Create `.env` from `.env.example`
2. Add Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_USE_FIRESTORE=false  # Set to true to enable Firestore
   ```

**Mock Mode** (default): Uses `firebase/config.ts` with in-memory data
**Firestore Mode**: Uses `services/firestore/` with real database

See [FIRESTORE_SETUP.md](FIRESTORE_SETUP.md) for complete setup instructions.

## Architecture Overview

### Multi-Role Dashboard System

The app has **three distinct user roles**, each with its own dashboard:

- **Individual**: Personal shipment tracking (simplified UI)
- **Business**: B2B logistics with transporter management, analytics
- **Partner**: Full fleet management with drivers, vehicles, payroll, invoices

**Flow**: `App.tsx` → `Dashboard.tsx` → Role-specific dashboard (`IndividualDashboard.tsx`, `BusinessDashboard.tsx`, `PartnerDashboard.tsx`)

### Authentication & Role Selection

Authentication is managed by `contexts/AuthContext.tsx`:

1. User signs up/logs in → stored in `localStorage.userSession`
2. **Onboarding flow**: User selects role (Individual/Business/Partner)
3. **Organization creation**: Mock organization created with `organizationId`
4. **Subscription page**: Optional plan selection
5. **Dashboard**: Rendered based on `userRole`

**Mock login password**: `password123`

**Key AuthContext exports**:
- `currentUser`: User object with uid, email, displayName
- `userRole`: 'individual' | 'business' | 'partner'
- `organizationId`: String ID for multi-tenancy (used in Firestore queries)
- `organization`: Organization object with company details

### Dashboard Routing Pattern

Each dashboard uses local state (`activeNav`) to render different screens:

```typescript
// Example from PartnerDashboard.tsx
const [activeNav, setActiveNav] = useState('Dashboard');

switch (activeNav) {
  case 'Drivers': return <DriversScreen />;
  case 'Vehicles': return <VehiclesScreen />;
  case 'Routes': return <RoutesScreen />;
  // ... etc
}
```

**Navigation**: `Sidebar.tsx` updates `activeNav` → dashboard re-renders content

### Sidebar Navigation Items

Navigation items are **role-dependent**:
- **Individual/Business**: `baseNavItems` (Dashboard, Map, Transporters, Contacts, Materials, Analytics, Notifications, Settings)
- **Partner**: `partnerNavItems` (Dashboard, Drivers, Vehicles, Routes, Clients, Invoices, Analytics, Payroll, Settings)

Located in `components/Sidebar.tsx` lines 15-36.

## Data Layer Architecture

### Two Data Sources: Mock and Firestore

The app supports **dual mode** via `VITE_USE_FIRESTORE` environment variable:

#### Mock Data Mode (Default)
- **Location**: `firebase/config.ts`
- **Functions**: `getDrivers()`, `getVehicles()`, `getRoutes()`, etc.
- **Returns**: In-memory data with simulated async delay
- **Use case**: Local development, testing, demos

#### Firestore Mode (Production)
- **Location**: `services/firestore/*.ts`
- **Functions**: `getDriversByOrganization()`, `createDriver()`, `updateDriver()`, etc.
- **Returns**: Real-time data from Firestore
- **Use case**: Production with real database

### Firestore Service Layer Structure

```
services/firestore/
├── drivers.ts              # Driver CRUD + GPS location updates
├── organizations.ts        # Organization/tenant management
├── vehicles.ts             # (TODO) Vehicle CRUD + maintenance logs
├── routes.ts              # (TODO) Route CRUD + tracking
├── clients.ts             # (TODO) Client CRUD
├── invoices.ts            # (TODO) Invoice CRUD + PDF generation
└── payroll.ts             # (TODO) Payroll calculation + payslips
```

**Key Functions** (drivers.ts):
- `getDriversByOrganization(orgId)`: Fetch all drivers for org
- `createDriver(orgId, data, userId)`: Add new driver
- `updateDriver(driverId, updates)`: Modify driver
- `updateDriverLocation(driverId, lat, lng)`: GPS tracking
- `getDriversByStatus(orgId, status)`: Filter by status

### Firestore Collections Schema

**Organization-based multi-tenancy** (all data scoped to `organizationId`):

```
Firestore Root
├── users/               # User accounts (uid)
├── organizations/       # Tenants/companies
├── drivers/            # organizationId + driver data
├── vehicles/           # organizationId + vehicle data
│   └── {id}/maintenanceLogs/    # Subcollection
│   └── {id}/documents/          # Subcollection
├── routes/             # organizationId + route data
├── clients/            # organizationId + client data
├── invoices/           # organizationId + invoice data
└── payrolls/           # organizationId + payroll data
    └── {id}/payslips/           # Subcollection
```

**Security**: Firestore rules enforce organization isolation (see `firestore.rules`)

## Nigerian PAYE Payroll System

### Critical: Tax Calculation Logic

The payroll system implements **2026 Nigerian tax reform** with progressive brackets.

**Location**: `firebase/config.ts` → `calculateNigerianPAYE()` (lines 346-389)

**Tax Brackets (Annual)**:
- First ₦2M: 10%
- Next ₦2M (₦2M-₦4M): 15%
- Next ₦4M (₦4M-₦8M): 20%
- Next ₦4M (₦8M-₦12M): 25%
- Next ₦8M (₦12M-₦20M): 30%
- Above ₦20M: 35%

**Key Components**:
1. **CRA (Consolidated Relief Allowance)**: ₦200,000 + 20% of gross income
2. **Deductions**: Pension (default 8%), NHF (National Housing Fund, default 2.5%)
3. **Minimum Tax**: 1% of gross income (if calculated tax is lower)

**Driver Salary Fields** (in `types.ts`):
- `baseSalary`: Annual salary
- `pensionContributionRate`: Employee pension %
- `nhfContributionRate`: NHF %

**Payslip Generation**: `calculatePayslipsForPeriod()` at line 392
- Calculates monthly pay from annual salary
- Applies tax/deductions
- Returns `Payslip[]` with status `Draft` or `Paid`

## Internationalization (i18n)

Uses `i18next` with **4 languages**: English, Hausa, Igbo, Yoruba

**Translation files**: `locales/{en,ha,ig,yo}/translation.json`

**Usage in components**:
```typescript
const { t } = useTranslation();
<h1>{t('dashboard.stat_total_shipments_title')}</h1>
```

**Language switcher**: In `Header.tsx` (globe icon dropdown)

**All translations are inline** in `i18n.ts` (lines 8-20) as nested JSON, loaded at app initialization.

## Component Organization

```
components/
├── dashboards/        # Role-specific dashboards
│   ├── IndividualDashboard.tsx
│   ├── BusinessDashboard.tsx
│   └── PartnerDashboard.tsx
├── screens/           # Full-page views (e.g., DriversScreen, RoutesScreen)
├── modals/            # Reusable modals (AddDriverModal, InvoiceModal, etc.)
├── invoice/           # Invoice-specific components (InvoiceScreen, InvoicePreview)
├── payslip/           # Payroll components (PayslipPreview)
├── Dashboard.tsx      # Role router
├── DashboardLayout.tsx # Common layout (Sidebar + Header + content)
├── Sidebar.tsx        # Navigation sidebar
├── Header.tsx         # Top bar with date range, notifications, profile
└── Icons.tsx          # Heroicons wrapper components
```

## Real-Time Data with Firestore Hooks

Custom hooks in `hooks/useFirestore.ts` provide **real-time updates** via `onSnapshot`:

```typescript
import { useDrivers } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';

const { organizationId } = useAuth();
const { data: drivers, loading, error } = useDrivers(organizationId);

// drivers array automatically updates when Firestore data changes
// No need to manually refetch or poll
```

**Available hooks**:
- `useDrivers(orgId)` - Real-time driver list
- `useVehicles(orgId)` - Real-time vehicle list
- `useRoutes(orgId)` - Real-time routes
- `useClients(orgId)` - Real-time clients
- `useInvoices(orgId)` - Real-time invoices
- `usePayrollRuns(orgId)` - Real-time payroll runs
- `useNotifications(userId)` - Real-time user notifications

**Generic hook**:
```typescript
import { useFirestoreCollection } from '../hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';

const { data, loading, error } = useFirestoreCollection(
  'drivers',
  [where('organizationId', '==', orgId), orderBy('name')]
);
```

## Type Definitions

**All TypeScript interfaces** are in `types.ts`:
- Core entities: `User`, `Driver`, `Vehicle`, `Route`, `Client`, `Shipment`, `Transporter`, `Organization`
- Financial: `Invoice`, `InvoiceItem`, `Payslip`, `PayrollRun`, `Expense`
- Supporting: `Notification`, `Material`, `Product`, `DeliveryContact`
- Base: `FirestoreDocument` (adds `createdAt`, `updatedAt`, `createdBy`)

**Important type changes (Firestore migration)**:
- All entities now extend `FirestoreDocument` (adds timestamp fields)
- `Driver.id` changed from `number` to `string` (Firestore compatibility)
- `Driver` has nested `payrollInfo` object (backward compatible with flat fields)
- `Vehicle` has nested `telematics`, `locationData`, `maintenance` objects
- `Route`, `Client`, `Invoice`, `PayrollRun` all have `organizationId` field

**Backward compatibility**: Deprecated flat fields kept for mock data compatibility

## GPS Tracking with Leaflet

**Fleet tracking**: `components/screens/FleetTrackingScreen.tsx`

**Architecture**:
1. Left sidebar: Vehicle list with search
2. Center: Interactive `MapContainer` with vehicle markers
3. Right panel: Selected vehicle details (odometer, speed, battery)
4. Modal: `ShowTrackingModal` for location history timeline

**Map tiles**: OpenStreetMap (CDN: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)

**Vehicle location**: Stored in `Vehicle.lat` and `Vehicle.lng` (optional fields)

## Modal Management Pattern

Most screens use modal state to manage popups:

```typescript
type ModalType = 'addVehicle' | 'addDriver' | 'createRoute' | ... | null;
const [activeModal, setActiveModal] = useState<ModalType>(null);

// Render modals conditionally
{activeModal === 'addDriver' && <AddDriverModal onClose={() => setActiveModal(null)} />}
```

**Common modals** (in `components/modals/`):
- CRUD: `AddDriverModal`, `AddVehicleModal`, `AddClientModal`, `EditClientModal`
- Actions: `AssignDriverModal`, `ProofOfDeliveryModal`, `SendFundsModal`
- Settings: `ProfileSettingsModal`, `EmailInvoiceModal`
- Payroll: `PayslipModal`, `CreatePayrollRunModal`, `EditDriverPayModal`

All modals use `ModalBase.tsx` for consistent styling (ESC to close, backdrop click).

## PDF Generation

Uses `jsPDF` + `html2canvas` for invoice/payslip PDFs:

1. Render component to hidden DOM element
2. Use `html2canvas` to capture as image
3. Add image to `jsPDF` document
4. Download or email

**Example**: `components/invoice/InvoicePreview.tsx` has PDF generation logic.

## Dark Mode

Managed by `Sidebar.tsx`:
- Toggle switch adds/removes `dark` class on `document.documentElement`
- TailwindCSS applies `dark:` variants automatically
- Configured in `tailwind.config.js`: `darkMode: 'class'`

## Key Patterns to Follow

1. **Always use `useAuth()` hook** for current user/role, not direct localStorage access
2. **i18n keys** follow pattern: `section.subsection.key` (e.g., `partnerDashboard.createRoute`)
3. **All currency** is Nigerian Naira (₦) by default
4. **Date formats**: Use ISO strings internally, format with `toLocaleString()` for display
5. **Status workflows**: Most entities have string literal union types (e.g., `'Pending' | 'In Progress' | 'Completed'`)
6. **Modal close handlers**: Always accept `onClose: () => void` prop
7. **Table components**: Usually accept `onViewAll: () => void` to navigate to full screen
8. **Form validation**: Currently basic, no external library (add Zod/React Hook Form if needed)

## Migration Roadmap

Current state is **MVP with mock data**. Key next steps:

1. **Firebase Firestore integration**: Replace `firebase/config.ts` mock functions
2. **Firebase Storage**: For driver photos, vehicle documents, POD images
3. **Real-time updates**: Use Firestore `onSnapshot` for live GPS tracking
4. **Payment gateway**: Integrate Paystack/Flutterwave for subscriptions
5. **WhatsApp notifications**: Use Twilio/Africa's Talking API
6. **Mobile app**: React Native for driver POD capture and route navigation

## Important Files

- `types.ts`: All TypeScript interfaces (278 lines)
- `firebase/config.ts`: Mock data + payroll calculation logic (437 lines)
- `i18n.ts`: All translation strings inline
- `contexts/AuthContext.tsx`: Authentication state management
- `App.tsx`: Root component with auth flow orchestration
- `components/Dashboard.tsx`: Role-based dashboard router
- `components/DashboardLayout.tsx`: Common layout wrapper
- `components/Sidebar.tsx`: Navigation with role-specific items

## Troubleshooting

**Issue**: "Invalid credentials" on login
**Fix**: Use password `password123` (mock auth hardcoded)

**Issue**: Dark mode not working
**Fix**: Check if `dark` class is on `<html>` element (Sidebar toggle)

**Issue**: i18n keys showing as `onboarding.roleTitle`
**Fix**: Ensure `i18n.ts` is imported in `index.tsx` before `App.tsx`

**Issue**: Map tiles not loading
**Fix**: Check internet connection (Leaflet tiles from OSM CDN) or use alternative tile provider

**Issue**: Payroll calculations seem incorrect
**Fix**: Verify driver `baseSalary` is **annual** (not monthly). Tax brackets are annual.

## Firebase Environment Variables

When migrating from mock data, these environment variables must be set:

```
VITE_FIREBASE_API_KEY          # From Firebase Console
VITE_FIREBASE_AUTH_DOMAIN      # your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID       # your-project-id
VITE_FIREBASE_STORAGE_BUCKET   # your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID   # Optional (Analytics)
```

Access in code via `import.meta.env.VITE_FIREBASE_API_KEY` (already configured in `firebase/firebaseConfig.ts`).

---

## CRITICAL: Git Branch Management Instructions for Claude Code

### When User Says "Push to Main" (Production)

**ALWAYS execute this EXACT sequence:**

```bash
cd "C:\Users\Admin\Downloads\Transport SaaS"
git status
git checkout main
git pull origin main
git add -A
git commit -m "chore: [description]

🤖 Generated with Claude Code"
git push origin main
git log -1 --oneline
```

### When User Says "Push to Develop" (Development)

**ALWAYS execute this EXACT sequence:**

```bash
cd "C:\Users\Admin\Downloads\Transport SaaS"
git status
git checkout develop
git pull origin develop
git add -A
git commit -m "feat: [description]

🤖 Generated with Claude Code"
git push origin develop
git log -1 --oneline
```

### When User Says "Push to Staging" (Pre-Production)

**ALWAYS execute this EXACT sequence:**

```bash
cd "C:\Users\Admin\Downloads\Transport SaaS"
git status
git checkout staging
git pull origin staging
git add -A
git commit -m "[type]: [description]

🤖 Generated with Claude Code"
git push origin staging
git log -1 --oneline
```

## Commit Message Types (Use Appropriate Prefix)

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `perf:` - Performance improvement
- `docs:` - Documentation only
- `style:` - Code formatting
- `chore:` - Maintenance tasks
- `hotfix:` - Emergency production fix

## Safety Checks (MUST DO Before Every Push)

1. ✅ Run `git status` - Verify all changes are intentional
2. ✅ Run `git diff` - Review actual changes
3. ✅ Check for sensitive data - NO API keys, passwords, or secrets
4. ✅ Verify correct branch - Use `git branch` to confirm
5. ✅ Pull before push - Avoid conflicts with `git pull origin [branch]`

## Branch Protection Rules

### MAIN (Production)
- **Deploy to**: `firebase use default && firebase deploy`
- **Merge from**: staging only (after testing)
- **Never**: Direct commits or force push
- **When to use**: After user explicitly says "push to main"

### STAGING (Pre-Production Testing)
- **Deploy to**: `firebase use staging && firebase deploy`
- **Merge from**: develop only
- **Purpose**: Final testing before production
- **Never**: Skip testing on staging

### DEVELOP (Active Development)
- **Deploy to**: `firebase use dev && firebase deploy`
- **Merge from**: feature branches
- **Purpose**: Daily development work
- **Default**: Use this for most work

## Emergency Rollback Procedure

If production breaks after push to main:

```bash
cd "C:\Users\Admin\Downloads\Transport SaaS"
git checkout main
git log --oneline -10  # Find last working commit
git reset --hard [commit-hash]  # Rollback
git push origin main --force  # EMERGENCY ONLY
firebase use default
firebase deploy
# Immediately notify user
```

## When User Says "Deploy to Production"

```bash
cd "C:\Users\Admin\Downloads\Transport SaaS"
git checkout main
git pull origin main
firebase use default
firebase deploy
git tag -a v1.X.X -m "Release v1.X.X: [description]"
git push origin v1.X.X
```

## Critical File Locations

### Documentation (Keep Updated)
- `README.md` - Project overview
- `CLAUDE.md` - THIS FILE (Git instructions)
- `docs/GIT_WORKFLOW.md` - User-friendly Git guide
- `docs/WHATSAPP_BOT_REFACTOR_PLAN.md` - Bot architecture
- `docs/FIRESTORE_SETUP.md` - Database setup
- `docs/PAYROLL_SYSTEM_GUIDE.md` - Nigerian PAYE

### Code Structure
- `src/` - React frontend
- `functions/src/whatsapp/` - WhatsApp bot (needs refactor!)
- `components/` - React components
- `services/firestore/` - Database services
- `types.ts` - TypeScript types

### Configuration
- `.firebaserc` - Firebase project aliases
- `firebase.json` - Firebase config
- `.gitignore` - Files to ignore

## NEVER Commit These Files

- `.env*` files (except `.env.example`)
- `node_modules/`
- `.firebase/` directory
- Firebase debug logs
- API keys or passwords
- Personal data

## Communication Rules with User

1. **Always confirm** before destructive operations
2. **Show `git status`** before pushing
3. **Explain what changed** in simple terms
4. **Ask if unsure** - don't guess
5. **Provide rollback options** for risky changes

## WhatsApp Bot Status (As of 2025-10-30)

**Current State**: MESSY - 35+ files, multiple AI systems, hard to maintain

**Recent Fixes**:
- ✅ Collection naming: `whatsappUsers` → `whatsapp_users`
- ✅ Branding: "Glyde Systems" → "Amana"
- ✅ Security: Removed `default_org` fallback

**Recommended**: Build clean v2 from scratch (see docs/WHATSAPP_BOT_REFACTOR_PLAN.md)

## Last Updated

2025-10-30 - Added comprehensive Git workflow instructions
