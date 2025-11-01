/**
 * Stop POD (Proof of Delivery) Modal
 * Allows drivers to capture POD for individual stops
 * Features: Photo capture, signature, delivery notes
 */

import React, { useState, useRef } from 'react';
import { RouteStop } from '../../types';

interface StopPODModalProps {
    stop: RouteStop;
    onSubmit: (podData: {
        photo?: File;
        photoUrl?: string;
        signature?: string;
        deliveryNotes: string;
        recipientName: string;
    }) => void;
    onClose: () => void;
}

const StopPODModal: React.FC<StopPODModalProps> = ({ stop, onSubmit, onClose }) => {
    const [deliveryNotes, setDeliveryNotes] = useState(stop.deliveryNotes || '');
    const [recipientName, setRecipientName] = useState(stop.recipientName || '');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(stop.podPhotoUrl || null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Photo handling
    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPhoto(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setPhotoPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleTakePhoto = () => {
        fileInputRef.current?.click();
    };

    const handleRemovePhoto = () => {
        setPhoto(null);
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = () => {
        if (!recipientName.trim()) {
            alert('Please enter recipient name');
            return;
        }

        onSubmit({
            photo,
            photoUrl: photoPreview || undefined,
            signature: undefined,
            deliveryNotes,
            recipientName: recipientName.trim()
        });

        // Reset form after submission
        setDeliveryNotes('');
        setRecipientName('');
        setPhoto(null);
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 p-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Proof of Delivery
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Stop {stop.sequence} - {stop.address}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Recipient Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Recipient Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Enter recipient's name"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Photo Capture */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Delivery Photo (Optional)
                        </label>

                        {photoPreview ? (
                            <div className="relative">
                                <img
                                    src={photoPreview}
                                    alt="Delivery"
                                    className="w-full h-64 object-cover rounded-lg border-2 border-gray-300 dark:border-slate-600"
                                />
                                <button
                                    onClick={handleRemovePhoto}
                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleTakePhoto}
                                className="w-full py-12 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex flex-col items-center justify-center space-y-2"
                            >
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Take Photo</span>
                            </button>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoCapture}
                            className="hidden"
                        />
                    </div>

                    {/* Delivery Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Delivery Notes (Optional)
                        </label>
                        <textarea
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            placeholder="Any additional notes about the delivery..."
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-900 border-t dark:border-slate-700 p-4 flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                        Confirm Delivery
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StopPODModal;
