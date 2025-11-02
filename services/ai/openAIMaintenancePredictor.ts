/**
 * OpenAI-Powered Maintenance Prediction Service
 *
 * Uses OpenAI to provide intelligent, context-aware maintenance predictions
 * based on vehicle data, maintenance history, and industry best practices
 */

import OpenAI from 'openai';
import { Vehicle, MaintenanceLog } from '../../types';
import { MaintenancePrediction, MaintenanceSchedule } from './maintenancePrediction';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, API calls should go through backend
});

interface AIMaintenanceAnalysis {
  predictions: MaintenancePrediction[];
  insights: string[];
  recommendations: string[];
  healthScore: number;
  nextServiceDate: string;
}

/**
 * Format vehicle data for OpenAI prompt
 */
const formatVehicleData = (vehicle: Vehicle, maintenanceLogs: MaintenanceLog[]): string => {
  const currentOdometer = vehicle.telematics?.odometer || vehicle.odometer || 0;
  const lastServiceDate = vehicle.maintenance?.lastServiceDate || vehicle.lastServiceDate || 'Unknown';

  let prompt = `Vehicle Information:
- Make/Model: ${vehicle.make} ${vehicle.model}
- Year: ${vehicle.year}
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
      prompt += `- ${new Date(log.date).toLocaleDateString()}: ${log.type} - ${log.description} (₦${log.cost})\n`;
    });
  } else {
    prompt += `\nNo maintenance history available.\n`;
  }

  return prompt;
};

/**
 * Get AI-powered maintenance predictions using OpenAI
 */
export const getAIMaintenancePredictions = async (
  vehicle: Vehicle,
  maintenanceLogs: MaintenanceLog[] = []
): Promise<AIMaintenanceAnalysis> => {
  try {
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
      throw new Error('Empty response from OpenAI');
    }

    const analysis: AIMaintenanceAnalysis = JSON.parse(content);

    // Sort predictions by priority
    analysis.predictions.sort((a, b) => b.priority - a.priority);

    return analysis;
  } catch (error) {
    console.error('Error getting AI maintenance predictions:', error);

    // Fallback to basic predictions if AI fails
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
 * Get AI-generated maintenance report summary
 */
export const getMaintenanceReportSummary = async (
  vehicle: Vehicle,
  predictions: MaintenancePrediction[],
  maintenanceLogs: MaintenanceLog[]
): Promise<string> => {
  try {
    const vehicleData = formatVehicleData(vehicle, maintenanceLogs);

    const predictionsText = predictions
      .map(p => `- ${p.type}: ${p.urgency} (${p.reason})`)
      .join('\n');

    const prompt = `${vehicleData}

Maintenance Predictions:
${predictionsText}

Generate a concise, professional summary (3-4 sentences) for the fleet manager explaining:
1. Overall vehicle health status
2. Most critical maintenance needs
3. Recommended immediate actions
4. Long-term maintenance strategy

Keep it clear, actionable, and professional.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional fleet maintenance advisor. Provide clear, concise summaries.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || 'Summary unavailable.';
  } catch (error) {
    console.error('Error generating maintenance summary:', error);
    return 'Maintenance summary temporarily unavailable.';
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
