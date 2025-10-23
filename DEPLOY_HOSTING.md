# Firebase Hosting Deployment Guide

## Quick Deploy (3 Commands)

```bash
# 1. Build production bundle
npm run build

# 2. Deploy everything (hosting + functions + rules)
firebase deploy

# OR deploy only hosting
firebase deploy --only hosting
```

---

## What Gets Deployed?

### Your Production App Will Include:

✅ **Frontend Dashboard** (React + TypeScript + Vite)
- Multi-role dashboards (Individual, Business, Partner)
- Real-time fleet tracking with Leaflet maps
- Invoice management with PDF generation
- Payroll system (Nigerian PAYE)
- WhatsApp integration UI
- Multi-language support (English, Hausa, Igbo, Yoruba)

✅ **Backend Services** (Firebase Cloud Functions)
- WhatsApp webhook with natural conversation AI
- Invoice image generation (HTMLCSStoImage)
- Firestore data layer
- Authentication

✅ **Database** (Cloud Firestore)
- Organization-scoped multi-tenancy
- Real-time data sync
- Secure rules (just fixed!)

✅ **File Storage** (Firebase Storage)
- Driver photos
- Vehicle documents
- Proof of delivery images

---

## Pre-Deployment Checklist

### 1. Environment Variables

Your `.env` file should have these configured:

**Required:**
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=glyde-platform.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=glyde-platform
VITE_FIREBASE_STORAGE_BUCKET=glyde-platform.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**Optional (for full functionality):**
```env
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
VITE_WHATSAPP_ACCESS_TOKEN=...
VITE_GOOGLE_MAPS_API_KEY=...
```

**Note:** `.env` file is NOT deployed to hosting. Only values prefixed with `VITE_` are bundled into the production build.

---

### 2. Firebase Project Configuration

Verify your Firebase project ID:

```bash
firebase projects:list
```

Should show:
```
┌──────────────────────┬────────────────┬────────────────┐
│ Project Display Name │ Project ID     │ Resource Location │
├──────────────────────┼────────────────┼────────────────┤
│ Glyde Platform       │ glyde-platform │ [default]       │
└──────────────────────┴────────────────┴────────────────┘
```

If wrong project, switch:
```bash
firebase use glyde-platform
```

---

### 3. Enable Firebase Hosting

**First time only:**

```bash
firebase init hosting
```

**Prompts (IMPORTANT - Choose these):**
```
? What do you want to use as your public directory?
  → dist

? Configure as a single-page app (rewrite all urls to /index.html)?
  → Yes

? Set up automatic builds and deploys with GitHub?
  → No (we'll deploy manually)

? File dist/index.html already exists. Overwrite?
  → No (keep your build)
```

**Note:** Your `firebase.json` is already configured correctly, so this step might be skipped.

---

## Deployment Steps

### Step 1: Build Production Bundle

```bash
npm run build
```

**What happens:**
1. TypeScript compilation (`tsc`)
2. Vite bundles React app
3. Minifies JS/CSS
4. Outputs to `dist/` folder

**Expected output:**
```
vite v5.3.1 building for production...
✓ 1234 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.30 kB
dist/assets/index-a1b2c3d4.css   45.67 kB │ gzip: 12.34 kB
dist/assets/index-e5f6g7h8.js   890.12 kB │ gzip: 234.56 kB
✓ built in 12.34s
```

**Verify dist folder:**
```bash
ls -lh dist/
```

Should see:
- `index.html`
- `assets/` (CSS and JS bundles)
- `vite.svg` (favicon)

**If build fails:**

**Error: "Module not found"**
```bash
npm install
npm run build
```

**Error: "TypeScript errors"**
```bash
# See errors
npm run build

# Fix errors in source files
# Re-run build
```

---

### Step 2: Deploy to Firebase Hosting

**Option A - Deploy Everything (Recommended First Time):**

```bash
firebase deploy
```

**What deploys:**
- ✅ Firestore rules (route expense fix)
- ✅ Storage rules
- ✅ Cloud Functions (whatsappWebhook)
- ✅ Hosting (React app)

**Option B - Deploy Only Hosting (Faster for frontend changes):**

```bash
firebase deploy --only hosting
```

**Expected output:**
```
=== Deploying to 'glyde-platform'...

i  hosting[glyde-platform]: beginning deploy...
i  hosting[glyde-platform]: found 15 files in dist
✔  hosting[glyde-platform]: file upload complete
i  hosting[glyde-platform]: finalizing version...
✔  hosting[glyde-platform]: version finalized
i  hosting[glyde-platform]: releasing new version...
✔  hosting[glyde-platform]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/glyde-platform/overview
Hosting URL: https://glyde-platform.web.app
```

**Deployment time:** 30-60 seconds

---

### Step 3: Verify Deployment

**Your app is now live at:**
- **Primary URL:** https://glyde-platform.web.app
- **Alternative:** https://glyde-platform.firebaseapp.com

**Test checklist:**

1. **Homepage loads:**
   - Visit https://glyde-platform.web.app
   - Should see login/signup page

2. **Login works:**
   - Email: `admin@glyde.com`
   - Password: `password123`
   - Should redirect to dashboard

3. **Role selection:**
   - Signup as new user
   - Select role (Individual/Business/Partner)
   - Complete onboarding flow

4. **Dashboard features:**
   - Click through different nav items
   - Check if maps load (Google Maps API)
   - Create test invoice
   - Preview invoice PDF

5. **WhatsApp integration:**
   - Send message to your WhatsApp Business number
   - Verify webhook responds
   - Test natural commands ("show", "send")

6. **Multi-language:**
   - Click globe icon in header
   - Switch to Hausa/Igbo/Yoruba
   - Verify translations work

**Common Issues:**

**Issue: White screen on load**

**Cause:** Build path mismatch or Firebase config missing

**Debug:**
```bash
# Check browser console (F12)
# Look for errors like:
# - "Failed to fetch firebase config"
# - "Module not found"

# Verify .env variables are set
cat .env | grep VITE_FIREBASE
```

**Fix:**
```bash
# Rebuild with fresh dependencies
rm -rf dist node_modules
npm install
npm run build
firebase deploy --only hosting
```

---

**Issue: "Firebase: Error (auth/configuration-not-found)"**

**Cause:** Firebase Authentication not enabled

**Fix:**
1. Go to [Firebase Console → Authentication](https://console.firebase.google.com/project/glyde-platform/authentication)
2. Click "Get Started"
3. Enable "Email/Password" sign-in method
4. Redeploy: `firebase deploy --only hosting`

---

**Issue: Maps not loading**

**Cause:** Google Maps API key missing or invalid

**Debug:**
```bash
# Check if API key is set
cat .env | grep VITE_GOOGLE_MAPS_API_KEY
```

**Fix:**
1. Get API key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Add to `.env`:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
   ```
3. Rebuild and redeploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

**Issue: Firestore permission denied**

**Cause:** Rules not deployed

**Fix:**
```bash
firebase deploy --only firestore:rules
```

---

## Custom Domain Setup (Optional)

### Add Your Own Domain (e.g., glyde.ng)

**Step 1: Add domain in Firebase Console**

1. Go to [Hosting → Add Custom Domain](https://console.firebase.google.com/project/glyde-platform/hosting/sites)
2. Enter domain: `glyde.ng`
3. Firebase provides DNS records

**Step 2: Update DNS (at your domain registrar)**

Add these records (example from Firebase):

**Type A:**
```
Name: @
Value: 151.101.1.195
```

**Type A:**
```
Name: @
Value: 151.101.65.195
```

**Type TXT (verification):**
```
Name: @
Value: firebase=glyde-platform
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: glyde-platform.web.app
```

**Step 3: Wait for DNS propagation (5-60 minutes)**

Check status:
```bash
dig glyde.ng
```

Should return Firebase IP addresses.

**Step 4: Firebase auto-provisions SSL certificate**

Firebase automatically generates free SSL (HTTPS) via Let's Encrypt.

**Your app will be available at:**
- https://glyde.ng (primary)
- https://www.glyde.ng
- https://glyde-platform.web.app (original)

---

## Post-Deployment Configuration

### Update WhatsApp Webhook URL

**If you deployed Cloud Functions, update Meta webhook URL:**

1. Go to [Meta for Developers → WhatsApp → Configuration](https://developers.facebook.com/apps)
2. Update webhook URL to:
   ```
   https://us-central1-glyde-platform.cloudfunctions.net/whatsappWebhook
   ```
3. Verify token: `transport_saas_verify_2024`
4. Subscribe to messages webhook

**Test webhook:**
```bash
# Send test message from WhatsApp
# Check logs
firebase functions:log --only whatsappWebhook
```

---

### Enable Firebase Analytics (Optional)

**See user activity, page views, and usage stats:**

1. Go to [Firebase Console → Analytics](https://console.firebase.google.com/project/glyde-platform/analytics)
2. Click "Enable Analytics"
3. Follow setup prompts

**Your app already has Analytics configured** (see `VITE_FIREBASE_MEASUREMENT_ID` in `.env`).

After enabling, you'll see:
- Active users
- Page views
- User retention
- Conversion funnels

---

## Continuous Deployment (CI/CD)

### Option 1: GitHub Actions (Automated)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: glyde-platform
```

**Setup:**
1. Generate service account key from [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Add to GitHub Secrets as `FIREBASE_SERVICE_ACCOUNT`
3. Push to main branch → auto-deploys

---

### Option 2: Manual Deploy (Current)

**Every time you make changes:**

```bash
# 1. Make code changes
# 2. Test locally
npm run dev

# 3. Build and deploy
npm run build
firebase deploy --only hosting
```

---

## Production Optimizations

### 1. Enable Gzip Compression

Already enabled by default in Firebase Hosting!

Verify:
```bash
curl -I https://glyde-platform.web.app
```

Should see:
```
Content-Encoding: gzip
```

---

### 2. Lazy Load Routes

**Current:** All components bundle into one file (~890 KB)

**Optimize:** Split by route

**In `src/App.tsx`, use React.lazy:**

```typescript
import React, { Suspense, lazy } from 'react';

const Dashboard = lazy(() => import('./components/Dashboard'));
const IndividualDashboard = lazy(() => import('./components/dashboards/IndividualDashboard'));
const BusinessDashboard = lazy(() => import('./components/dashboards/BusinessDashboard'));
const PartnerDashboard = lazy(() => import('./components/dashboards/PartnerDashboard'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* Your routes */}
    </Suspense>
  );
}
```

**Rebuild:**
```bash
npm run build
```

**Result:** Multiple smaller bundles, faster initial load

---

### 3. Image Optimization

**For driver photos, vehicle images:**

**Install image optimization package:**
```bash
npm install vite-plugin-imagemin -D
```

**Update `vite.config.ts`:**
```typescript
import imagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    react(),
    imagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9], speed: 4 },
      svgo: { plugins: [{ name: 'removeViewBox', active: false }] },
    }),
  ],
});
```

**Rebuild and deploy:**
```bash
npm run build
firebase deploy --only hosting
```

---

### 4. Cache Control Headers

**Firebase Hosting auto-configures:**
- `index.html`: No cache (always fresh)
- `assets/*.js`, `assets/*.css`: 1 year cache (versioned filenames)

**To customize, add to `firebase.json`:**

```json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## Monitoring & Analytics

### 1. Firebase Performance Monitoring

**Track app performance:**

```bash
npm install firebase-performance
```

**Add to `src/firebase/firebaseConfig.ts`:**
```typescript
import { getPerformance } from 'firebase/performance';

const perf = getPerformance(app);
```

**Redeploy:**
```bash
npm run build
firebase deploy --only hosting
```

**View metrics:**
- [Firebase Console → Performance](https://console.firebase.google.com/project/glyde-platform/performance)
- Page load times
- Network requests
- Custom traces

---

### 2. Error Tracking (Sentry)

**Catch production errors:**

```bash
npm install @sentry/react
```

**Configure in `src/main.tsx`:**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your_sentry_dsn_here",
  environment: "production",
  tracesSampleRate: 1.0,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>
);
```

---

### 3. Hosting Metrics

**View in Firebase Console:**
- [Hosting → Dashboard](https://console.firebase.google.com/project/glyde-platform/hosting)

**Metrics:**
- Total requests
- Data transfer (GB)
- SSL certificate status
- Build history

---

## Rollback & Version Management

### Rollback to Previous Version

**If new deploy has bugs:**

```bash
firebase hosting:channel:deploy preview
```

**View all deployments:**
```bash
firebase hosting:sites:list
```

**Rollback in Firebase Console:**
1. Go to Hosting → Release History
2. Click "⋮" on previous version
3. Click "Rollback"

**Or use CLI:**
```bash
firebase hosting:clone glyde-platform:previous-version glyde-platform:live
```

---

### Preview Channels (Staging)

**Deploy to staging URL first:**

```bash
firebase hosting:channel:deploy staging
```

**Result:**
```
✔  Channel URL (staging): https://glyde-platform--staging-abc123.web.app
```

**Test staging, then promote to live:**
```bash
firebase hosting:channel:deploy staging --expires 7d
# Test at staging URL
# If good, promote:
firebase hosting:clone glyde-platform:staging glyde-platform:live
```

---

## Cost & Limits (Free Tier)

### Firebase Hosting Free Tier:

**Storage:**
- 10 GB stored
- Enough for ~1000 deployments

**Bandwidth:**
- 360 MB/day
- ~10,000 page loads/day (assuming 35 KB/page)

**SSL:**
- Free automatic SSL
- Auto-renewal

**Custom domains:**
- Unlimited domains
- Free SSL for all

**Overage:** If exceeded, automatic upgrade to Blaze plan (pay-as-you-go)

**Typical monthly cost:** $0 for most apps (within free tier)

---

## Security Best Practices

### 1. Environment Variables

**Never commit `.env` to git:**

```bash
# Verify .env is in .gitignore
cat .gitignore | grep .env
```

Should see:
```
.env
.env.local
```

**For production secrets, use Firebase Functions config:**
```bash
firebase functions:config:set paystack.secret_key="sk_live_..."
```

---

### 2. Firestore Security Rules

**Already configured and deployed!**

Verify:
```bash
firebase firestore:rules:view
```

Should show organization-scoped rules with parent document checks for subcollections.

---

### 3. Content Security Policy (CSP)

**Add CSP header to `firebase.json`:**

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
          }
        ]
      }
    ]
  }
}
```

**Redeploy:**
```bash
firebase deploy --only hosting:glyde-platform
```

---

## Troubleshooting Common Issues

### Deploy fails with "Error: HTTP Error: 403"

**Cause:** Insufficient permissions

**Fix:**
```bash
firebase login --reauth
firebase use glyde-platform
firebase deploy
```

---

### Build succeeds but deploy shows old version

**Cause:** Browser cache

**Fix:**
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Open incognito/private window
4. Check file hash changed:
   ```bash
   ls -l dist/assets/*.js
   # Hash in filename should be different from previous build
   ```

---

### "firebase.json not found"

**Cause:** Running deploy from wrong directory

**Fix:**
```bash
cd /home/sir_dan_carter/Desktop/Project\ Files/Transport-SaaS
firebase deploy
```

---

### Deployment stuck at "Uploading files..."

**Cause:** Large node_modules accidentally included

**Fix:**

**Check `.firebaserc` ignore patterns:**
```json
{
  "hosting": {
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}
```

**Force clean deploy:**
```bash
rm -rf dist
npm run build
firebase deploy --only hosting
```

---

## Performance Benchmarks

### Expected Metrics (After Optimization):

**Lighthouse Score (Target):**
- Performance: 85-95
- Accessibility: 90-100
- Best Practices: 90-100
- SEO: 90-100

**Load Times:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Total Bundle Size: < 500 KB (gzipped)

**Test with:**
```bash
npm install -g lighthouse
lighthouse https://glyde-platform.web.app --view
```

---

## Next Steps After Deployment

1. ✅ **Test all features on production URL**
2. ✅ **Update WhatsApp webhook URL in Meta console**
3. ✅ **Monitor Firebase Console for errors**
4. ✅ **Set up custom domain (optional)**
5. ✅ **Enable Firebase Analytics**
6. ✅ **Configure GitHub Actions for auto-deploy (optional)**
7. ✅ **Run Lighthouse audit and optimize**
8. ✅ **Set up Sentry for error tracking (optional)**

---

## Quick Reference Commands

```bash
# Build production
npm run build

# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# View live logs
firebase functions:log --only whatsappWebhook

# Preview locally before deploy
npm run preview

# List Firebase projects
firebase projects:list

# Switch project
firebase use glyde-platform

# View hosting URLs
firebase hosting:sites:list

# Rollback to previous version (in console)
# Hosting → Release History → Rollback
```

---

## Support Resources

- **Firebase Hosting Docs:** https://firebase.google.com/docs/hosting
- **Firebase Console:** https://console.firebase.google.com/project/glyde-platform
- **Vite Build Docs:** https://vitejs.dev/guide/build.html
- **Project Docs:** See [CLAUDE.md](./CLAUDE.md) for architecture details

---

**Ready to deploy? Run:**

```bash
npm run build && firebase deploy
```

Your app will be live at **https://glyde-platform.web.app** in ~60 seconds! 🚀
