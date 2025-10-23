# Firebase Storage Setup Guide

## Current Status
✅ Storage service created
✅ Upload functions integrated
✅ Avatar display with fallback

## Steps to Enable Photo Upload

### 1. Update Firebase Storage Rules

**Current Rules (Blocking Everything):**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;  // ❌ This blocks everything
    }
  }
}
```

**New Rules (Allow Authenticated Users):**

Go to Firebase Console → Storage → Rules and replace with:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // Organization-scoped storage
    match /organizations/{organizationId}/{allPaths=**} {
      // Allow authenticated users to read files
      allow read: if request.auth != null;

      // Allow authenticated users to write files
      allow write: if request.auth != null;
    }

    // Fallback for other paths
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish** to save.

### 2. Verify Storage Bucket

Your storage bucket: `gs://glyde-platform.firebasestorage.app`

Check `.env` file has:
```
VITE_FIREBASE_STORAGE_BUCKET=glyde-platform.firebasestorage.app
```

### 3. Test Upload Flow

1. **Add New Driver**
2. **Fill in all required fields**
3. **Select a driver photo** (JPG, PNG)
4. **Select a license photo** (optional)
5. **Click "Save Driver"**

**What Happens:**
- Driver is created in Firestore
- Photos are uploaded to Storage
- Driver record is updated with photo URLs

### 4. Verify in Firebase Console

After upload, check Firebase Console → Storage:

```
organizations/
└── ORG-123/
    └── drivers/
        └── DRV-001/
            ├── photos/
            │   └── DRV-001_1705234567890.jpg
            └── licenses/
                └── license_DRV-001_1705234567891.jpg
```

### 5. Troubleshooting

**Problem: Photos not showing**
- ✅ Check Storage Rules are published
- ✅ Check you're logged in (not demo mode)
- ✅ Check browser console for errors
- ✅ Check Network tab for 403 errors

**Problem: Upload fails**
- ✅ File size < 5MB
- ✅ File type is image (jpg, png, gif)
- ✅ User is authenticated

**Problem: "Permission denied"**
- ✅ Update Storage Rules in Firebase Console
- ✅ Wait 1-2 minutes for rules to propagate

### 6. Storage Structure

```
gs://glyde-platform.firebasestorage.app/
└── organizations/
    └── {organizationId}/
        ├── drivers/
        │   └── {driverId}/
        │       ├── photos/
        │       │   └── {driverId}_{timestamp}.jpg
        │       └── licenses/
        │           └── license_{driverId}_{timestamp}.pdf
        ├── vehicles/
        │   └── {vehicleId}/
        │       └── documents/
        │           └── {documentType}_{vehicleId}_{timestamp}.pdf
        └── routes/
            └── {routeId}/
                └── proofs/
                    └── pod_{routeId}_{timestamp}.jpg
```

### 7. Code References

**Upload Functions:**
- `services/firestore/storage.ts` - All upload functions

**Usage in AddDriverModal:**
- Line 159: Upload driver photo
- Line 167: Upload license photo
- Line 178: Update driver with URLs

**Display in DriversTable:**
- Line 100-108: Avatar with fallback to initials

### 8. Testing Checklist

- [ ] Storage rules updated in Firebase Console
- [ ] Rules published and propagated (wait 1-2 minutes)
- [ ] User logged in (not demo@example.com)
- [ ] Add new driver with photo
- [ ] Check Firebase Console → Storage for uploaded file
- [ ] Check driver record in Firestore has `avatar` URL
- [ ] Photo displays in drivers table

### 9. Production Considerations

**For Production, Update Rules:**

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /organizations/{organizationId}/{allPaths=**} {
      // Verify user belongs to organization
      allow read: if request.auth != null &&
                    request.auth.token.organizationId == organizationId;

      allow write: if request.auth != null &&
                     request.auth.token.organizationId == organizationId &&
                     request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
  }
}
```

**Add Custom Claims:**
Set `organizationId` in user's custom claims during registration.

### 10. Common Errors

**Error: "storage/unauthorized"**
→ Storage rules are blocking. Update rules in Firebase Console.

**Error: "storage/object-not-found"**
→ File doesn't exist. Check the path.

**Error: "storage/quota-exceeded"**
→ Storage quota exceeded. Upgrade Firebase plan.

**Error: "storage/unauthenticated"**
→ User not logged in. Check authentication.

## Need Help?

Check browser console for detailed error messages when uploading.
