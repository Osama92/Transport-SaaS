/**
 * Route Optimization Utilities
 * Fallback optimization algorithms that don't require external APIs
 */

import { RouteStop } from '../types';

/**
 * Optimize stops using nearest-neighbor algorithm (greedy approach)
 * This is a free, offline algorithm that provides decent optimization
 * without requiring Google API calls
 *
 * @param origin - Starting point coordinates
 * @param destination - Ending point coordinates
 * @param stops - Array of stops to optimize
 * @returns Optimized stops in best sequence
 */
export function optimizeStopsNearestNeighbor(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    stops: RouteStop[]
): RouteStop[] {
    if (stops.length === 0) return [];
    if (stops.length === 1) {
        return [{ ...stops[0], sequence: 1 }];
    }

    const optimized: RouteStop[] = [];
    let currentPosition = origin;
    const remaining = [...stops];

    // Greedy nearest-neighbor algorithm
    while (remaining.length > 0) {
        const nearestStop = findNearestStop(currentPosition, remaining);

        optimized.push({
            ...nearestStop,
            sequence: optimized.length + 1
        });

        currentPosition = nearestStop.coordinates;
        const index = remaining.indexOf(nearestStop);
        remaining.splice(index, 1);
    }

    return optimized;
}

/**
 * Find the nearest stop from current position
 * @param from - Current position
 * @param stops - Available stops to choose from
 * @returns Nearest stop
 */
function findNearestStop(
    from: { lat: number; lng: number },
    stops: RouteStop[]
): RouteStop {
    return stops.reduce((nearest, stop) => {
        const distToStop = haversineDistance(
            from.lat,
            from.lng,
            stop.coordinates.lat,
            stop.coordinates.lng
        );

        const distToNearest = haversineDistance(
            from.lat,
            from.lng,
            nearest.coordinates.lat,
            nearest.coordinates.lng
        );

        return distToStop < distToNearest ? stop : nearest;
    });
}

/**
 * Calculate total route distance including all stops
 * @param origin - Starting point
 * @param stops - Ordered array of stops
 * @param destination - Ending point
 * @returns Total distance in kilometers
 */
export function calculateTotalDistance(
    origin: { lat: number; lng: number },
    stops: RouteStop[],
    destination: { lat: number; lng: number }
): number {
    if (stops.length === 0) {
        // Direct route from origin to destination
        return Math.round(haversineDistance(
            origin.lat,
            origin.lng,
            destination.lat,
            destination.lng
        ) * 1.3); // Add 30% buffer for actual road distance
    }

    let totalDistance = 0;
    let currentPoint = origin;

    // Distance from origin to first stop
    totalDistance += haversineDistance(
        currentPoint.lat,
        currentPoint.lng,
        stops[0].coordinates.lat,
        stops[0].coordinates.lng
    );

    // Distance between consecutive stops
    for (let i = 0; i < stops.length - 1; i++) {
        totalDistance += haversineDistance(
            stops[i].coordinates.lat,
            stops[i].coordinates.lng,
            stops[i + 1].coordinates.lat,
            stops[i + 1].coordinates.lng
        );
    }

    // Distance from last stop to destination
    const lastStop = stops[stops.length - 1];
    totalDistance += haversineDistance(
        lastStop.coordinates.lat,
        lastStop.coordinates.lng,
        destination.lat,
        destination.lng
    );

    // Add 30% buffer to account for actual road routing vs straight line
    return Math.round(totalDistance * 1.3);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * This gives the straight-line distance between two points on Earth
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
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

    return distance;
}

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time based on distance
 * Assumes average speed of 40 km/h in urban areas
 *
 * @param distanceKm - Distance in kilometers
 * @returns Estimated duration in minutes
 */
export function estimateTravelTime(distanceKm: number): number {
    const AVERAGE_SPEED_KMH = 40; // Urban average
    const hours = distanceKm / AVERAGE_SPEED_KMH;
    return Math.round(hours * 60);
}

/**
 * Validate that stops have required data for optimization
 * @param stops - Stops to validate
 * @returns true if all stops have coordinates
 */
export function validateStopsForOptimization(stops: RouteStop[]): boolean {
    return stops.every(stop =>
        stop.coordinates &&
        typeof stop.coordinates.lat === 'number' &&
        typeof stop.coordinates.lng === 'number' &&
        !isNaN(stop.coordinates.lat) &&
        !isNaN(stop.coordinates.lng)
    );
}
