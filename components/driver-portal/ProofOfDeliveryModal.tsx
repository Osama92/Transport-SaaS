/**
 * Proof of Delivery Modal
 * Upload POD with photo, recipient details, and notes
 */

import React, { useState, useRef } from 'react';
import type { Route } from '../../types';

interface ProofOfDeliveryModalProps {
  route: Route;
  onClose: () => void;
  onSubmit: (data: {
    recipientName: string;
    deliveryNotes: string;
    deliveryPhoto?: File;
    odometerReading?: number;
  }) => Promise<void>;
}

const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({ route, onClose, onSubmit }) => {
  const [recipientName, setRecipientName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setPhoto(file);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!recipientName.trim()) {
      setError('Recipient name is required');
      return;
    }

    if (!photo) {
      setError('Please upload a delivery photo');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        recipientName: recipientName.trim(),
        deliveryNotes: deliveryNotes.trim(),
        deliveryPhoto: photo,
        odometerReading: odometerReading ? parseFloat(odometerReading) : undefined,
      });
    } catch (err) {
      setError('Failed to submit POD. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete Delivery</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {route.origin} → {route.destination}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {/* Recipient Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipient Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Enter recipient's full name"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Photo <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
            >
              {photoPreview ? (
                <div className="space-y-3">
                  <img
                    src={photoPreview}
                    alt="Delivery preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Remove photo
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Click to take or upload a photo
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              disabled={loading}
              className="hidden"
            />
          </div>

          {/* Odometer Reading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Odometer Reading (km) <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={odometerReading}
              onChange={(e) => setOdometerReading(e.target.value)}
              placeholder="Enter current odometer reading"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Delivery Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Notes <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Any additional notes or observations..."
              rows={4}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Route Summary */}
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Route Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-500">Vehicle:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{route.vehicle}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-500">Stops:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {Array.isArray(route.stops) ? route.stops.length : route.stops || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-500">Distance:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{route.distanceKm} km</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-500">Payment:</span>
                <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                  ₦{route.rate.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-300 rounded-lg font-medium
                       hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !recipientName || !photo}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium
                       hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Complete Delivery ✅</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProofOfDeliveryModal;
