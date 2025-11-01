/**
 * RouteMapGoogle Component
 * Displays an interactive Google Map showing route with origin, destination, and all stops
 * Uses @react-google-maps/api for map visualization
 */

import React from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { RouteStop } from '../../types';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';

interface RouteMapGoogleProps {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    stops: RouteStop[];
    height?: string; // Map height (e.g., "400px", "50vh")
}

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
};

const RouteMapGoogle: React.FC<RouteMapGoogleProps> = ({
    origin,
    destination,
    stops,
    height = '500px'
}) => {
    const { isLoaded, loadError } = useGoogleMaps();
    const [selectedMarker, setSelectedMarker] = React.useState<string | null>(null);

    if (loadError) {
        return (
            <div style={{ height }} className="flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-lg">
                <p className="text-red-600">Error loading maps</p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div style={{ height }} className="flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
            </div>
        );
    }

    // Calculate map center and bounds
    const allPoints = [
        origin,
        ...stops.map(s => s.coordinates),
        destination
    ];

    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach(point => bounds.extend(point));

    const center = {
        lat: (origin.lat + destination.lat) / 2,
        lng: (origin.lng + destination.lng) / 2
    };

    // Create route path
    const routePath = [
        origin,
        ...stops.map(stop => stop.coordinates),
        destination
    ];

    return (
        <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }} className="shadow-lg">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={center}
                options={mapOptions}
                onLoad={(map) => {
                    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
                }}
            >
                {/* Origin Marker (A) - Green */}
                <Marker
                    position={origin}
                    label={{
                        text: 'A',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}
                    icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="3"/>
                            </svg>`
                        ),
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20),
                        labelOrigin: new google.maps.Point(20, 20)
                    }}
                    onClick={() => setSelectedMarker('origin')}
                />

                {/* Destination Marker (B) - Red */}
                <Marker
                    position={destination}
                    label={{
                        text: 'B',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}
                    icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="18" fill="#ef4444" stroke="white" stroke-width="3"/>
                            </svg>`
                        ),
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20),
                        labelOrigin: new google.maps.Point(20, 20)
                    }}
                    onClick={() => setSelectedMarker('destination')}
                />

                {/* Stop Markers - Blue with sequence numbers */}
                {stops.map((stop) => (
                    <Marker
                        key={stop.id}
                        position={stop.coordinates}
                        label={{
                            text: stop.sequence.toString(),
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                        icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                                `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
                                    <circle cx="17.5" cy="17.5" r="15" fill="#3b82f6" stroke="white" stroke-width="2.5"/>
                                </svg>`
                            ),
                            scaledSize: new google.maps.Size(35, 35),
                            anchor: new google.maps.Point(17.5, 17.5),
                            labelOrigin: new google.maps.Point(17.5, 17.5)
                        }}
                        onClick={() => setSelectedMarker(stop.id)}
                    />
                ))}

                {/* Route Polyline */}
                <Polyline
                    path={routePath}
                    options={{
                        strokeColor: '#3b82f6',
                        strokeOpacity: 0.7,
                        strokeWeight: 4,
                    }}
                />

                {/* Info Windows */}
                {selectedMarker === 'origin' && (
                    <InfoWindow
                        position={origin}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div style={{ minWidth: '150px' }}>
                            <strong style={{ color: '#10b981' }}>Origin</strong>
                            <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                                {stops[0]?.address || 'Starting Point'}
                            </p>
                        </div>
                    </InfoWindow>
                )}

                {selectedMarker === 'destination' && (
                    <InfoWindow
                        position={destination}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div style={{ minWidth: '150px' }}>
                            <strong style={{ color: '#ef4444' }}>Destination</strong>
                            <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                                {stops[stops.length - 1]?.address || 'End Point'}
                            </p>
                        </div>
                    </InfoWindow>
                )}

                {stops.map((stop) => selectedMarker === stop.id && (
                    <InfoWindow
                        key={stop.id}
                        position={stop.coordinates}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div style={{ minWidth: '200px' }}>
                            <div style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
                                Stop {stop.sequence}
                            </div>
                            <div style={{ fontSize: '13px', marginBottom: '2px' }}>
                                <strong>Address:</strong><br/>{stop.address}
                            </div>
                            {stop.recipientName && (
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    <strong>Recipient:</strong> {stop.recipientName}
                                </div>
                            )}
                            {stop.recipientPhone && (
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    <strong>Phone:</strong> {stop.recipientPhone}
                                </div>
                            )}
                            {stop.deliveryNotes && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    <strong>Notes:</strong> {stop.deliveryNotes}
                                </div>
                            )}
                        </div>
                    </InfoWindow>
                ))}
            </GoogleMap>
        </div>
    );
};

export default RouteMapGoogle;
