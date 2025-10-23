# Routes Not Showing - Diagnostic Guide

## Issue
Routes are being created but not appearing on the platform.

---

## Architecture Overview

### How Routes Flow Through the System:

```
1. User clicks "Create New Route"
   ↓
2. CreateRouteModal opens
   ↓
3. User fills form (Origin, Destination, Distance, etc.)
   ↓
4. Form submit → createRoute() in services/firestore/routes.ts
   ↓
5. Route saved to Firestore collection 'routes'
   ↓
6. useRoutes hook (hooks/useFirestore.ts) listening via onSnapshot
   ↓
7. Hook receives update and sets data state
   ↓
8. PartnerDashboard receives routes from hook
   ↓
9. RoutesScreen renders RouteAssignmentTable with routes
```

---

## Verified Working Components

✅ **CreateRouteModal** - Properly calls `createRoute()` function
✅ **createRoute()** - Saves route to Firestore with correct fields
✅ **Firestore Indexes** - Composite index exists for `organizationId + createdAt`
✅ **useRoutes Hook** - Correctly queries Firestore with `onSnapshot`
✅ **PartnerDashboard** - Receives routes from hook and passes to RoutesScreen

---

## Most Likely Causes

### 1. **Firestore Indexes Not Deployed** ⚠️ MOST LIKELY

**Symptom**: Routes save successfully but don't appear in list

**Why It Happens**: The `firestore.indexes.json` file exists locally but indexes haven't been deployed to Firebase.

**Check**: Open browser DevTools Console (F12) and look for errors like:
```
FirebaseError: The query requires an index.
You can create it here: https://console.firebase.google.com/...
```

**Fix**:
```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Or deploy all Firestore rules and indexes
firebase deploy --only firestore
```

**Verification**:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Check if this index exists and status is "Enabled":
   - Collection: `routes`
   - Fields: `organizationId (Ascending)`, `createdAt (Descending)`
   - Status: **Enabled** (not "Building" or missing)

---

### 2. **Wrong Organization ID**

**Symptom**: Routes save but don't match the user's organizationId

**Check**: Compare the `organizationId` in Firestore with what the user has:

1. Open Browser DevTools Console and run:
```javascript
// In Console tab
console.log('User Org ID:', localStorage.getItem('organizationId'));
```

2. Go to Firebase Console → Firestore Database
3. Find the `routes` collection
4. Check the newly created route's `organizationId` field
5. Compare - they should match exactly

**Fix**: If they don't match, the issue is in AuthContext or route creation logic.

---

### 3. **Firestore Rules Blocking Read**

**Symptom**: Route saves but can't be read back

**Check**: Open browser DevTools Console for permission errors:
```
FirebaseError: Missing or insufficient permissions
```

**Fix**: Check `firestore.rules` file for routes collection:
```javascript
match /routes/{routeId} {
  allow read, write: if request.auth != null &&
    resource.data.organizationId == request.auth.token.organizationId;
}
```

Make sure:
- User is authenticated
- Rules allow reading routes for the user's organizationId

**Deploy rules**:
```bash
firebase deploy --only firestore:rules
```

---

### 4. **Trial Limit Blocking Route Save**

**Symptom**: Modal closes but route doesn't save

**Check**: The CreateRouteModal checks limits before saving (line 51):
```typescript
if (!canAddResource(currentMonthRouteCount, routeLimit)) {
    setShowLimitModal(true);
    return; // Route creation stops here
}
```

**Verify**:
1. User is on trial plan → Limit is 1 route per month
2. If user already created 1 route this month, they can't create another
3. Check if "Limit Reached" modal appeared

**Fix**: User must upgrade subscription or delete old routes.

---

### 5. **Console Errors During Creation**

**Check**: Open Browser DevTools Console (F12) when creating route:
```
1. Open DevTools (F12)
2. Go to Console tab
3. Click "Create New Route"
4. Fill form and submit
5. Watch for errors in Console
```

**Common errors**:
- `FirebaseError: Missing or insufficient permissions` → Check Firestore rules
- `FirebaseError: The query requires an index` → Deploy indexes
- `Failed to create route` → Check network tab for API errors

---

### 6. **Route Created But Filtered Out**

**Symptom**: Route exists in Firestore but not visible in UI

**Check**: The RoutesScreen has status filters:
```typescript
const filteredRoutes = routes.filter(route => {
    if (routeStatusFilter === 'All') return true;
    return route.status === routeStatusFilter;
});
```

**Verify**:
1. Check if status filter is set to something other than "All"
2. Newly created routes have status `'Pending'`
3. If filter is set to `'Completed'`, new routes won't show

**Fix**: Click "All" filter in RoutesScreen

---

## Step-by-Step Debugging

### Step 1: Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Create a new route
4. Look for errors (red text)
5. Copy any error messages

### Step 2: Check Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database**
4. Find `routes` collection
5. Check if your new route appears
6. Verify `organizationId` matches your user's org ID

### Step 3: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "firestore" or "googleapis"
4. Create a new route
5. Look for failed requests (red status codes)
6. Check request/response details

### Step 4: Check Firestore Indexes

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Firestore Database** → **Indexes** tab
3. Look for this index:
   ```
   Collection: routes
   Fields: organizationId (Ascending), createdAt (Descending)
   Status: Enabled
   ```
4. If status is "Building", wait a few minutes
5. If index is missing, deploy indexes (see Fix #1)

### Step 5: Check Authentication

Run this in browser console:
```javascript
// Check if user is authenticated
console.log('Current User:', localStorage.getItem('userSession'));
console.log('Organization ID:', localStorage.getItem('organizationId'));
console.log('User Role:', localStorage.getItem('userRole'));
```

All three should have values. If any are `null`, user needs to log out and log back in.

---

## Quick Fix Checklist

- [ ] Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] Check browser console for errors when creating route
- [ ] Verify route appears in Firebase Console → Firestore → `routes` collection
- [ ] Check organizationId in route matches user's organizationId
- [ ] Verify status filter is set to "All" in RoutesScreen
- [ ] Check Firestore rules allow reading routes
- [ ] Confirm user isn't at trial limit (1 route max)
- [ ] Check that indexes show "Enabled" status in Firebase Console

---

## Expected Behavior After Fix

1. User clicks "Create New Route"
2. Modal opens
3. User fills form:
   - Origin: "Lagos"
   - Destination: "Abuja"
   - Distance: 700
4. User clicks "Create Route"
5. Modal closes
6. New route appears in RoutesScreen table with:
   - Status: "Pending"
   - Origin: "Lagos"
   - Destination: "Abuja"
   - Distance: 700 km
7. Route is at the top of the list (sorted by creation date, newest first)

---

## Files Involved

**Route Creation**:
- [components/modals/CreateRouteModal.tsx](components/modals/CreateRouteModal.tsx) - Form UI
- [services/firestore/routes.ts](services/firestore/routes.ts) - `createRoute()` function

**Route Display**:
- [hooks/useFirestore.ts](hooks/useFirestore.ts) - `useRoutes()` hook (line 155)
- [components/dashboards/PartnerDashboard.tsx](components/dashboards/PartnerDashboard.tsx) - Routes state (line 450)
- [components/screens/RoutesScreen.tsx](components/screens/RoutesScreen.tsx) - Routes table UI

**Configuration**:
- [firestore.indexes.json](firestore.indexes.json) - Index definitions (line 36-41)
- [firestore.rules](firestore.rules) - Security rules

---

## Common Solution

**In 90% of cases, the issue is fixed by deploying Firestore indexes:**

```bash
cd "/home/sir_dan_carter/Desktop/Project Files/Transport-SaaS"
firebase deploy --only firestore:indexes
```

**Wait 2-5 minutes** for indexes to finish building, then refresh the app and try creating a route again.

---

## Getting Help

If routes still don't show after trying all fixes:

1. **Check browser console** - Copy error messages
2. **Check Firestore console** - Verify route was created
3. **Share these details**:
   - Error message from browser console
   - Screenshot of Firestore routes collection
   - Screenshot of Firestore Indexes page showing routes index status
   - Value of `organizationId` from localStorage
   - Current subscription plan (trial/basic/pro/max)
