/**
 * RouteMap Component
 * Displays an interactive map showing route with origin, destination, and all stops
 * Uses Leaflet for map visualization
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteStop } from '../../types';

// Fix for default marker icons in Leaflet with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteMapProps {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    stops: RouteStop[];
    polyline?: string; // Encoded polyline from Google Directions API
    height?: string; // Map height (e.g., "400px", "50vh")
}

const RouteMap: React.FC<RouteMapProps> = ({
    origin,
    destination,
    stops,
    polyline,
    height = '500px'
}) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize map
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView(
                [origin.lat, origin.lng],
                12
            );

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(mapRef.current);
        }

        const map = mapRef.current;

        // Clear existing layers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        // Create custom icons
        const originIcon = L.divIcon({
            html: `<div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                <span style="color: white; font-weight: bold; font-size: 16px;">A</span>
            </div>`,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });

        const destinationIcon = L.divIcon({
            html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                <span style="color: white; font-weight: bold; font-size: 16px;">B</span>
            </div>`,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });

        const stopIcon = (sequence: number) => L.divIcon({
            html: `<div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                <span style="color: white; font-weight: bold; font-size: 12px;">${sequence}</span>
            </div>`,
            className: 'custom-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });

        // Add origin marker
        L.marker([origin.lat, origin.lng], { icon: originIcon })
            .addTo(map)
            .bindPopup(`<div style="text-align: center;"><strong>Origin</strong><br/>${stops[0]?.address || 'Starting Point'}</div>`);

        // Add destination marker
        L.marker([destination.lat, destination.lng], { icon: destinationIcon })
            .addTo(map)
            .bindPopup(`<div style="text-align: center;"><strong>Destination</strong><br/>${stops[stops.length - 1]?.address || 'End Point'}</div>`);

        // Add stop markers
        stops.forEach((stop) => {
            L.marker([stop.coordinates.lat, stop.coordinates.lng], {
                icon: stopIcon(stop.sequence)
            })
                .addTo(map)
                .bindPopup(`
                    <div style="min-width: 200px;">
                        <div style="font-weight: bold; color: #3b82f6; margin-bottom: 4px;">
                            Stop ${stop.sequence}
                        </div>
                        <div style="font-size: 13px; margin-bottom: 2px;">
                            <strong>Address:</strong><br/>${stop.address}
                        </div>
                        ${stop.recipientName ? `<div style="font-size: 12px; color: #64748b;">
                            <strong>Recipient:</strong> ${stop.recipientName}
                        </div>` : ''}
                        ${stop.recipientPhone ? `<div style="font-size: 12px; color: #64748b;">
                            <strong>Phone:</strong> ${stop.recipientPhone}
                        </div>` : ''}
                        ${stop.deliveryNotes ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                            <strong>Notes:</strong> ${stop.deliveryNotes}
                        </div>` : ''}
                    </div>
                `);
        });

        // Draw route line connecting all points
        if (stops.length > 0) {
            const routePoints: L.LatLngExpression[] = [
                [origin.lat, origin.lng],
                ...stops.map(stop => [stop.coordinates.lat, stop.coordinates.lng] as L.LatLngExpression),
                [destination.lat, destination.lng]
            ];

            L.polyline(routePoints, {
                color: '#3b82f6',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10',
            }).addTo(map);
        }

        // Fit map bounds to show all markers
        const bounds = L.latLngBounds([
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
            ...stops.map(stop => [stop.coordinates.lat, stop.coordinates.lng] as L.LatLngExpression)
        ]);

        map.fitBounds(bounds, { padding: [50, 50] });

        // Cleanup
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [origin, destination, stops, polyline]);

    return (
        <div
            ref={mapContainerRef}
            style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
            className="shadow-lg"
        />
    );
};

export default RouteMap;
