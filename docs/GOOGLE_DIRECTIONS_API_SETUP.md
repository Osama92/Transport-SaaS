# Google Directions API Setup Guide

## Current Status

The route optimization feature is **fully functional** with two optimization methods:

1. **Quick Optimize (Free)** ✅ - Uses nearest-neighbor algorithm with straight-line distance calculations. Works immediately without any setup.

2. **Google Optimize** ⚠️ - Uses Google Directions API for real road-based optimization. Requires Google Cloud setup (see below).

## How It Works

When a user clicks "Google Optimize" button:
- The app attempts to use Google Directions API
- **If API is not enabled**: Automatically falls back to Quick Optimize (free method)
- User sees a blue info message: "ℹ️ Google Directions API not enabled. Used free optimization instead. Route optimized successfully!"
- Route is still optimized correctly using the free algorithm

## Enabling Google Directions API (Optional)

To enable the premium Google Optimize feature:

### Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com

### Step 2: Select Your Project
- Click the project dropdown at the top
- Select: **glyde-platform** (or your Firebase project ID)

### Step 3: Enable the API
- Click the **"ENABLE"** button
- Wait 1-2 minutes for the API to activate

### Step 4: Verify Billing (Required)
Google Directions API requires a billing account:
- Go to: https://console.cloud.google.com/billing
- Link a payment method
- Note: Google provides $200/month free credit
- Typical cost: $5 per 1000 route optimizations

### Step 5: Test
- Reload your Transport SaaS app
- Create a route with multiple stops
- Click "Google Optimize" button
- Should work without fallback message

## API Key Already Configured

The API key is already set in:
- `.env` file: `VITE_GOOGLE_MAPS_API_KEY=AIzaSyDELbTZfxz3r0r_RdyE-acr0AtZAw6u-WI`
- `index.html`: Google Maps SDK is loaded automatically

## Cost Information

### Free Tier (Current - Quick Optimize)
- ✅ Unlimited optimizations
- ✅ No API costs
- ✅ No billing required
- ⚠️ Uses straight-line distance (less accurate)

### Premium Tier (Google Optimize)
- ✅ Uses real road distances
- ✅ Considers traffic patterns
- ✅ More accurate time estimates
- ✅ $200/month free credit from Google
- 💰 $5 per 1000 optimizations (after free credit)
- 💰 Requires billing account

## Recommended Setup

For production use, we recommend:

1. **Start with Quick Optimize** (free) to validate the feature
2. **Monitor usage** to estimate Google API costs
3. **Enable Google Optimize** only if:
   - You need road-based accuracy
   - You're optimizing 100+ routes per month
   - Budget allows for API costs

## Troubleshooting

### "REQUEST_DENIED" Error
**Solution**: The app automatically falls back to Quick Optimize. No action needed unless you want premium features.

### "API key not authorized" Error
**Solution**: Enable Directions API in Google Cloud Console (see Step 3 above).

### "Billing account required" Error
**Solution**: Add a payment method to Google Cloud (see Step 4 above). Google won't charge unless you exceed $200/month free credit.

## Technical Implementation

The system uses a **graceful fallback strategy**:

```javascript
try {
    // Attempt Google Directions API
    const result = await optimizeRouteWithGoogle(origin, destination, stops);
} catch (error) {
    // Automatically fallback to free algorithm
    const result = optimizeStopsNearestNeighbor(origin, destination, stops);
    // Show blue info message (not an error)
}
```

This ensures the feature **always works**, regardless of Google API status.

## Next Steps

1. ✅ Route optimization is working with free algorithm
2. ⬜ (Optional) Enable Google Directions API for premium features
3. ⬜ Monitor user feedback on optimization accuracy
4. ⬜ Consider enabling premium if users need road-based precision

---

**Last Updated**: 2025-11-01
**Feature Status**: ✅ Production Ready (Free Tier)
**Google API Status**: ⚠️ Optional Enhancement
