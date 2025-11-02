/**
 * AI-Powered Maintenance Prediction Service
 *
 * Predicts vehicle maintenance needs based on:
 * - Odometer readings
 * - Time since last service
 * - Vehicle age
 * - Maintenance history
 * - Industry standard service intervals
 */

import { Vehicle, MaintenanceLog } from '../../types';

export interface MaintenancePrediction {
  type: 'Engine Oil' | 'Oil Filter' | 'Air Filter' | 'Tire Rotation' | 'Brake Inspection' | 'Brake Replacement' | 'Coolant Flush' | 'Transmission Service' | 'Battery Check' | 'Spark Plugs';
  urgency: 'overdue' | 'urgent' | 'soon' | 'upcoming';
  reason: string;
  recommendedDate: string;
  estimatedOdometer: number;
  daysUntilDue: number;
  kmUntilDue: number;
  priority: number; // 1-5, 5 being most urgent
  estimatedCost: { min: number; max: number };
}

export interface MaintenanceSchedule {
  nextServiceDate: string;
  predictions: MaintenancePrediction[];
  healthScore: number; // 0-100
  alerts: string[];
}

// Standard maintenance intervals (in kilometers)
const MAINTENANCE_INTERVALS = {
  engineOil: 5000, // Every 5,000 km
  oilFilter: 5000, // Every 5,000 km
  airFilter: 15000, // Every 15,000 km
  tireRotation: 10000, // Every 10,000 km
  brakeInspection: 15000, // Every 15,000 km
  brakeReplacement: 50000, // Every 50,000 km
  coolantFlush: 40000, // Every 40,000 km
  transmissionService: 60000, // Every 60,000 km
  batteryCheck: 20000, // Every 20,000 km
  sparkPlugs: 50000, // Every 50,000 km
};

// Time-based intervals (in months)
const TIME_INTERVALS = {
  engineOil: 6, // Every 6 months
  oilFilter: 6,
  airFilter: 12,
  coolantFlush: 24,
  batteryCheck: 12,
  transmissionService: 24,
};

// Estimated costs (in Naira)
const ESTIMATED_COSTS = {
  engineOil: { min: 8000, max: 15000 },
  oilFilter: { min: 2000, max: 5000 },
  airFilter: { min: 3000, max: 6000 },
  tireRotation: { min: 5000, max: 10000 },
  brakeInspection: { min: 3000, max: 5000 },
  brakeReplacement: { min: 40000, max: 80000 },
  coolantFlush: { min: 10000, max: 20000 },
  transmissionService: { min: 30000, max: 60000 },
  batteryCheck: { min: 2000, max: 3000 },
  sparkPlugs: { min: 15000, max: 30000 },
};

/**
 * Calculate days between two dates
 */
const daysBetween = (date1: Date, date2: Date): number => {
  const diff = date2.getTime() - date1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Get last maintenance of a specific type
 */
const getLastMaintenance = (logs: MaintenanceLog[], type: string): MaintenanceLog | null => {
  const filtered = logs
    .filter(log => log.type.toLowerCase().includes(type.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return filtered.length > 0 ? filtered[0] : null;
};

/**
 * Calculate average daily kilometers driven
 */
const calculateDailyKm = (vehicle: Vehicle): number => {
  const currentOdometer = vehicle.telematics?.odometer || vehicle.odometer || 0;

  // Use odometer history if available
  if (vehicle.telematics?.odometerHistory) {
    const { today, yesterday } = vehicle.telematics.odometerHistory;
    return today - yesterday;
  }

  // Estimate based on last service date
  const lastServiceDate = vehicle.maintenance?.lastServiceDate || vehicle.lastServiceDate;
  if (lastServiceDate) {
    const daysSinceService = daysBetween(new Date(lastServiceDate), new Date());
    if (daysSinceService > 0) {
      // Assume some baseline odometer at last service (this is an estimate)
      const estimatedKmSinceService = currentOdometer * 0.1; // Rough estimate
      return estimatedKmSinceService / daysSinceService;
    }
  }

  // Default estimate: 50 km per day (typical commercial vehicle usage)
  return 50;
};

/**
 * Predict maintenance needs based on odometer and time
 */
const predictMaintenance = (
  type: MaintenancePrediction['type'],
  vehicle: Vehicle,
  intervalKm: number,
  intervalMonths: number,
  costRange: { min: number; max: number },
  maintenanceLogs: MaintenanceLog[]
): MaintenancePrediction | null => {
  const currentOdometer = vehicle.telematics?.odometer || vehicle.odometer || 0;
  const dailyKm = calculateDailyKm(vehicle);

  // Get last maintenance of this type
  const lastMaintenance = getLastMaintenance(maintenanceLogs, type);

  let kmSinceLastService = 0;
  let daysSinceLastService = 0;
  let lastServiceDate = new Date();

  if (lastMaintenance) {
    // We know when this maintenance was last done
    lastServiceDate = new Date(lastMaintenance.date);
    daysSinceLastService = daysBetween(lastServiceDate, new Date());

    // Estimate odometer at last service (approximate)
    kmSinceLastService = dailyKm * daysSinceLastService;
  } else {
    // No record, use vehicle's last service date as baseline
    const vehicleLastService = vehicle.maintenance?.lastServiceDate || vehicle.lastServiceDate;
    if (vehicleLastService) {
      lastServiceDate = new Date(vehicleLastService);
      daysSinceLastService = daysBetween(lastServiceDate, new Date());
      kmSinceLastService = dailyKm * daysSinceLastService;
    } else {
      // No service history, assume maintenance is overdue
      kmSinceLastService = currentOdometer;
      daysSinceLastService = 365; // Assume 1 year
    }
  }

  // Calculate how many km until due
  const kmUntilDue = intervalKm - kmSinceLastService;

  // Calculate days until due based on km
  const daysUntilDueByKm = kmUntilDue / dailyKm;

  // Calculate days until due based on time
  const monthsSinceLastService = daysSinceLastService / 30;
  const monthsUntilDue = intervalMonths - monthsSinceLastService;
  const daysUntilDueByTime = monthsUntilDue * 30;

  // Use whichever comes first (km or time)
  const daysUntilDue = Math.min(daysUntilDueByKm, daysUntilDueByTime);

  // Calculate urgency and priority
  let urgency: MaintenancePrediction['urgency'];
  let priority: number;

  if (daysUntilDue <= 0 || kmUntilDue <= 0) {
    urgency = 'overdue';
    priority = 5;
  } else if (daysUntilDue <= 7 || kmUntilDue <= 500) {
    urgency = 'urgent';
    priority = 4;
  } else if (daysUntilDue <= 30 || kmUntilDue <= 2000) {
    urgency = 'soon';
    priority = 3;
  } else if (daysUntilDue <= 60 || kmUntilDue <= 5000) {
    urgency = 'upcoming';
    priority = 2;
  } else {
    // Too far in the future, don't include in predictions
    return null;
  }

  // Calculate recommended date and estimated odometer
  const recommendedDate = new Date();
  recommendedDate.setDate(recommendedDate.getDate() + Math.max(0, Math.floor(daysUntilDue)));

  const estimatedOdometer = currentOdometer + Math.max(0, kmUntilDue);

  // Generate reason message
  let reason = '';
  if (kmUntilDue <= 0 && daysUntilDueByTime <= 0) {
    reason = `Overdue by ${Math.abs(Math.floor(kmUntilDue)).toLocaleString()} km and ${Math.abs(Math.floor(daysUntilDue))} days`;
  } else if (kmUntilDue <= 0) {
    reason = `Overdue by ${Math.abs(Math.floor(kmUntilDue)).toLocaleString()} km`;
  } else if (daysUntilDueByTime <= 0) {
    reason = `Overdue by ${Math.abs(Math.floor(daysUntilDue))} days`;
  } else if (kmUntilDue < daysUntilDueByKm * dailyKm) {
    reason = `Due in ${Math.floor(kmUntilDue).toLocaleString()} km`;
  } else {
    reason = `Due in ${Math.floor(daysUntilDue)} days`;
  }

  return {
    type,
    urgency,
    reason,
    recommendedDate: recommendedDate.toISOString(),
    estimatedOdometer: Math.round(estimatedOdometer),
    daysUntilDue: Math.floor(daysUntilDue),
    kmUntilDue: Math.floor(kmUntilDue),
    priority,
    estimatedCost: costRange,
  };
};

/**
 * Calculate vehicle health score
 */
const calculateHealthScore = (predictions: MaintenancePrediction[]): number => {
  if (predictions.length === 0) return 100;

  let score = 100;

  for (const prediction of predictions) {
    switch (prediction.urgency) {
      case 'overdue':
        score -= 20;
        break;
      case 'urgent':
        score -= 10;
        break;
      case 'soon':
        score -= 5;
        break;
      case 'upcoming':
        score -= 2;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Generate maintenance alerts
 */
const generateAlerts = (predictions: MaintenancePrediction[]): string[] => {
  const alerts: string[] = [];

  const overdue = predictions.filter(p => p.urgency === 'overdue');
  const urgent = predictions.filter(p => p.urgency === 'urgent');

  if (overdue.length > 0) {
    alerts.push(`⚠️ ${overdue.length} maintenance item(s) overdue - immediate attention required`);
  }

  if (urgent.length > 0) {
    alerts.push(`🔔 ${urgent.length} maintenance item(s) due within 7 days`);
  }

  return alerts;
};

/**
 * Main function: Predict all maintenance needs for a vehicle
 */
export const predictVehicleMaintenance = (
  vehicle: Vehicle,
  maintenanceLogs: MaintenanceLog[] = []
): MaintenanceSchedule => {
  const predictions: MaintenancePrediction[] = [];

  // Predict each maintenance type
  const oilPrediction = predictMaintenance(
    'Engine Oil',
    vehicle,
    MAINTENANCE_INTERVALS.engineOil,
    TIME_INTERVALS.engineOil,
    ESTIMATED_COSTS.engineOil,
    maintenanceLogs
  );
  if (oilPrediction) predictions.push(oilPrediction);

  const oilFilterPrediction = predictMaintenance(
    'Oil Filter',
    vehicle,
    MAINTENANCE_INTERVALS.oilFilter,
    TIME_INTERVALS.oilFilter,
    ESTIMATED_COSTS.oilFilter,
    maintenanceLogs
  );
  if (oilFilterPrediction) predictions.push(oilFilterPrediction);

  const airFilterPrediction = predictMaintenance(
    'Air Filter',
    vehicle,
    MAINTENANCE_INTERVALS.airFilter,
    TIME_INTERVALS.airFilter,
    ESTIMATED_COSTS.airFilter,
    maintenanceLogs
  );
  if (airFilterPrediction) predictions.push(airFilterPrediction);

  const tireRotationPrediction = predictMaintenance(
    'Tire Rotation',
    vehicle,
    MAINTENANCE_INTERVALS.tireRotation,
    12, // Every year
    ESTIMATED_COSTS.tireRotation,
    maintenanceLogs
  );
  if (tireRotationPrediction) predictions.push(tireRotationPrediction);

  const brakeInspectionPrediction = predictMaintenance(
    'Brake Inspection',
    vehicle,
    MAINTENANCE_INTERVALS.brakeInspection,
    12,
    ESTIMATED_COSTS.brakeInspection,
    maintenanceLogs
  );
  if (brakeInspectionPrediction) predictions.push(brakeInspectionPrediction);

  const brakeReplacementPrediction = predictMaintenance(
    'Brake Replacement',
    vehicle,
    MAINTENANCE_INTERVALS.brakeReplacement,
    36,
    ESTIMATED_COSTS.brakeReplacement,
    maintenanceLogs
  );
  if (brakeReplacementPrediction) predictions.push(brakeReplacementPrediction);

  const coolantFlushPrediction = predictMaintenance(
    'Coolant Flush',
    vehicle,
    MAINTENANCE_INTERVALS.coolantFlush,
    TIME_INTERVALS.coolantFlush,
    ESTIMATED_COSTS.coolantFlush,
    maintenanceLogs
  );
  if (coolantFlushPrediction) predictions.push(coolantFlushPrediction);

  const transmissionPrediction = predictMaintenance(
    'Transmission Service',
    vehicle,
    MAINTENANCE_INTERVALS.transmissionService,
    TIME_INTERVALS.transmissionService,
    ESTIMATED_COSTS.transmissionService,
    maintenanceLogs
  );
  if (transmissionPrediction) predictions.push(transmissionPrediction);

  const batteryPrediction = predictMaintenance(
    'Battery Check',
    vehicle,
    MAINTENANCE_INTERVALS.batteryCheck,
    TIME_INTERVALS.batteryCheck,
    ESTIMATED_COSTS.batteryCheck,
    maintenanceLogs
  );
  if (batteryPrediction) predictions.push(batteryPrediction);

  const sparkPlugsPrediction = predictMaintenance(
    'Spark Plugs',
    vehicle,
    MAINTENANCE_INTERVALS.sparkPlugs,
    36,
    ESTIMATED_COSTS.sparkPlugs,
    maintenanceLogs
  );
  if (sparkPlugsPrediction) predictions.push(sparkPlugsPrediction);

  // Sort predictions by priority (highest first)
  predictions.sort((a, b) => b.priority - a.priority);

  // Calculate next service date (earliest prediction)
  const nextServiceDate = predictions.length > 0
    ? predictions[0].recommendedDate
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default: 30 days from now

  const healthScore = calculateHealthScore(predictions);
  const alerts = generateAlerts(predictions);

  return {
    nextServiceDate,
    predictions,
    healthScore,
    alerts,
  };
};

/**
 * Create maintenance reminder notifications
 */
export const createMaintenanceNotifications = (
  vehicleId: string,
  vehicleName: string,
  predictions: MaintenancePrediction[]
): Array<{ title: string; message: string; type: 'warning' | 'info'; priority: number }> => {
  const notifications: Array<{ title: string; message: string; type: 'warning' | 'info'; priority: number }> = [];

  for (const prediction of predictions) {
    if (prediction.urgency === 'overdue' || prediction.urgency === 'urgent') {
      notifications.push({
        title: `${prediction.urgency === 'overdue' ? '⚠️ Overdue' : '🔔 Urgent'}: ${prediction.type} - ${vehicleName}`,
        message: `${prediction.reason}. Estimated cost: ₦${prediction.estimatedCost.min.toLocaleString()} - ₦${prediction.estimatedCost.max.toLocaleString()}`,
        type: prediction.urgency === 'overdue' ? 'warning' : 'info',
        priority: prediction.priority,
      });
    }
  }

  return notifications;
};
