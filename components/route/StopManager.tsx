/**
 * Stop Manager Component
 * Manages multiple stops for a route with add/edit/delete/reorder functionality
 */

import React, { useState } from 'react';
import { RouteStop } from '../../types';
import GooglePlacesAutocomplete from '../GooglePlacesAutocomplete';
import { TrashIcon, PencilIcon, PlusIcon } from '../Icons';

interface StopManagerProps {
    stops: RouteStop[];
    onStopsChange: (stops: RouteStop[]) => void;
    maxStops?: number;
}

interface EditingStop {
    id: string | 'new';
    address?: string;
    coordinates?: { lat: number; lng: number };
    recipientName?: string;
    recipientPhone?: string;
    deliveryNotes?: string;
}

const StopManager: React.FC<StopManagerProps> = ({
    stops,
    onStopsChange,
    maxStops = 15
}) => {
    const [editingStop, setEditingStop] = useState<EditingStop | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Generate unique ID
    const generateId = () => `stop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add new stop
    const handleAddStop = (
        address: string,
        coordinates: { lat: number; lng: number },
        recipientName?: string,
        recipientPhone?: string,
        deliveryNotes?: string
    ) => {
        if (stops.length >= maxStops) {
            alert(`Maximum ${maxStops} stops allowed`);
            return;
        }

        const newStop: RouteStop = {
            id: generateId(),
            sequence: stops.length + 1,
            address,
            coordinates,
            recipientName,
            recipientPhone,
            deliveryNotes,
            status: 'pending'
        };

        onStopsChange([...stops, newStop]);
        setEditingStop(null);
    };

    // Update existing stop
    const handleUpdateStop = (
        stopId: string,
        address: string,
        coordinates: { lat: number; lng: number },
        recipientName?: string,
        recipientPhone?: string,
        deliveryNotes?: string
    ) => {
        const updated = stops.map(stop =>
            stop.id === stopId
                ? { ...stop, address, coordinates, recipientName, recipientPhone, deliveryNotes }
                : stop
        );
        onStopsChange(updated);
        setEditingStop(null);
    };

    // Remove stop
    const handleRemoveStop = (stopId: string) => {
        const filtered = stops.filter(s => s.id !== stopId);
        // Resequence remaining stops
        const resequenced = filtered.map((stop, index) => ({
            ...stop,
            sequence: index + 1
        }));
        onStopsChange(resequenced);
    };

    // Drag and drop handlers
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const reordered = [...stops];
        const draggedStop = reordered[draggedIndex];
        reordered.splice(draggedIndex, 1);
        reordered.splice(index, 0, draggedStop);

        // Resequence
        const resequenced = reordered.map((stop, idx) => ({
            ...stop,
            sequence: idx + 1
        }));

        onStopsChange(resequenced);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Delivery Stops ({stops.length}/{maxStops})
                </h3>
                {stops.length < maxStops && (
                    <button
                        type="button"
                        onClick={() => setEditingStop({ id: 'new' })}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add Stop
                    </button>
                )}
            </div>

            {/* Stops List */}
            {stops.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-slate-700/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        No stops added yet. Click "Add Stop" to begin.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {stops.map((stop, index) => (
                        <div
                            key={stop.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`
                                bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700
                                p-3 cursor-move hover:shadow-md transition-shadow
                                ${draggedIndex === index ? 'opacity-50' : ''}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                {/* Sequence Number */}
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                        {stop.sequence}
                                    </span>
                                </div>

                                {/* Stop Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {stop.address}
                                    </p>
                                    {stop.recipientName && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            👤 {stop.recipientName}
                                            {stop.recipientPhone && ` • 📞 ${stop.recipientPhone}`}
                                        </p>
                                    )}
                                    {stop.deliveryNotes && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                            📝 {stop.deliveryNotes}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingStop({
                                            id: stop.id,
                                            address: stop.address,
                                            coordinates: stop.coordinates,
                                            recipientName: stop.recipientName,
                                            recipientPhone: stop.recipientPhone,
                                            deliveryNotes: stop.deliveryNotes
                                        })}
                                        className="p-1.5 text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                                        title="Edit stop"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveStop(stop.id)}
                                        className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                                        title="Remove stop"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Stop Modal */}
            {editingStop && (
                <AddEditStopModal
                    stop={editingStop.id === 'new' ? null : {
                        id: editingStop.id as string,
                        address: editingStop.address || '',
                        coordinates: editingStop.coordinates || { lat: 0, lng: 0 },
                        recipientName: editingStop.recipientName,
                        recipientPhone: editingStop.recipientPhone,
                        deliveryNotes: editingStop.deliveryNotes
                    }}
                    onSave={(data) => {
                        if (editingStop.id === 'new') {
                            handleAddStop(
                                data.address,
                                data.coordinates,
                                data.recipientName,
                                data.recipientPhone,
                                data.deliveryNotes
                            );
                        } else {
                            handleUpdateStop(
                                editingStop.id as string,
                                data.address,
                                data.coordinates,
                                data.recipientName,
                                data.recipientPhone,
                                data.deliveryNotes
                            );
                        }
                    }}
                    onClose={() => setEditingStop(null)}
                />
            )}
        </div>
    );
};

// Add/Edit Stop Modal Component
interface AddEditStopModalProps {
    stop: {
        id: string;
        address: string;
        coordinates: { lat: number; lng: number };
        recipientName?: string;
        recipientPhone?: string;
        deliveryNotes?: string;
    } | null;
    onSave: (data: {
        address: string;
        coordinates: { lat: number; lng: number };
        recipientName?: string;
        recipientPhone?: string;
        deliveryNotes?: string;
    }) => void;
    onClose: () => void;
}

const AddEditStopModal: React.FC<AddEditStopModalProps> = ({ stop, onSave, onClose }) => {
    const [address, setAddress] = useState(stop?.address || '');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(stop?.coordinates || null);
    const [recipientName, setRecipientName] = useState(stop?.recipientName || '');
    const [recipientPhone, setRecipientPhone] = useState(stop?.recipientPhone || '');
    const [deliveryNotes, setDeliveryNotes] = useState(stop?.deliveryNotes || '');

    const handleSubmit = () => {
        if (!address || !coordinates) {
            alert('Please select a valid address');
            return;
        }

        onSave({
            address,
            coordinates,
            recipientName: recipientName.trim() || undefined,
            recipientPhone: recipientPhone.trim() || undefined,
            deliveryNotes: deliveryNotes.trim() || undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        {stop ? 'Edit Stop' : 'Add Stop'}
                    </h3>

                    <div className="space-y-4">
                        {/* Address */}
                        <GooglePlacesAutocomplete
                            label="Delivery Address"
                            id="stop-address"
                            value={address}
                            onChange={(addr, placeId, coords) => {
                                setAddress(addr);
                                setCoordinates(coords || null);
                            }}
                            placeholder="Search for address..."
                            required
                        />

                        {/* Recipient Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Recipient Name
                            </label>
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                            />
                        </div>

                        {/* Recipient Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Recipient Phone
                            </label>
                            <input
                                type="tel"
                                value={recipientPhone}
                                onChange={(e) => setRecipientPhone(e.target.value)}
                                placeholder="+234 XXX XXX XXXX"
                                className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                            />
                        </div>

                        {/* Delivery Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Delivery Notes
                            </label>
                            <textarea
                                value={deliveryNotes}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                                placeholder="Ring doorbell, leave at reception, etc."
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                            >
                                {stop ? 'Update Stop' : 'Add Stop'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StopManager;
