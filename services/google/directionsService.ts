/**
 * Google Directions API Service
 * Handles route optimization using Google Maps JavaScript SDK DirectionsService
 *
 * Note: The Google Directions API doesn't support direct browser requests due to CORS.
 * We use the JavaScript SDK which is loaded via script tag in index.html
 */

import { RouteStop } from '../../types';

interface OptimizedRouteResult {
    optimizedStops: RouteStop[];      // Reordered stops in optimal sequence
    totalDistanceKm: number;          // Total distance in kilometers
    totalDurationMinutes: number;     // Total travel time in minutes
    polyline: string;                 // Encoded polyline for map display
    legs: Array<{                     // Each segment details
        distance: number;             // Distance in km
        duration: number;             // Duration in minutes
        startAddress: string;
        endAddress: string;
    }>;
}

/**
 * Ensure Google Maps JavaScript API is loaded
 */
function ensureGoogleMapsLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof google !== 'undefined' && google.maps) {
            resolve();
            return;
        }

        // Wait for Google Maps to load (max 10 seconds)
        let attempts = 0;
        const maxAttempts = 50; // 50 * 200ms = 10 seconds
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof google !== 'undefined' && google.maps) {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('Google Maps JavaScript API failed to load. Please check your internet connection.'));
            }
        }, 200);
    });
}

/**
 * Optimize route using Google Maps JavaScript SDK DirectionsService
 * @param origin - Starting point address or coordinates
 * @param destination - Ending point address or coordinates
 * @param stops - Array of stops to optimize
 * @param apiKey - Google Maps API key (not used by SDK, but kept for consistency)
 * @returns Optimized route with reordered stops and distance/duration
 */
export async function optimizeRouteWithGoogle(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number },
    stops: RouteStop[],
    apiKey?: string // Optional since SDK uses key from script tag
): Promise<OptimizedRouteResult> {
    // Validate stop count (Google API limit is 25 waypoints)
    if (stops.length > 15) {
        throw new Error('Maximum 15 stops allowed');
    }

    if (stops.length === 0) {
        throw new Error('At least one stop is required for optimization');
    }

    try {
        // Ensure Google Maps is loaded
        await ensureGoogleMapsLoaded();

        // Create DirectionsService instance
        const directionsService = new google.maps.DirectionsService();

        // Convert origin/destination to LatLng or string format
        const originLocation = typeof origin === 'string'
            ? origin
            : new google.maps.LatLng(origin.lat, origin.lng);

        const destinationLocation = typeof destination === 'string'
            ? destination
            : new google.maps.LatLng(destination.lat, destination.lng);

        // Build waypoints array with optimization enabled
        const waypoints = stops.map(stop => ({
            location: new google.maps.LatLng(stop.coordinates.lat, stop.coordinates.lng),
            stopover: true
        }));

        // Make directions request with waypoint optimization
        const request: google.maps.DirectionsRequest = {
            origin: originLocation,
            destination: destinationLocation,
            waypoints: waypoints,
            optimizeWaypoints: true, // Enable Google's waypoint optimization
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC
        };

        // Call DirectionsService
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
            directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    resolve(result);
                } else {
                    reject(new Error(`Google Directions Error: ${status}`));
                }
            });
        });

        // Extract optimized order from response
        const optimizedOrder = result.routes[0].waypoint_order || [];

        // Reorder stops based on Google's optimization
        const optimizedStops = optimizedOrder.map((originalIndex: number, newSequence: number) => ({
            ...stops[originalIndex],
            sequence: newSequence + 1, // 1-based indexing
            estimatedArrival: undefined // Google SDK doesn't provide arrival times in basic request
        }));

        // Calculate totals from route legs
        const legs = result.routes[0].legs;
        const totalDistance = legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) / 1000; // Convert to km
        const totalDuration = legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0) / 60; // Convert to minutes

        return {
            optimizedStops,
            totalDistanceKm: Math.round(totalDistance * 10) / 10, // Round to 1 decimal
            totalDurationMinutes: Math.round(totalDuration),
            polyline: result.routes[0].overview_polyline || '',
            legs: legs.map((leg) => ({
                distance: Math.round(((leg.distance?.value || 0) / 1000) * 10) / 10,
                duration: Math.round((leg.duration?.value || 0) / 60),
                startAddress: leg.start_address || '',
                endAddress: leg.end_address || ''
            }))
        };
    } catch (error: any) {
        console.error('Google Directions API error:', error);
        throw new Error(`Failed to optimize route: ${error.message}`);
    }
}

/**
 * Decode Google polyline string to array of lat/lng coordinates
 * Used for displaying route on map
 * @param encoded - Encoded polyline string from Google
 * @returns Array of {lat, lng} coordinates
 */
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
    const points: Array<{ lat: number; lng: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
        let b: number;
        let shift = 0;
        let result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push({
            lat: lat / 1e5,
            lng: lng / 1e5
        });
    }

    return points;
}

/**
 * Calculate distance between two coordinates (straight line)
 * Used as fallback when Google API is unavailable
 * @param point1 - First coordinate
 * @param point2 - Second coordinate
 * @returns Distance in kilometers
 */
export function calculateStraightLineDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(point2.lat - point1.lat);
    const dLon = toRadians(point2.lng - point1.lng);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(point1.lat)) *
        Math.cos(toRadians(point2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}
