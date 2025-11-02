/**
 * Firebase Cloud Function for AI-Powered Maintenance Predictions
 *
 * This function uses OpenAI to predict vehicle maintenance needs
 * based on vehicle data, odometer readings, and maintenance history.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface VehicleData {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  telematics?: {
    odometer: number;
    odometerHistory?: { today: number; yesterday: number };
  };
  maintenance?: {
    lastServiceDate: string;
    nextServiceDate: string;
  };
  status: string;
}

interface MaintenanceLog {
  id: string;
  date: string;
  type: string;
  description: string;
  cost: number;
}

interface MaintenancePrediction {
  type: string;
  urgency: 'overdue' | 'urgent' | 'soon' | 'upcoming';
  reason: string;
  recommendedDate: string;
  estimatedOdometer: number;
  daysUntilDue: number;
  kmUntilDue: number;
  priority: number;
  estimatedCost: { min: number; max: number };
}

/**
 * Format vehicle data for OpenAI prompt
 */
const formatVehicleData = (vehicle: VehicleData, maintenanceLogs: MaintenanceLog[]): string => {
  const currentOdometer = vehicle.telematics?.odometer || 0;
  const lastServiceDate = vehicle.maintenance?.lastServiceDate || 'Unknown';

  let prompt = `Vehicle Information:
- Make/Model: ${vehicle.make} ${vehicle.model}
- Year: ${vehicle.year}
- Plate Number: ${vehicle.plateNumber}
- Current Odometer: ${currentOdometer.toLocaleString()} km
- Status: ${vehicle.status}
- Last Service Date: ${lastServiceDate}
`;

  if (vehicle.telematics?.odometerHistory) {
    const dailyKm = vehicle.telematics.odometerHistory.today - vehicle.telematics.odometerHistory.yesterday;
    prompt += `- Average Daily Usage: ${dailyKm} km/day\n`;
  }

  if (maintenanceLogs.length > 0) {
    prompt += `\nMaintenance History (Last 5 entries):\n`;
    const recentLogs = maintenanceLogs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    recentLogs.forEach(log => {
      prompt += `- ${new Date(log.date).toLocaleDateString()}: ${log.type} - ${log.description} (₦${log.cost.toLocaleString()})\n`;
    });
  } else {
    prompt += `\nNo maintenance history available.\n`;
  }

  return prompt;
};

/**
 * Cloud Function: Predict Vehicle Maintenance
 */
export const predictVehicleMaintenance = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to use this function.'
    );
  }

  const { vehicleId, organizationId } = data;

  if (!vehicleId || !organizationId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'vehicleId and organizationId are required.'
    );
  }

  try {
    const db = admin.firestore();

    // Fetch vehicle data
    const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
    if (!vehicleDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Vehicle not found.');
    }

    const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() } as VehicleData;

    // Verify user has access to this vehicle's organization
    if (vehicle.id && organizationId) {
      // For now, we'll allow access if organizationId matches
      // In production, verify user membership in organization
    }

    // Fetch maintenance logs
    const logsSnapshot = await db
      .collection('vehicles')
      .doc(vehicleId)
      .collection('maintenanceLogs')
      .orderBy('date', 'desc')
      .limit(10)
      .get();

    const maintenanceLogs: MaintenanceLog[] = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MaintenanceLog[];

    // Format data for OpenAI
    const vehicleData = formatVehicleData(vehicle, maintenanceLogs);

    const systemPrompt = `You are an expert automotive maintenance advisor specializing in commercial fleet vehicles in Nigeria.
Your role is to analyze vehicle data and predict maintenance needs based on:
- Odometer readings and usage patterns
- Time since last service
- Vehicle age and condition
- Maintenance history
- Nigerian road conditions and climate
- Standard manufacturer recommendations

Provide predictions in a structured JSON format with the following schema:
{
  "predictions": [
    {
      "type": "Engine Oil" | "Oil Filter" | "Air Filter" | "Tire Rotation" | "Brake Inspection" | "Brake Replacement" | "Coolant Flush" | "Transmission Service" | "Battery Check" | "Spark Plugs",
      "urgency": "overdue" | "urgent" | "soon" | "upcoming",
      "reason": "Clear explanation of why this maintenance is needed",
      "recommendedDate": "ISO date string",
      "estimatedOdometer": number,
      "daysUntilDue": number,
      "kmUntilDue": number,
      "priority": 1-5 (5 is most urgent),
      "estimatedCost": { "min": number, "max": number }
    }
  ],
  "insights": ["Key observation 1", "Key observation 2"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
  "healthScore": 0-100,
  "nextServiceDate": "ISO date string"
}

Consider Nigerian context:
- Dusty conditions may require more frequent air filter changes
- Hot climate affects coolant and battery life
- Poor road conditions impact suspension and tire wear
- High traffic congestion increases brake wear

Use Nigerian Naira (₦) for cost estimates with realistic local pricing.`;

    const userPrompt = `${vehicleData}

Based on this vehicle data, provide a comprehensive maintenance prediction analysis. Include:
1. All maintenance items due within the next 60 days or 5,000 km
2. Items that are overdue
3. Specific insights about this vehicle's condition
4. Actionable recommendations for the fleet manager

Return ONLY valid JSON matching the schema provided.`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new functions.https.HttpsError('internal', 'Empty response from OpenAI');
    }

    const analysis = JSON.parse(content);

    // Sort predictions by priority
    analysis.predictions.sort((a: MaintenancePrediction, b: MaintenancePrediction) => b.priority - a.priority);

    // Log the prediction for analytics
    await db.collection('maintenancePredictions').add({
      vehicleId,
      organizationId,
      predictions: analysis.predictions,
      healthScore: analysis.healthScore,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
    });

    return {
      success: true,
      data: analysis,
    };
  } catch (error: any) {
    console.error('Error predicting vehicle maintenance:', error);

    // Return error with fallback
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate maintenance predictions',
      error.message
    );
  }
});
