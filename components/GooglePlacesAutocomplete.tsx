import React, { useRef, useEffect, useState } from 'react';
import { useLoadScript } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const libraries: ("places")[] = ['places'];

interface GooglePlacesAutocompleteProps {
    label: string;
    value: string;
    onChange: (value: string, placeId?: string, coordinates?: { lat: number; lng: number }) => void;
    placeholder?: string;
    required?: boolean;
    id?: string;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
    label,
    value,
    onChange,
    placeholder = 'Enter a location',
    required = false,
    id = 'location'
}) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries,
    });

    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [inputValue, setInputValue] = useState(value);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        if (!isLoaded || !inputRef.current) return;

        // Initialize Google Places Autocomplete
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'ng' }, // Restrict to Nigeria
            fields: ['place_id', 'formatted_address', 'geometry', 'name'],
            types: ['geocode', 'establishment'], // Allow both addresses and places
        });

        autocompleteRef.current = autocomplete;

        // Listen for place selection
        const listener = autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();

            if (place.place_id && place.geometry?.location) {
                const formattedAddress = place.formatted_address || place.name || '';
                const coordinates = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };

                setInputValue(formattedAddress);
                onChange(formattedAddress, place.place_id, coordinates);
            }
        });

        return () => {
            google.maps.event.removeListener(listener);
        };
    }, [isLoaded, onChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        // Also update parent with text value (in case user types manually)
        onChange(newValue);
    };

    if (loadError) {
        return (
            <div>
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                    type="text"
                    id={id}
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    required={required}
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                />
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Failed to load autocomplete. You can still enter manually.
                </p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div>
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 dark:bg-slate-700 dark:border-slate-600 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-indigo-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Loading autocomplete...</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    id={id}
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    required={required}
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Type to search for locations in Nigeria (e.g., "Lagos", "Ojota Bus Stop")
            </p>
        </div>
    );
};

export default GooglePlacesAutocomplete;
