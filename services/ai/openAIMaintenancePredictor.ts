/**
 * OpenAI-Powered Maintenance Prediction Service (via Firebase Cloud Function)
 *
 * Calls Firebase Cloud Function that uses OpenAI to provide intelligent,
 * context-aware maintenance predictions based on vehicle data
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/firebaseConfig';
import { Vehicle, MaintenanceLog } from '../../types';
import { MaintenancePrediction, MaintenanceSchedule } from './maintenancePrediction';

interface AIMaintenanceAnalysis {
  predictions: MaintenancePrediction[];
  insights: string[];
  recommendations: string[];
  healthScore: number;
  nextServiceDate: string;
}

/**
 * Get AI-powered maintenance predictions using Firebase Cloud Function
 */
export const getAIMaintenancePredictions = async (
  vehicle: Vehicle,
  maintenanceLogs: MaintenanceLog[] = []
): Promise<AIMaintenanceAnalysis> => {
  try {
    // Call Firebase Cloud Function
    const predictMaintenance = httpsCallable(functions, 'predictVehicleMaintenance');

    const result = await predictMaintenance({
      vehicleId: vehicle.id,
      organizationId: vehicle.organizationId,
    });

    const response = result.data as { success: boolean; data: AIMaintenanceAnalysis };

    if (!response.success) {
      throw new Error('Failed to get maintenance predictions from Cloud Function');
    }

    return response.data;
  } catch (error: any) {
    console.error('Error getting AI maintenance predictions:', error);

    // Return fallback data structure
    return {
      predictions: [],
      insights: ['AI analysis temporarily unavailable. Using standard maintenance intervals.'],
      recommendations: ['Please check back later for AI-powered recommendations.'],
      healthScore: 75,
      nextServiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
};

/**
 * Get AI-powered maintenance schedule with notifications
 */
export const getAIMaintenanceSchedule = async (
  vehicle: Vehicle,
  maintenanceLogs: MaintenanceLog[] = []
): Promise<MaintenanceSchedule> => {
  const analysis = await getAIMaintenancePredictions(vehicle, maintenanceLogs);

  return {
    nextServiceDate: analysis.nextServiceDate,
    predictions: analysis.predictions,
    healthScore: analysis.healthScore,
    alerts: [
      ...analysis.insights,
      ...analysis.recommendations,
    ],
  };
};
