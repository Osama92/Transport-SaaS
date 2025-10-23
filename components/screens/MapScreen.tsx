import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Driver, Transporter, Vehicle } from '../../types';

// This is a union type of things that have a location and can be displayed on the map
type Mappable = Driver | Transporter | Vehicle;

// A type guard to check if an item has lat and lng
function isMappableWithLocation(item: Mappable): item is Mappable & { lat: number; lng: number } {
    return item.lat != null && item.lng != null;
}

// A helper to get a consistent name for any mappable item
function getItemName(item: Mappable): string {
    if ('name' in item && typeof item.name === 'string') {
        return item.name; // For Driver and Transporter
    }
    if ('make' in item) {
        return `${item.make} ${item.model} (${item.plateNumber})`; // For Vehicle
    }
    return `Item ${item.id}`;
}


interface MapScreenProps {
    items: Mappable[];
}

const statusColors: { [key: string]: string } = {
    'On-route': 'bg-green-500',
    'Active': 'bg-green-500',
    'Idle': 'bg-orange-500',
    'Offline': 'bg-gray-500',
    'Inactive': 'bg-gray-500',
    'In-Shop': 'bg-yellow-500',
};

const MapScreen: React.FC<MapScreenProps> = ({ items }) => {
    const mappableItems = items.filter(isMappableWithLocation);
    const center: [number, number] = mappableItems.length > 0
        ? [mappableItems[0].lat, mappableItems[0].lng]
        : [6.5244, 3.3792]; // Default to Lagos, Nigeria

    return (
        <div className="h-full w-full bg-gray-200 rounded-xl overflow-hidden shadow-lg">
            <MapContainer center={center} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mappableItems.map(item => (
                    <Marker key={item.id} position={[item.lat, item.lng]}>
                        <Popup>
                            <div className="font-sans">
                                <h3 className="font-bold text-md mb-1">{getItemName(item)}</h3>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={`w-2 h-2 rounded-full ${statusColors[item.status] || 'bg-gray-400'}`}></span>
                                    {item.status}
                                </div>
                                {'rating' in item && typeof item.rating === 'number' && (
                                    <p className="text-xs mt-1">Rating: {item.rating}</p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapScreen;