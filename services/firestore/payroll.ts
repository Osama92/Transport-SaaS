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
import { calculateNigerianPAYE } from '../../firebase/config';

const PAYROLL_RUNS_COLLECTION = 'payrollRuns';

// NOTE: calculateNigerianPAYE is now imported from firebase/config.ts
// This ensures EXACT consistency between driver pay screen and payslip calculations

/**
 * Calculate payslips for drivers - matches types.ts schema
 */
const calculatePayslips = (
    drivers: Driver[],
    periodStart: string,
    periodEnd: string
): Payslip[] => {
    const payPeriodDate = new Date(periodStart);
    const payPeriod = `${payPeriodDate.toLocaleString('default', { month: 'short' })} ${payPeriodDate.getFullYear()}`;
    const payDate = new Date(new Date(periodEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('[PAYROLL] Calculating payslips for', drivers.length, 'drivers, period:', payPeriod);

    return drivers.map((driver, index) => {
        console.log('[PAYROLL] Processing driver:', driver.name, '(ID:', driver.id, ')');

        // Use payrollInfo structure ONLY - no fallback to deprecated percentage fields
        const annualGross = driver.payrollInfo?.baseSalary ?? driver.baseSalary ?? 0;

        // Use NEW Naira-based deductions ONLY (ignore deprecated percentage fields)
        const pensionContribution = driver.payrollInfo?.pensionContribution ?? 0;
        const nhfContribution = driver.payrollInfo?.nhfContribution ?? 0;
        const nhisContribution = driver.payrollInfo?.nhisContribution ?? 0;
        const annualRent = driver.payrollInfo?.annualRent ?? 0;
        const loanInterest = driver.payrollInfo?.loanInterest ?? 0;
        const lifeInsurance = driver.payrollInfo?.lifeInsurance ?? 0;

        console.log('[PAYROLL] Driver', driver.name, '- Annual salary:', annualGross);
        console.log('[PAYROLL] Driver', driver.name, '- Pension (annual):', pensionContribution, 'NHF:', nhfContribution);

        const monthlyBasePay = annualGross / 12;

        // NO RANDOM BONUSES! Bonuses come from the separate Bonus collection
        const totalBonusAmount = 0; // TODO: Aggregate approved bonuses from bonuses collection

        const monthlyGrossPay = monthlyBasePay + totalBonusAmount;

        // Calculate tax using NEW function with all deductions
        const taxCalculation = calculateNigerianPAYE(
            annualGross,
            pensionContribution,
            nhfContribution,
            nhisContribution,
            loanInterest,
            lifeInsurance,
            annualRent
        );

        // Convert annual deductions back to monthly for the payslip
        const monthlyTax = taxCalculation.monthlyTax;
        const monthlyPension = pensionContribution / 12;
        const monthlyNhf = nhfContribution / 12;

        const netPay = monthlyGrossPay - monthlyTax - monthlyPension - monthlyNhf;

        console.log('[PAYROLL] Driver', driver.name, '- Monthly base:', monthlyBasePay, 'Tax:', monthlyTax, 'Pension:', monthlyPension, 'NHF:', monthlyNhf, 'Net:', netPay);

        const payslip: Payslip = {
            id: `PS-${driver.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            driverId: typeof driver.id === 'string' ? driver.id : driver.id.toString(), // Store actual driver ID string
            driverName: driver.name,
            payPeriod,
            payDate,
            basePay: Math.round(monthlyBasePay),
            bonuses: Math.round(totalBonusAmount),
            grossPay: Math.round(monthlyGrossPay),
            tax: Math.round(monthlyTax),
            pension: Math.round(monthlyPension),
            nhf: Math.round(monthlyNhf),
            netPay: Math.round(netPay),
            status: 'Draft' as const,
            // Transparency fields from tax calculation
            annualGrossIncome: taxCalculation.grossIncome,
            cra: Math.round(taxCalculation.cra),
            totalDeductions: Math.round(taxCalculation.totalDeductions),
            taxableIncome: taxCalculation.taxableIncome,
            taxBreakdown: taxCalculation.taxBreakdown,
            effectiveTaxRate: taxCalculation.effectiveTaxRate,
        };

        // Add bank info if available
        if (driver.bankInfo) {
            payslip.bankInfo = {
                accountNumber: driver.bankInfo.accountNumber,
                accountName: driver.bankInfo.accountName,
                bankName: driver.bankInfo.bankName,
            };
        }
        return payslip;
    });
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
    userId: string
): Promise<string> => {
    try {
        const payrollRunsRef = collection(db, PAYROLL_RUNS_COLLECTION);

        // Calculate payslips for all drivers
        const payslipsData = calculatePayslips(drivers, periodStart, periodEnd);

        // Calculate totals
        const totalGrossPay = payslipsData.reduce((sum, ps) => sum + ps.grossPay, 0);
        const totalNetPay = payslipsData.reduce((sum, ps) => sum + ps.netPay, 0);
        const totalTax = payslipsData.reduce((sum, ps) => sum + ps.tax, 0);
        const totalDeductions = payslipsData.reduce((sum, ps) => sum + (ps.tax + ps.pension + ps.nhf), 0);

        const payDate = payslipsData[0]?.payDate || new Date().toISOString().split('T')[0];

        const newPayrollRun = {
            organizationId,
            periodStart,
            periodEnd,
            payDate,
            status: 'Draft' as const,
            totalGrossPay,
            totalNetPay,
            totalTax,
            totalDeductions,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        };

        const docRef = await addDoc(payrollRunsRef, newPayrollRun);

        // Create payslips in subcollection
        for (const payslipData of payslipsData) {
            await addPayslip(docRef.id, payslipData);
        }

        // Trigger refresh event for real-time UI update
        window.dispatchEvent(new Event('refreshPayrollRuns'));

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
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error processing payroll run:', error);
        throw new Error('Failed to process payroll run');
    }
};

/**
 * Process payroll - Deduct from organization balance
 * Changes status from Draft → Processed
 */
export const processPayroll = async (
    payrollRunId: string,
    organizationId: string
): Promise<void> => {
    try {
        // Get payroll run
        const payrollRunRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId);
        const payrollRunSnap = await getDoc(payrollRunRef);

        if (!payrollRunSnap.exists()) {
            throw new Error('Payroll run not found');
        }

        const payrollRun = payrollRunSnap.data() as PayrollRun;

        if (payrollRun.status !== 'Draft') {
            throw new Error('Only draft payroll runs can be processed');
        }

        // Get organization
        const orgRef = doc(db, 'organizations', organizationId);
        const orgSnap = await getDoc(orgRef);

        if (!orgSnap.exists()) {
            throw new Error('Organization not found');
        }

        const organization = orgSnap.data();
        const currentBalance = organization.walletBalance || 0;
        const totalNetPay = payrollRun.totalNetPay || 0;

        // Check if organization has sufficient funds
        if (currentBalance < totalNetPay) {
            throw new Error(`Insufficient funds. Available: ₦${currentBalance.toLocaleString()}, Required: ₦${totalNetPay.toLocaleString()}`);
        }

        // Deduct from organization balance
        await updateDoc(orgRef, {
            walletBalance: currentBalance - totalNetPay,
            updatedAt: serverTimestamp(),
        });

        // Update payroll run status to Processed
        await updateDoc(payrollRunRef, {
            status: 'Processed',
            processedDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Trigger refresh
        window.dispatchEvent(new Event('refreshPayrollRuns'));
    } catch (error) {
        console.error('Error processing payroll:', error);
        throw error;
    }
};

/**
 * Mark payroll run as paid - Credit driver wallets
 * Changes status from Processed → Paid
 */
export const markPayrollRunAsPaid = async (payrollRunId: string): Promise<void> => {
    try {
        // Get payroll run
        const payrollRunRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId);
        const payrollRunSnap = await getDoc(payrollRunRef);

        if (!payrollRunSnap.exists()) {
            throw new Error('Payroll run not found');
        }

        const payrollRun = payrollRunSnap.data() as PayrollRun;

        if (payrollRun.status !== 'Processed') {
            throw new Error('Only processed payroll runs can be marked as paid');
        }

        // Get all payslips
        const payslips = await getPayslipsByPayrollRun(payrollRunId);

        // Update each driver's wallet balance
        for (const payslip of payslips) {
            if (payslip.driverId) {
                // Get driver document directly by ID
                const driverRef = doc(db, 'drivers', payslip.driverId);
                const driverSnap = await getDoc(driverRef);

                if (driverSnap.exists()) {
                    const driver = driverSnap.data();
                    const currentWalletBalance = driver.walletBalance || 0;

                    console.log(`[PAYROLL] Crediting driver ${payslip.driverName} (${payslip.driverId})`);
                    console.log(`[PAYROLL] Current balance: ₦${currentWalletBalance.toLocaleString()}`);
                    console.log(`[PAYROLL] Net pay: ₦${payslip.netPay.toLocaleString()}`);
                    console.log(`[PAYROLL] New balance: ₦${(currentWalletBalance + payslip.netPay).toLocaleString()}`);

                    // Credit driver wallet
                    await updateDoc(driverRef, {
                        walletBalance: currentWalletBalance + payslip.netPay,
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    console.error(`[PAYROLL] Driver not found: ${payslip.driverId}`);
                }

                // Mark payslip as paid
                if (payslip.id) {
                    await updatePayslipStatus(payrollRunId, payslip.id, 'Paid');
                }
            }
        }

        // Update payroll run status to Paid
        await updateDoc(payrollRunRef, {
            status: 'Paid',
            paidDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Trigger refresh
        window.dispatchEvent(new Event('refreshPayrollRuns'));
    } catch (error) {
        console.error('Error marking payroll run as paid:', error);
        throw error;
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
const addPayslip = async (
    payrollRunId: string,
    payslipData: Payslip
): Promise<string> => {
    try {
        const payslipsRef = collection(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips');
        const { id, ...dataWithoutId } = payslipData;
        const docRef = await addDoc(payslipsRef, dataWithoutId);
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
