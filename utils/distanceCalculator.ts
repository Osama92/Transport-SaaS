/**
 * Distance Calculator Utility
 * Uses Google Maps Distance Matrix API to calculate driving distance between two locations
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export interface DistanceCalculationResult {
    distance: number; // Distance in kilometers
    duration: number; // Duration in minutes
    success: boolean;
    error?: string;
}

/**
 * Calculate driving distance between origin and destination using Google Maps Distance Matrix API
 * @param origin - Starting location (e.g., "Lagos, Nigeria")
 * @param destination - Ending location (e.g., "Abuja, Nigeria")
 * @returns Promise with distance in km, duration in minutes, and success status
 */
export async function calculateDrivingDistance(
    origin: string,
    destination: string
): Promise<DistanceCalculationResult> {
    if (!origin || !destination) {
        return {
            distance: 0,
            duration: 0,
            success: false,
            error: 'Origin and destination are required'
        };
    }

    if (!GOOGLE_MAPS_API_KEY) {
        return {
            distance: 0,
            duration: 0,
            success: false,
            error: 'Google Maps API key not configured'
        };
    }

    try {
        // Use Google Maps Distance Matrix API (client-side with CORS proxy or direct call)
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;

        // Note: Direct browser calls to Google Maps API may face CORS issues
        // We'll use a workaround with fetch and handle CORS
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(data.error_message || 'Failed to calculate distance');
        }

        const element = data.rows[0]?.elements[0];

        if (!element || element.status !== 'OK') {
            throw new Error('No route found between locations');
        }

        // Extract distance in meters and duration in seconds
        const distanceMeters = element.distance.value;
        const durationSeconds = element.duration.value;

        // Convert to kilometers and minutes
        const distanceKm = Math.round(distanceMeters / 1000);
        const durationMinutes = Math.round(durationSeconds / 60);

        console.log('[DISTANCE] Calculated:', {
            origin,
            destination,
            distanceKm,
            durationMinutes,
            distanceText: element.distance.text,
            durationText: element.duration.text
        });

        return {
            distance: distanceKm,
            duration: durationMinutes,
            success: true
        };
    } catch (error: any) {
        console.error('[DISTANCE] Error calculating distance:', error);
        return {
            distance: 0,
            duration: 0,
            success: false,
            error: error.message || 'Failed to calculate distance'
        };
    }
}

/**
 * Calculate distance using client-side CORS-free approach with Google Maps Geocoding + Haversine
 * This is a fallback method that doesn't require server-side proxy
 */
export async function calculateDistanceFallback(
    origin: string,
    destination: string
): Promise<DistanceCalculationResult> {
    if (!origin || !destination) {
        return {
            distance: 0,
            duration: 0,
            success: false,
            error: 'Origin and destination are required'
        };
    }

    if (!GOOGLE_MAPS_API_KEY) {
        return {
            distance: 0,
            duration: 0,
            success: false,
            error: 'Google Maps API key not configured'
        };
    }

    try {
        // Geocode both locations
        const [originCoords, destCoords] = await Promise.all([
            geocodeLocation(origin),
            geocodeLocation(destination)
        ]);

        if (!originCoords || !destCoords) {
            throw new Error('Could not find coordinates for one or both locations');
        }

        // Calculate Haversine distance (straight-line)
        const straightLineDistance = haversineDistance(
            originCoords.lat,
            originCoords.lng,
            destCoords.lat,
            destCoords.lng
        );

        // Add 30% buffer for realistic road distance (roads aren't straight lines)
        const estimatedRoadDistance = Math.round(straightLineDistance * 1.3);

        // Estimate duration (assume average speed of 60 km/h)
        const estimatedDuration = Math.round((estimatedRoadDistance / 60) * 60);

        console.log('[DISTANCE] Fallback calculated:', {
            origin,
            destination,
            straightLineDistance,
            estimatedRoadDistance,
            estimatedDuration
        });

        return {
            distance: estimatedRoadDistance,
            duration: estimatedDuration,
            success: true
        };
    } catch (error: any) {
        console.error('[DISTANCE] Fallback error:', error);
        return {
            distance: 0,
            duration: 0,
            success: false,
            error: error.message || 'Failed to calculate distance'
        };
    }
}

/**
 * Geocode a location string to lat/lng coordinates
 */
async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        }

        return null;
    } catch (error) {
        console.error('[GEOCODE] Error:', error);
        return null;
    }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}
