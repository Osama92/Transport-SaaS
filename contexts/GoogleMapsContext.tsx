/**
 * GoogleMapsContext
 * Provides a single instance of Google Maps API loading for the entire app
 * Prevents multiple API loads which cause console warnings
 */

import React, { createContext, useContext } from 'react';
import { useLoadScript } from '@react-google-maps/api';

interface GoogleMapsContextType {
    isLoaded: boolean;
    loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
    isLoaded: false,
    loadError: undefined
});

export const useGoogleMaps = () => {
    const context = useContext(GoogleMapsContext);
    if (!context) {
        throw new Error('useGoogleMaps must be used within GoogleMapsProvider');
    }
    return context;
};

export const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places'] as const, // Required for GooglePlacesAutocomplete
    });

    return (
        <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
            {children}
        </GoogleMapsContext.Provider>
    );
};
