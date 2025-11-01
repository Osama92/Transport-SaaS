/**
 * Google Maps JavaScript API Type Declarations
 * This allows TypeScript to recognize the global `google` object
 */

declare namespace google {
    namespace maps {
        class LatLng {
            constructor(lat: number, lng: number);
            lat(): number;
            lng(): number;
        }

        class DirectionsService {
            route(
                request: DirectionsRequest,
                callback: (result: DirectionsResult | null, status: DirectionsStatus) => void
            ): void;
        }

        interface DirectionsRequest {
            origin: string | LatLng;
            destination: string | LatLng;
            waypoints?: DirectionsWaypoint[];
            optimizeWaypoints?: boolean;
            travelMode: TravelMode;
            unitSystem?: UnitSystem;
        }

        interface DirectionsWaypoint {
            location: string | LatLng;
            stopover: boolean;
        }

        interface DirectionsResult {
            routes: DirectionsRoute[];
        }

        interface DirectionsRoute {
            legs: DirectionsLeg[];
            waypoint_order: number[];
            overview_polyline: string;
        }

        interface DirectionsLeg {
            distance?: { text: string; value: number };
            duration?: { text: string; value: number };
            start_address?: string;
            end_address?: string;
        }

        enum TravelMode {
            DRIVING = 'DRIVING',
            WALKING = 'WALKING',
            BICYCLING = 'BICYCLING',
            TRANSIT = 'TRANSIT'
        }

        enum DirectionsStatus {
            OK = 'OK',
            NOT_FOUND = 'NOT_FOUND',
            ZERO_RESULTS = 'ZERO_RESULTS',
            MAX_WAYPOINTS_EXCEEDED = 'MAX_WAYPOINTS_EXCEEDED',
            INVALID_REQUEST = 'INVALID_REQUEST',
            OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
            REQUEST_DENIED = 'REQUEST_DENIED',
            UNKNOWN_ERROR = 'UNKNOWN_ERROR'
        }

        enum UnitSystem {
            METRIC = 0,
            IMPERIAL = 1
        }
    }
}

declare var google: typeof google;
