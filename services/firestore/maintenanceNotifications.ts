/**
 * Maintenance Notification Service
 *
 * Creates and manages maintenance reminder notifications for fleet managers
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { MaintenancePrediction } from '../ai/maintenancePrediction';

export interface MaintenanceNotification {
  id?: string;
  organizationId: string;
  userId: string; // Fleet manager user ID
  vehicleId: string;
  vehicleName: string;
  type: 'maintenance_due' | 'maintenance_overdue' | 'maintenance_upcoming';
  title: string;
  message: string;
  maintenanceType: string; // e.g., "Engine Oil", "Brake Inspection"
  urgency: 'overdue' | 'urgent' | 'soon' | 'upcoming';
  priority: number; // 1-5
  dueDate: string;
  estimatedCost: { min: number; max: number };
  read: boolean;
  dismissed: boolean;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

/**
 * Create maintenance notifications from predictions
 */
export const createMaintenanceNotifications = async (
  organizationId: string,
  userId: string,
  vehicleId: string,
  vehicleName: string,
  predictions: MaintenancePrediction[]
): Promise<string[]> => {
  try {
    const notificationIds: string[] = [];
    const notificationsRef = collection(db, 'notifications');

    // Only create notifications for overdue, urgent, and soon items
    const urgentPredictions = predictions.filter(
      p => p.urgency === 'overdue' || p.urgency === 'urgent' || p.urgency === 'soon'
    );

    for (const prediction of urgentPredictions) {
      // Check if notification already exists for this maintenance type and vehicle
      const existingQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        where('vehicleId', '==', vehicleId),
        where('maintenanceType', '==', prediction.type),
        where('dismissed', '==', false),
        limit(1)
      );

      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        // Notification already exists, skip
        continue;
      }

      // Determine notification type
      let notificationType: MaintenanceNotification['type'];
      if (prediction.urgency === 'overdue') {
        notificationType = 'maintenance_overdue';
      } else if (prediction.urgency === 'urgent') {
        notificationType = 'maintenance_due';
      } else {
        notificationType = 'maintenance_upcoming';
      }

      // Create notification title and message
      const title = `${prediction.urgency === 'overdue' ? '⚠️ Overdue' : '🔔 Due Soon'}: ${prediction.type}`;
      const message = `${vehicleName} - ${prediction.reason}. Est. cost: ₦${prediction.estimatedCost.min.toLocaleString()} - ₦${prediction.estimatedCost.max.toLocaleString()}`;

      const notification: Omit<MaintenanceNotification, 'id'> = {
        organizationId,
        userId,
        vehicleId,
        vehicleName,
        type: notificationType,
        title,
        message,
        maintenanceType: prediction.type,
        urgency: prediction.urgency,
        priority: prediction.priority,
        dueDate: prediction.recommendedDate,
        estimatedCost: prediction.estimatedCost,
        read: false,
        dismissed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(notificationsRef, notification);
      notificationIds.push(docRef.id);
    }

    return notificationIds;
  } catch (error) {
    console.error('Error creating maintenance notifications:', error);
    throw error;
  }
};

/**
 * Get maintenance notifications for a user
 */
export const getMaintenanceNotifications = async (
  userId: string,
  includeDismissed: boolean = false
): Promise<MaintenanceNotification[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');

    const constraints = [
      where('userId', '==', userId),
      where('type', 'in', ['maintenance_due', 'maintenance_overdue', 'maintenance_upcoming']),
    ];

    if (!includeDismissed) {
      constraints.push(where('dismissed', '==', false));
    }

    constraints.push(orderBy('priority', 'desc'));
    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(notificationsRef, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MaintenanceNotification[];
  } catch (error) {
    console.error('Error getting maintenance notifications:', error);
    throw error;
  }
};

/**
 * Get maintenance notifications for an organization
 */
export const getOrganizationMaintenanceNotifications = async (
  organizationId: string,
  includeDismissed: boolean = false
): Promise<MaintenanceNotification[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');

    const constraints = [
      where('organizationId', '==', organizationId),
      where('type', 'in', ['maintenance_due', 'maintenance_overdue', 'maintenance_upcoming']),
    ];

    if (!includeDismissed) {
      constraints.push(where('dismissed', '==', false));
    }

    constraints.push(orderBy('priority', 'desc'));
    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(notificationsRef, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MaintenanceNotification[];
  } catch (error) {
    console.error('Error getting organization maintenance notifications:', error);
    throw error;
  }
};

/**
 * Bulk create maintenance notifications for all vehicles in an organization
 */
export const createBulkMaintenanceNotifications = async (
  organizationId: string,
  userId: string,
  vehiclePredictions: Array<{
    vehicleId: string;
    vehicleName: string;
    predictions: MaintenancePrediction[];
  }>
): Promise<number> => {
  try {
    let totalCreated = 0;

    for (const { vehicleId, vehicleName, predictions } of vehiclePredictions) {
      const notificationIds = await createMaintenanceNotifications(
        organizationId,
        userId,
        vehicleId,
        vehicleName,
        predictions
      );
      totalCreated += notificationIds.length;
    }

    return totalCreated;
  } catch (error) {
    console.error('Error creating bulk maintenance notifications:', error);
    throw error;
  }
};
