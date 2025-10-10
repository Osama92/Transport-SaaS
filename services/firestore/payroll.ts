import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { PayrollRun, Payslip, Driver } from '../../types';

const PAYROLL_RUNS_COLLECTION = 'payrollRuns';

/**
 * Nigerian PAYE Tax Calculation (2026 Reform)
 * Progressive tax brackets:
 * - First ₦800,000: 10%
 * - Next ₦800,000 (₦800,001 - ₦1,600,000): 15%
 * - Next ₦1,400,000 (₦1,600,001 - ₦3,000,000): 20%
 * - Next ₦2,000,000 (₦3,000,001 - ₦5,000,000): 25%
 * - Next ₦5,000,000 (₦5,000,001 - ₦10,000,000): 30%
 * - Above ₦10,000,000: 35%
 */
const calculatePAYE = (annualGrossIncome: number): number => {
    let tax = 0;

    if (annualGrossIncome <= 800000) {
        tax = annualGrossIncome * 0.10;
    } else if (annualGrossIncome <= 1600000) {
        tax = 800000 * 0.10 + (annualGrossIncome - 800000) * 0.15;
    } else if (annualGrossIncome <= 3000000) {
        tax = 800000 * 0.10 + 800000 * 0.15 + (annualGrossIncome - 1600000) * 0.20;
    } else if (annualGrossIncome <= 5000000) {
        tax = 800000 * 0.10 + 800000 * 0.15 + 1400000 * 0.20 + (annualGrossIncome - 3000000) * 0.25;
    } else if (annualGrossIncome <= 10000000) {
        tax = 800000 * 0.10 + 800000 * 0.15 + 1400000 * 0.20 + 2000000 * 0.25 + (annualGrossIncome - 5000000) * 0.30;
    } else {
        tax = 800000 * 0.10 + 800000 * 0.15 + 1400000 * 0.20 + 2000000 * 0.25 + 5000000 * 0.30 + (annualGrossIncome - 10000000) * 0.35;
    }

    return Math.round(tax * 100) / 100;
};

/**
 * Calculate payslip for a driver
 */
export const calculatePayslip = (
    driver: Driver,
    periodStart: string,
    periodEnd: string,
    bonuses: number = 0,
    deductions: number = 0
): Omit<Payslip, 'id' | 'payrollRunId'> => {
    const baseSalary = driver.payrollInfo?.baseSalary || driver.baseSalary || 0;

    // Calculate pension (8% employee + 10% employer = 18% total, but employee pays 8%)
    const pensionRate = driver.payrollInfo?.pensionContributionRate || 0.08;
    const pensionContribution = baseSalary * pensionRate;

    // Calculate NHF (2.5% of basic salary)
    const nhfRate = driver.payrollInfo?.nhfContributionRate || 0.025;
    const nhfContribution = baseSalary * nhfRate;

    // Gross income
    const grossIncome = baseSalary + bonuses;

    // Annual gross for PAYE calculation
    const annualGross = grossIncome * 12;

    // Calculate annual PAYE
    const annualPAYE = calculatePAYE(annualGross);

    // Monthly PAYE
    const payeDeduction = annualPAYE / 12;

    // Total deductions
    const totalDeductions = pensionContribution + nhfContribution + payeDeduction + deductions;

    // Net pay
    const netPay = grossIncome - totalDeductions;

    return {
        driverId: driver.id,
        driverName: driver.name,
        periodStart,
        periodEnd,
        baseSalary,
        bonuses,
        grossIncome,
        pensionContribution,
        nhfContribution,
        payeDeduction,
        otherDeductions: deductions,
        totalDeductions,
        netPay,
        status: 'Pending',
        paidDate: null,
        pdfUrl: null,
    };
};

/**
 * Get all payroll runs for an organization
 */
export const getPayrollRunsByOrganization = async (organizationId: string): Promise<PayrollRun[]> => {
    try {
        const payrollRunsRef = collection(db, PAYROLL_RUNS_COLLECTION);
        const q = query(
            payrollRunsRef,
            where('organizationId', '==', organizationId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const payrollRuns: PayrollRun[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();

            // Fetch payslips subcollection
            const payslips = await getPayslipsByPayrollRun(docSnap.id);

            payrollRuns.push({
                id: docSnap.id,
                ...data,
                periodStart: data.periodStart instanceof Timestamp
                    ? data.periodStart.toDate().toISOString()
                    : data.periodStart,
                periodEnd: data.periodEnd instanceof Timestamp
                    ? data.periodEnd.toDate().toISOString()
                    : data.periodEnd,
                processedDate: data.processedDate instanceof Timestamp
                    ? data.processedDate.toDate().toISOString()
                    : data.processedDate,
                createdAt: data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp
                    ? data.updatedAt.toDate().toISOString()
                    : data.updatedAt,
                payslips,
            } as PayrollRun);
        }

        return payrollRuns;
    } catch (error) {
        console.error('Error getting payroll runs:', error);
        throw new Error('Failed to fetch payroll runs');
    }
};

/**
 * Get a single payroll run by ID
 */
export const getPayrollRunById = async (payrollRunId: string): Promise<PayrollRun | null> => {
    try {
        const payrollRunRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId);
        const payrollRunSnap = await getDoc(payrollRunRef);

        if (!payrollRunSnap.exists()) {
            return null;
        }

        const data = payrollRunSnap.data();
        const payslips = await getPayslipsByPayrollRun(payrollRunId);

        return {
            id: payrollRunSnap.id,
            ...data,
            periodStart: data.periodStart instanceof Timestamp
                ? data.periodStart.toDate().toISOString()
                : data.periodStart,
            periodEnd: data.periodEnd instanceof Timestamp
                ? data.periodEnd.toDate().toISOString()
                : data.periodEnd,
            processedDate: data.processedDate instanceof Timestamp
                ? data.processedDate.toDate().toISOString()
                : data.processedDate,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt,
            payslips,
        } as PayrollRun;
    } catch (error) {
        console.error('Error getting payroll run:', error);
        throw new Error('Failed to fetch payroll run');
    }
};

/**
 * Create a new payroll run
 */
export const createPayrollRun = async (
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    drivers: Driver[],
    userId: string,
    bonusesMap?: Record<string, number>,
    deductionsMap?: Record<string, number>
): Promise<string> => {
    try {
        const payrollRunsRef = collection(db, PAYROLL_RUNS_COLLECTION);

        // Calculate payslips for all drivers
        const payslipsData = drivers.map(driver => {
            const bonuses = bonusesMap?.[driver.id] || 0;
            const deductions = deductionsMap?.[driver.id] || 0;
            return calculatePayslip(driver, periodStart, periodEnd, bonuses, deductions);
        });

        // Calculate totals
        const totalGross = payslipsData.reduce((sum, ps) => sum + ps.grossIncome, 0);
        const totalDeductions = payslipsData.reduce((sum, ps) => sum + ps.totalDeductions, 0);
        const totalNet = payslipsData.reduce((sum, ps) => sum + ps.netPay, 0);

        const newPayrollRun = {
            organizationId,
            periodStart,
            periodEnd,
            status: 'Draft',
            totalGross,
            totalDeductions,
            totalNet,
            employeeCount: drivers.length,
            processedDate: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        };

        const docRef = await addDoc(payrollRunsRef, newPayrollRun);

        // Create payslips in subcollection
        for (const payslipData of payslipsData) {
            await addPayslip(docRef.id, payslipData);
        }

        return docRef.id;
    } catch (error) {
        console.error('Error creating payroll run:', error);
        throw new Error('Failed to create payroll run');
    }
};

/**
 * Update a payroll run
 */
export const updatePayrollRun = async (
    payrollRunId: string,
    updates: Partial<Omit<PayrollRun, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
    try {
        const payrollRunRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId);

        const updateData: any = {
            ...updates,
            updatedAt: serverTimestamp(),
        };

        // Remove subcollection fields from update
        delete updateData.payslips;

        await updateDoc(payrollRunRef, updateData);
    } catch (error) {
        console.error('Error updating payroll run:', error);
        throw new Error('Failed to update payroll run');
    }
};

/**
 * Delete a payroll run
 */
export const deletePayrollRun = async (payrollRunId: string): Promise<void> => {
    try {
        const payrollRunRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId);
        await deleteDoc(payrollRunRef);
        // Note: Subcollections are not automatically deleted
        // In production, use Cloud Functions to handle cascade deletes
    } catch (error) {
        console.error('Error deleting payroll run:', error);
        throw new Error('Failed to delete payroll run');
    }
};

/**
 * Process payroll run (mark as processed)
 */
export const processPayrollRun = async (payrollRunId: string): Promise<void> => {
    try {
        const payrollRunRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId);
        await updateDoc(payrollRunRef, {
            status: 'Processed',
            processedDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error processing payroll run:', error);
        throw new Error('Failed to process payroll run');
    }
};

/**
 * Complete payroll run (mark all payslips as paid)
 */
export const completePayrollRun = async (payrollRunId: string): Promise<void> => {
    try {
        // Update all payslips to paid
        const payslips = await getPayslipsByPayrollRun(payrollRunId);
        for (const payslip of payslips) {
            await updatePayslipStatus(payrollRunId, payslip.id!, 'Paid');
        }

        // Update payroll run status
        const payrollRunRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId);
        await updateDoc(payrollRunRef, {
            status: 'Completed',
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error completing payroll run:', error);
        throw new Error('Failed to complete payroll run');
    }
};

/**
 * Get payroll runs by status
 */
export const getPayrollRunsByStatus = async (
    organizationId: string,
    status: PayrollRun['status']
): Promise<PayrollRun[]> => {
    try {
        const payrollRunsRef = collection(db, PAYROLL_RUNS_COLLECTION);
        const q = query(
            payrollRunsRef,
            where('organizationId', '==', organizationId),
            where('status', '==', status),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const payrollRuns: PayrollRun[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const payslips = await getPayslipsByPayrollRun(docSnap.id);

            payrollRuns.push({
                id: docSnap.id,
                ...data,
                periodStart: data.periodStart instanceof Timestamp
                    ? data.periodStart.toDate().toISOString()
                    : data.periodStart,
                periodEnd: data.periodEnd instanceof Timestamp
                    ? data.periodEnd.toDate().toISOString()
                    : data.periodEnd,
                processedDate: data.processedDate instanceof Timestamp
                    ? data.processedDate.toDate().toISOString()
                    : data.processedDate,
                createdAt: data.createdAt instanceof Timestamp
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp
                    ? data.updatedAt.toDate().toISOString()
                    : data.updatedAt,
                payslips,
            } as PayrollRun);
        }

        return payrollRuns;
    } catch (error) {
        console.error('Error getting payroll runs by status:', error);
        throw new Error('Failed to fetch payroll runs by status');
    }
};

// ========== Payslips Subcollection ==========

/**
 * Get all payslips for a payroll run
 */
export const getPayslipsByPayrollRun = async (payrollRunId: string): Promise<Payslip[]> => {
    try {
        const payslipsRef = collection(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips');
        const querySnapshot = await getDocs(payslipsRef);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                payrollRunId: payrollRunId,
                ...data,
                periodStart: data.periodStart instanceof Timestamp
                    ? data.periodStart.toDate().toISOString()
                    : data.periodStart,
                periodEnd: data.periodEnd instanceof Timestamp
                    ? data.periodEnd.toDate().toISOString()
                    : data.periodEnd,
                paidDate: data.paidDate instanceof Timestamp
                    ? data.paidDate.toDate().toISOString()
                    : data.paidDate,
            } as Payslip;
        });
    } catch (error) {
        console.error('Error getting payslips:', error);
        return [];
    }
};

/**
 * Get a single payslip
 */
export const getPayslipById = async (
    payrollRunId: string,
    payslipId: string
): Promise<Payslip | null> => {
    try {
        const payslipRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips', payslipId);
        const payslipSnap = await getDoc(payslipRef);

        if (!payslipSnap.exists()) {
            return null;
        }

        const data = payslipSnap.data();
        return {
            id: payslipSnap.id,
            payrollRunId: payrollRunId,
            ...data,
            periodStart: data.periodStart instanceof Timestamp
                ? data.periodStart.toDate().toISOString()
                : data.periodStart,
            periodEnd: data.periodEnd instanceof Timestamp
                ? data.periodEnd.toDate().toISOString()
                : data.periodEnd,
            paidDate: data.paidDate instanceof Timestamp
                ? data.paidDate.toDate().toISOString()
                : data.paidDate,
        } as Payslip;
    } catch (error) {
        console.error('Error getting payslip:', error);
        throw new Error('Failed to fetch payslip');
    }
};

/**
 * Add a payslip to a payroll run
 */
export const addPayslip = async (
    payrollRunId: string,
    payslipData: Omit<Payslip, 'id' | 'payrollRunId'>
): Promise<string> => {
    try {
        const payslipsRef = collection(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips');
        const docRef = await addDoc(payslipsRef, payslipData);
        return docRef.id;
    } catch (error) {
        console.error('Error adding payslip:', error);
        throw new Error('Failed to add payslip');
    }
};

/**
 * Update a payslip
 */
export const updatePayslip = async (
    payrollRunId: string,
    payslipId: string,
    updates: Partial<Omit<Payslip, 'id' | 'payrollRunId'>>
): Promise<void> => {
    try {
        const payslipRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips', payslipId);
        await updateDoc(payslipRef, updates);
    } catch (error) {
        console.error('Error updating payslip:', error);
        throw new Error('Failed to update payslip');
    }
};

/**
 * Update payslip status
 */
export const updatePayslipStatus = async (
    payrollRunId: string,
    payslipId: string,
    status: Payslip['status']
): Promise<void> => {
    try {
        const payslipRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips', payslipId);
        const updateData: any = { status };

        if (status === 'Paid') {
            updateData.paidDate = serverTimestamp();
        }

        await updateDoc(payslipRef, updateData);
    } catch (error) {
        console.error('Error updating payslip status:', error);
        throw new Error('Failed to update payslip status');
    }
};

/**
 * Update payslip PDF URL
 */
export const updatePayslipPdfUrl = async (
    payrollRunId: string,
    payslipId: string,
    pdfUrl: string
): Promise<void> => {
    try {
        const payslipRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips', payslipId);
        await updateDoc(payslipRef, { pdfUrl });
    } catch (error) {
        console.error('Error updating payslip PDF URL:', error);
        throw new Error('Failed to update payslip PDF URL');
    }
};

/**
 * Delete a payslip
 */
export const deletePayslip = async (payrollRunId: string, payslipId: string): Promise<void> => {
    try {
        const payslipRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips', payslipId);
        await deleteDoc(payslipRef);
    } catch (error) {
        console.error('Error deleting payslip:', error);
        throw new Error('Failed to delete payslip');
    }
};

/**
 * Get payslips by driver
 */
export const getPayslipsByDriver = async (
    organizationId: string,
    driverId: string
): Promise<Payslip[]> => {
    try {
        // Get all payroll runs for organization
        const payrollRuns = await getPayrollRunsByOrganization(organizationId);

        // Collect all payslips for this driver
        const driverPayslips: Payslip[] = [];

        for (const run of payrollRuns) {
            const payslips = run.payslips || [];
            const driverSlips = payslips.filter(ps => ps.driverId === driverId);
            driverPayslips.push(...driverSlips);
        }

        // Sort by period end date descending
        return driverPayslips.sort((a, b) => {
            return new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime();
        });
    } catch (error) {
        console.error('Error getting payslips by driver:', error);
        return [];
    }
};
