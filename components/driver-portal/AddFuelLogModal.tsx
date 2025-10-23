/**
 * Add Fuel Log Modal
 * Form to log fuel refills with automatic fuel consumption calculation
 */

import React, { useState, useRef } from 'react';
import type { Vehicle } from '../../types';

interface AddFuelLogModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSubmit: (data: {
    currentOdometer: number;
    fuelQuantity: number;
    fuelCostPerLiter: number;
    stationName: string;
    location: string;
    receiptPhoto?: File;
  }) => Promise<void>;
}

const AddFuelLogModal: React.FC<AddFuelLogModalProps> = ({ vehicle, onClose, onSubmit }) => {
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [fuelCostPerLiter, setFuelCostPerLiter] = useState('');
  const [stationName, setStationName] = useState('');
  const [location, setLocation] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previousOdometer = vehicle.telematics.odometer || 0;

  // Calculate estimated metrics
  const getEstimatedMetrics = () => {
    const odometer = parseFloat(currentOdometer) || 0;
    const fuel = parseFloat(fuelQuantity) || 0;
    const cost = parseFloat(fuelCostPerLiter) || 0;

    if (odometer <= previousOdometer || fuel <= 0) {
      return null;
    }

    const distance = odometer - previousOdometer;
    const fuelConsumption = (fuel / distance) * 100; // L/100km
    const kmPerLiter = distance / fuel;
    const totalCost = fuel * cost;

    return {
      distance,
      fuelConsumption,
      kmPerLiter,
      totalCost,
    };
  };

  const metrics = getEstimatedMetrics();

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

      setReceiptPhoto(file);
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
    if (!currentOdometer || !fuelQuantity || !fuelCostPerLiter) {
      setError('Please fill in all required fields');
      return;
    }

    const odometer = parseFloat(currentOdometer);
    const fuel = parseFloat(fuelQuantity);
    const costPerLiter = parseFloat(fuelCostPerLiter);

    if (odometer <= previousOdometer) {
      setError(`Odometer must be greater than previous reading (${previousOdometer} km)`);
      return;
    }

    if (fuel <= 0 || costPerLiter <= 0) {
      setError('Fuel quantity and cost must be greater than zero');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        currentOdometer: odometer,
        fuelQuantity: fuel,
        fuelCostPerLiter: costPerLiter,
        stationName: stationName.trim(),
        location: location.trim(),
        receiptPhoto: receiptPhoto || undefined,
      });
    } catch (err) {
      setError('Failed to add fuel log. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Log Fuel Refill</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {vehicle.plateNumber} - {vehicle.make} {vehicle.model}
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

          {/* Previous Odometer Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
              Previous Odometer Reading: <span className="text-lg">{previousOdometer.toLocaleString()} km</span>
            </p>
          </div>

          {/* Current Odometer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Odometer Reading (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={currentOdometer}
              onChange={(e) => setCurrentOdometer(e.target.value)}
              placeholder="Enter current odometer reading"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Fuel Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuel Quantity (Liters) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={fuelQuantity}
              onChange={(e) => setFuelQuantity(e.target.value)}
              placeholder="Enter fuel quantity in liters"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Fuel Cost Per Liter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuel Cost Per Liter (₦) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={fuelCostPerLiter}
              onChange={(e) => setFuelCostPerLiter(e.target.value)}
              placeholder="Enter cost per liter"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Station Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Station Name <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="e.g., Total, Mobil, Conoil"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Victoria Island, Lagos"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Receipt Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Receipt Photo <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
            >
              {photoPreview ? (
                <div className="space-y-3">
                  <img
                    src={photoPreview}
                    alt="Receipt preview"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReceiptPhoto(null);
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
                    Click to upload receipt photo
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

          {/* Calculated Metrics */}
          {metrics && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
              <p className="text-sm font-medium text-green-900 dark:text-green-200 mb-3">Calculated Metrics:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-green-700 dark:text-green-300">Distance Traveled:</span>
                  <span className="ml-2 font-bold text-green-900 dark:text-green-100">{metrics.distance} km</span>
                </div>
                <div>
                  <span className="text-green-700 dark:text-green-300">Total Cost:</span>
                  <span className="ml-2 font-bold text-green-900 dark:text-green-100">{formatCurrency(metrics.totalCost)}</span>
                </div>
                <div>
                  <span className="text-green-700 dark:text-green-300">Fuel Consumption:</span>
                  <span className="ml-2 font-bold text-green-900 dark:text-green-100">{metrics.fuelConsumption.toFixed(2)} L/100km</span>
                </div>
                <div>
                  <span className="text-green-700 dark:text-green-300">Fuel Efficiency:</span>
                  <span className="ml-2 font-bold text-green-900 dark:text-green-100">{metrics.kmPerLiter.toFixed(2)} km/L</span>
                </div>
              </div>
            </div>
          )}

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
              disabled={loading || !metrics}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium
                       hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Fuel Log ⛽</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFuelLogModal;
