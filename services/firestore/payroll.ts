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
 * Progressive tax brackets with CRA and deductions
 */
const calculateNigerianPAYE = (
    annualGrossIncome: number,
    pensionContribution: number,
    nhfContribution: number
): number => {
    // 1. Calculate Consolidated Relief Allowance (CRA)
    const cra = 200000 + (0.20 * annualGrossIncome);

    // 2. Determine Total Reliefs
    const totalReliefs = cra + pensionContribution + nhfContribution;

    // 3. Calculate Taxable Income
    let taxableIncome = annualGrossIncome - totalReliefs;
    if (taxableIncome <= 0) {
        return Math.max(0.01 * annualGrossIncome, 0); // Minimum tax is 1% of gross income
    }

    // 4. Apply Tax Brackets (Proposed Annual)
    let tax = 0;

    if (taxableIncome > 20000000) {
        tax += (taxableIncome - 20000000) * 0.35;
        taxableIncome = 20000000;
    }
    if (taxableIncome > 12000000) {
        tax += (taxableIncome - 12000000) * 0.30;
        taxableIncome = 12000000;
    }
    if (taxableIncome > 8000000) {
        tax += (taxableIncome - 8000000) * 0.25;
        taxableIncome = 8000000;
    }
    if (taxableIncome > 4000000) {
        tax += (taxableIncome - 4000000) * 0.20;
        taxableIncome = 4000000;
    }
    if (taxableIncome > 2000000) {
        tax += (taxableIncome - 2000000) * 0.15;
        taxableIncome = 2000000;
    }
    if (taxableIncome > 0) {
        tax += taxableIncome * 0.10;
    }

    // 5. Apply Minimum Tax Rule
    const minimumTax = 0.01 * annualGrossIncome;
    return Math.max(tax, minimumTax);
};

/**
 * Calculate payslips for drivers - matches types.ts schema
 */
const calculatePayslips = (
    drivers: Driver[],
    periodStart: string,
    periodEnd: string
): Payslip[] => {
    console.log('🧮 [CALCULATE PAYSLIPS] Starting calculation...');
    console.log('🧮 Drivers to process:', drivers.length);

    const payPeriodDate = new Date(periodStart);
    const payPeriod = `${payPeriodDate.toLocaleString('default', { month: 'short' })} ${payPeriodDate.getFullYear()}`;
    const payDate = new Date(new Date(periodEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('📅 Pay Period:', payPeriod);
    console.log('📅 Pay Date:', payDate);

    return drivers.map((driver, index) => {
        console.log(`\n👤 Processing driver ${index + 1}/${drivers.length}:`, driver.name);
        console.log('  🔍 FULL DRIVER OBJECT:', driver);
        console.log('  🔍 driver.baseSalary:', driver.baseSalary);
        console.log('  🔍 driver.payrollInfo?.baseSalary:', driver.payrollInfo?.baseSalary);

        // Use default values if fields are missing
        // Check nested payrollInfo first, then fall back to flat structure
        const annualGross = driver.payrollInfo?.baseSalary || driver.baseSalary || 0;
        const pensionRate = driver.payrollInfo?.pensionContributionRate || driver.pensionContributionRate || 8;
        const nhfRate = driver.payrollInfo?.nhfContributionRate || driver.nhfContributionRate || 2.5;

        console.log('  💰 Annual Salary:', annualGross);
        console.log('  📊 Pension Rate:', pensionRate + '%');
        console.log('  📊 NHF Rate:', nhfRate + '%');

        const monthlyBasePay = annualGross / 12;
        const bonuses = Math.random() > 0.5 ? Math.round(Math.random() * (monthlyBasePay * 0.1)) : 0;
        const monthlyGrossPay = monthlyBasePay + bonuses;

        // Calculate annual deductions for tax calculation
        const annualPension = annualGross * (pensionRate / 100);
        const annualNhf = annualGross * (nhfRate / 100);

        // Calculate annual tax
        const annualTax = calculateNigerianPAYE(annualGross, annualPension, annualNhf);

        // Convert to monthly
        const monthlyTax = annualTax / 12;
        const monthlyPension = annualPension / 12;
        const monthlyNhf = annualNhf / 12;

        const netPay = monthlyGrossPay - monthlyTax - monthlyPension - monthlyNhf;

        console.log('  📊 Calculations:');
        console.log('    - Monthly Base Pay: ₦', Math.round(monthlyBasePay));
        console.log('    - Bonuses: ₦', Math.round(bonuses));
        console.log('    - Gross Pay: ₦', Math.round(monthlyGrossPay));
        console.log('    - Tax: ₦', Math.round(monthlyTax));
        console.log('    - Pension: ₦', Math.round(monthlyPension));
        console.log('    - NHF: ₦', Math.round(monthlyNhf));
        console.log('    - NET PAY: ₦', Math.round(netPay));

        const payslip: Payslip = {
            id: `PS-${driver.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            driverId: typeof driver.id === 'string' ? parseInt(driver.id.replace(/\D/g, '')) || 0 : driver.id,
            driverName: driver.name,
            payPeriod,
            payDate,
            basePay: Math.round(monthlyBasePay),
            bonuses: Math.round(bonuses),
            grossPay: Math.round(monthlyGrossPay),
            tax: Math.round(monthlyTax),
            pension: Math.round(monthlyPension),
            nhf: Math.round(monthlyNhf),
            netPay: Math.round(netPay),
            status: 'Draft' as const,
        };

        // Add bank info if available
        if (driver.bankInfo) {
            payslip.bankInfo = {
                accountNumber: driver.bankInfo.accountNumber,
                accountName: driver.bankInfo.accountName,
                bankName: driver.bankInfo.bankName,
            };
        }

        console.log('  ✅ Payslip created for', driver.name);
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
        console.log('🔵 [PAYROLL DEBUG] Creating payroll run...');
        console.log('📊 Organization ID:', organizationId);
        console.log('📅 Period:', periodStart, 'to', periodEnd);
        console.log('👥 Number of drivers received:', drivers.length);
        console.log('👥 Drivers data:', drivers.map(d => ({
            id: d.id,
            name: d.name,
            baseSalary: d.baseSalary,
            pensionRate: d.pensionContributionRate,
            nhfRate: d.nhfContributionRate
        })));

        const payrollRunsRef = collection(db, PAYROLL_RUNS_COLLECTION);

        // Calculate payslips for all drivers
        const payslipsData = calculatePayslips(drivers, periodStart, periodEnd);

        console.log('💰 Payslips generated:', payslipsData.length);
        console.log('💰 Payslip details:', payslipsData.map(p => ({
            driver: p.driverName,
            basePay: p.basePay,
            grossPay: p.grossPay,
            netPay: p.netPay,
            tax: p.tax,
            pension: p.pension,
            nhf: p.nhf
        })));

        // Calculate totals
        const totalGrossPay = payslipsData.reduce((sum, ps) => sum + ps.grossPay, 0);
        const totalNetPay = payslipsData.reduce((sum, ps) => sum + ps.netPay, 0);
        const totalTax = payslipsData.reduce((sum, ps) => sum + ps.tax, 0);
        const totalDeductions = payslipsData.reduce((sum, ps) => sum + (ps.tax + ps.pension + ps.nhf), 0);

        console.log('📈 Totals calculated:');
        console.log('  - Total Gross Pay: ₦', totalGrossPay);
        console.log('  - Total Net Pay: ₦', totalNetPay);
        console.log('  - Total Tax: ₦', totalTax);
        console.log('  - Total Deductions: ₦', totalDeductions);

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

        console.log('💾 Creating payroll run document...');
        const docRef = await addDoc(payrollRunsRef, newPayrollRun);
        console.log('✅ Payroll run created with ID:', docRef.id);

        // Create payslips in subcollection
        console.log('💾 Creating payslips in subcollection...');
        for (const payslipData of payslipsData) {
            const payslipId = await addPayslip(docRef.id, payslipData);
            console.log('  ✅ Payslip created for', payslipData.driverName, '- ID:', payslipId);
        }

        console.log('🎉 Payroll run creation complete!');

        // Trigger refresh event for real-time UI update
        window.dispatchEvent(new Event('refreshPayrollRuns'));

        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating payroll run:', error);
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
 * Mark payroll run as paid (mark all payslips as paid)
 */
export const markPayrollRunAsPaid = async (payrollRunId: string): Promise<void> => {
    try {
        // Update all payslips to paid
        const payslips = await getPayslipsByPayrollRun(payrollRunId);
        for (const payslip of payslips) {
            if (payslip.id) {
                await updatePayslipStatus(payrollRunId, payslip.id, 'Paid');
            }
        }

        // Update payroll run status
        const payrollRunRef = doc(db, PAYROLL_RUNS_COLLECTION, payrollRunId);
        await updateDoc(payrollRunRef, {
            status: 'Paid',
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error marking payroll run as paid:', error);
        throw new Error('Failed to mark payroll run as paid');
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
        console.log('🔍 [GET PAYSLIPS] Fetching payslips for payroll run:', payrollRunId);
        const payslipsRef = collection(db, PAYROLL_RUNS_COLLECTION, payrollRunId, 'payslips');
        const querySnapshot = await getDocs(payslipsRef);

        console.log('🔍 [GET PAYSLIPS] Found', querySnapshot.docs.length, 'payslips');

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
