import React, { useRef, useEffect, useState } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(value);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const autocompleteServiceRef = useRef<any>(null);
    const placesServiceRef = useRef<any>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Load Google Maps API with new Places library
    useEffect(() => {
        const loadGoogleMaps = async () => {
            try {
                // Check if already loaded
                if ((window as any).google?.maps?.places) {
                    initializeServices();
                    setIsLoaded(true);
                    return;
                }

                // Dynamically load the Google Maps script
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
                script.async = true;
                script.defer = true;

                script.onload = () => {
                    initializeServices();
                    setIsLoaded(true);
                };

                script.onerror = () => {
                    setLoadError(true);
                };

                document.head.appendChild(script);
            } catch (error) {
                console.error('Error loading Google Maps:', error);
                setLoadError(true);
            }
        };

        const initializeServices = () => {
            const google = (window as any).google;
            if (google && google.maps && google.maps.places) {
                autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
                // We'll create a hidden div for Places Service
                const div = document.createElement('div');
                placesServiceRef.current = new google.maps.places.PlacesService(div);
            }
        };

        loadGoogleMaps();
    }, []);

    // Handle input changes and fetch suggestions
    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);

        if (newValue.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (!autocompleteServiceRef.current) return;

        try {
            autocompleteServiceRef.current.getPlacePredictions(
                {
                    input: newValue,
                    componentRestrictions: { country: 'ng' },
                    types: ['geocode', 'establishment']
                },
                (predictions: any, status: any) => {
                    if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
                        setSuggestions(predictions);
                        setShowSuggestions(true);
                    } else {
                        setSuggestions([]);
                        setShowSuggestions(false);
                    }
                }
            );
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    };

    // Handle suggestion selection
    const handleSuggestionClick = (suggestion: any) => {
        if (!placesServiceRef.current) return;

        // Get place details
        placesServiceRef.current.getDetails(
            {
                placeId: suggestion.place_id,
                fields: ['geometry', 'formatted_address', 'name']
            },
            (place: any, status: any) => {
                if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place) {
                    const formattedAddress = place.formatted_address || place.name || '';
                    const coordinates = place.geometry?.location ? {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    } : undefined;

                    setInputValue(formattedAddress);
                    onChange(formattedAddress, suggestion.place_id, coordinates);
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            }
        );
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
        <div className="relative">
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
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={placeholder}
                    required={required}
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={suggestion.place_id}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-start gap-2 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                            >
                                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {suggestion.structured_formatting.main_text}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {suggestion.structured_formatting.secondary_text}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Type to search for locations in Nigeria (e.g., "Lagos", "Ojota Bus Stop")
            </p>
        </div>
    );
};

export default GooglePlacesAutocomplete;
