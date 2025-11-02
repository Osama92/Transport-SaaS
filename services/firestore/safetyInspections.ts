/**
 * Firestore Service: Safety Inspections
 * Handles pre-trip safety inspections and driver safety scores
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { SafetyInspection, SafetyScore } from '../../types';

/**
 * Create a new safety inspection
 */
export const createSafetyInspection = async (
  inspection: Omit<SafetyInspection, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
): Promise<string> => {
  try {
    const inspectionsRef = collection(db, 'safetyInspections');
    const docRef = await addDoc(inspectionsRef, {
      ...inspection,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating safety inspection:', error);
    throw error;
  }
};

/**
 * Get safety inspections for a driver
 */
export const getDriverInspections = async (
  driverId: string,
  limitCount: number = 10
): Promise<SafetyInspection[]> => {
  try {
    const inspectionsRef = collection(db, 'safetyInspections');
    const q = query(
      inspectionsRef,
      where('driverId', '==', driverId),
      orderBy('inspectionDate', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SafetyInspection[];
  } catch (error) {
    console.error('Error getting driver inspections:', error);
    throw error;
  }
};

/**
 * Get safety inspections for an organization
 */
export const getOrganizationInspections = async (
  organizationId: string,
  limitCount: number = 50
): Promise<SafetyInspection[]> => {
  try {
    const inspectionsRef = collection(db, 'safetyInspections');
    const q = query(
      inspectionsRef,
      where('organizationId', '==', organizationId),
      orderBy('inspectionDate', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SafetyInspection[];
  } catch (error) {
    console.error('Error getting organization inspections:', error);
    throw error;
  }
};

/**
 * Get inspection for a specific route
 */
export const getRouteInspection = async (routeId: string): Promise<SafetyInspection | null> => {
  try {
    const inspectionsRef = collection(db, 'safetyInspections');
    const q = query(inspectionsRef, where('routeId', '==', routeId), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as SafetyInspection;
  } catch (error) {
    console.error('Error getting route inspection:', error);
    throw error;
  }
};

/**
 * Get or create driver safety score
 */
export const getDriverSafetyScore = async (
  driverId: string,
  organizationId: string
): Promise<SafetyScore | null> => {
  try {
    const scoresRef = collection(db, 'driverSafetyScores');
    const q = query(scoresRef, where('driverId', '==', driverId), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as SafetyScore;
  } catch (error) {
    console.error('Error getting driver safety score:', error);
    throw error;
  }
};

/**
 * Update driver safety score after inspection
 */
export const updateDriverSafetyScore = async (
  driverId: string,
  organizationId: string,
  inspection: SafetyInspection
): Promise<void> => {
  try {
    // Get existing score or create new one
    const existingScore = await getDriverSafetyScore(driverId, organizationId);

    if (existingScore) {
      // Update existing score
      const scoreRef = doc(db, 'driverSafetyScores', existingScore.id!);

      const totalInspections = existingScore.totalInspections + 1;
      const perfectInspections = existingScore.perfectInspections + (inspection.isPerfect ? 1 : 0);

      // Calculate new streak
      let currentStreak = inspection.isPerfect ? existingScore.currentStreak + 1 : 0;
      const longestStreak = Math.max(currentStreak, existingScore.longestStreak);

      // Calculate overall score (weighted average)
      // Perfect inspection: +5 points, Critical issues: -3 points, Regular: +2 points
      const inspectionPoints = inspection.isPerfect ? 5 : inspection.hasCriticalIssues ? -3 : 2;
      const newScore = Math.max(0, Math.min(100, existingScore.score + inspectionPoints));

      await updateDoc(scoreRef, {
        totalInspections,
        perfectInspections,
        score: newScore,
        currentStreak,
        longestStreak,
        lastInspectionDate: inspection.inspectionDate,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new score document
      const scoresRef = collection(db, 'driverSafetyScores');
      await addDoc(scoresRef, {
        driverId,
        organizationId,
        totalInspections: 1,
        perfectInspections: inspection.isPerfect ? 1 : 0,
        score: inspection.overallScore,
        currentStreak: inspection.isPerfect ? 1 : 0,
        longestStreak: inspection.isPerfect ? 1 : 0,
        lastInspectionDate: inspection.inspectionDate,
        incidents: 0,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating driver safety score:', error);
    throw error;
  }
};

/**
 * Get safety scores for all drivers in organization
 */
export const getOrganizationSafetyScores = async (
  organizationId: string
): Promise<SafetyScore[]> => {
  try {
    const scoresRef = collection(db, 'driverSafetyScores');
    const q = query(
      scoresRef,
      where('organizationId', '==', organizationId),
      orderBy('score', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SafetyScore[];
  } catch (error) {
    console.error('Error getting organization safety scores:', error);
    throw error;
  }
};

/**
 * Get inspections with critical issues for a time period
 */
export const getCriticalInspections = async (
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<SafetyInspection[]> => {
  try {
    const inspectionsRef = collection(db, 'safetyInspections');
    const q = query(
      inspectionsRef,
      where('organizationId', '==', organizationId),
      where('hasCriticalIssues', '==', true),
      where('inspectionDate', '>=', startDate),
      where('inspectionDate', '<=', endDate),
      orderBy('inspectionDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SafetyInspection[];
  } catch (error) {
    console.error('Error getting critical inspections:', error);
    throw error;
  }
};

/**
 * Create maintenance alert from critical inspection items
 */
export const createMaintenanceAlerts = async (
  inspection: SafetyInspection,
  vehicleId: string
): Promise<void> => {
  try {
    const criticalItems = inspection.items.filter(
      item => item.status === 'poor' || item.status === 'missing'
    );

    if (criticalItems.length === 0) return;

    const alertsRef = collection(db, 'maintenanceAlerts');

    for (const item of criticalItems) {
      await addDoc(alertsRef, {
        vehicleId,
        organizationId: inspection.organizationId,
        inspectionId: inspection.id,
        driverId: inspection.driverId,
        routeId: inspection.routeId,
        category: item.category,
        issue: item.question,
        severity: item.status === 'missing' ? 'critical' : 'high',
        status: 'open',
        notes: item.notes || '',
        photoUrl: item.photoUrl || '',
        reportedDate: inspection.inspectionDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error creating maintenance alerts:', error);
    throw error;
  }
};
