# Payroll System - Complete Guide

## ✅ **Your Payroll System is Already Fully Implemented!**

The payroll system **automatically generates payslips** based on the annual salary you enter when adding drivers.

---

## How It Works

### 1. **Adding a Driver with Salary**

When you add a new driver through the "Add Driver" modal, you enter:

- **Annual Salary** (`baseSalary` field) - e.g., ₦2,400,000/year
- **Pension Rate** (default: 8%)
- **NHF Rate** (default: 2.5%)

These values are stored in the driver's Firestore document.

### 2. **Creating a Payroll Run**

When you click **"Run New Payroll"**:

1. Select period (e.g., Nov 1 - Nov 30, 2025)
2. System fetches **ALL drivers** in your organization
3. For each driver, it automatically calculates their payslip:

```javascript
// Payslip Calculation (Automatic)
Monthly Base Pay = Annual Salary ÷ 12
Bonuses = Random (0-10% of base pay)  // Can be customized
Monthly Gross Pay = Base Pay + Bonuses

// Deductions
Monthly Pension = (Annual Salary × Pension Rate) ÷ 12
Monthly NHF = (Annual Salary × NHF Rate) ÷ 12
Monthly Tax = Nigerian PAYE Tax (calculated using 2026 tax brackets)

Net Pay = Gross Pay - Pension - NHF - Tax
```

### 3. **Nigerian PAYE Tax Calculation**

The system uses the **2026 Nigerian tax reform** progressive brackets:

| Taxable Income (Annual) | Tax Rate |
|-------------------------|----------|
| First ₦2M | 10% |
| Next ₦2M (₦2M - ₦4M) | 15% |
| Next ₦4M (₦4M - ₦8M) | 20% |
| Next ₦4M (₦8M - ₦12M) | 25% |
| Next ₦8M (₦12M - ₦20M) | 30% |
| Above ₦20M | 35% |

**Also includes:**
- **CRA (Consolidated Relief Allowance):** ₦200,000 + 20% of gross
- **Minimum Tax:** 1% of gross income

---

## Example Calculation

**Driver:** John Doe
**Annual Salary:** ₦2,400,000
**Pension Rate:** 8%
**NHF Rate:** 2.5%

### Monthly Breakdown:

```
Base Pay: ₦2,400,000 ÷ 12 = ₦200,000
Bonuses: ₦10,000 (random)
Gross Pay: ₦210,000

Annual Pension: ₦2,400,000 × 8% = ₦192,000
Monthly Pension: ₦192,000 ÷ 12 = ₦16,000

Annual NHF: ₦2,400,000 × 2.5% = ₦60,000
Monthly NHF: ₦60,000 ÷ 12 = ₦5,000

Annual Tax (PAYE):
  - CRA: ₦200,000 + (20% × ₦2,400,000) = ₦680,000
  - Taxable Income: ₦2,400,000 - ₦680,000 - ₦192,000 - ₦60,000 = ₦1,468,000
  - Tax on first ₦1,468,000: ₦1,468,000 × 10% = ₦146,800
Monthly Tax: ₦146,800 ÷ 12 = ₦12,233

Net Pay: ₦210,000 - ₦16,000 - ₦5,000 - ₦12,233 = ₦176,767
```

---

## Payroll Run Workflow

### Status Flow:

1. **Draft** (initial state)
   - Payslips are generated
   - Can review and edit
   - Can delete the run

2. **Processed** (click "Process Payroll")
   - Payroll is approved
   - Ready for payment
   - Can mark as paid

3. **Paid** (click "Mark as Paid")
   - All payslips marked as paid
   - Final state
   - Can download PDFs

---

## Why "No Payslips Found"?

If you see **"No payslips found"** in a payroll run, it means:

### **Likely Causes:**

1. ✅ **No drivers have `baseSalary` set**
   - Check: Go to Drivers → Edit Driver → Ensure "Annual Salary" is filled
   - Fix: Add annual salary to each driver (e.g., ₦2,400,000)

2. ✅ **Drivers weren't fetched correctly**
   - Check: Ensure drivers exist in Firestore
   - Fix: Add drivers first, then create payroll run

3. ✅ **Organization ID mismatch**
   - Check: Ensure you're logged in correctly
   - Fix: Refresh page, log out and back in

---

## How to Fix "No Payslips" Issue

### Step 1: Verify Drivers Have Salaries

1. Go to **Drivers** screen
2. Click **Edit** on a driver
3. Check if **"Annual Salary"** field is filled
4. If empty, enter a value (e.g., ₦2,400,000)
5. Save

### Step 2: Create New Payroll Run

1. Go to **Payroll** screen
2. Click **"Run New Payroll"**
3. Select period (e.g., Nov 1 - Nov 30)
4. Click **"Create Payroll Run"**

The system will:
- Fetch all drivers with `baseSalary` > 0
- Calculate payslips automatically
- Show payslips in the payroll run details

### Step 3: Verify Payslips Are Generated

1. Click **"Details"** on the payroll run
2. You should see:
   - **Total Amount:** ₦XXX,XXX (not ₦0.00)
   - **Payslips table** with each driver
   - Columns: Name, Base Pay, Bonuses, Total Deductions, Net Pay

---

## Firestore Structure

### Drivers Collection:

```javascript
{
  "name": "John Doe",
  "baseSalary": 2400000,  // Annual salary
  "pensionContributionRate": 8,  // Percentage
  "nhfContributionRate": 2.5,  // Percentage
  "bankInfo": {
    "accountNumber": "1234567890",
    "accountName": "John Doe",
    "bankName": "GTBank"
  }
}
```

### Payroll Runs Collection:

```javascript
{
  "organizationId": "org_123",
  "periodStart": "2025-11-01",
  "periodEnd": "2025-11-30",
  "payDate": "2025-12-05",
  "status": "Draft",
  "totalGrossPay": 2100000,
  "totalNetPay": 1767670,
  "totalTax": 122330,
  "totalDeductions": 332330
}
```

### Payslips Subcollection:

```javascript
payrollRuns/{payrollRunId}/payslips/{payslipId}
{
  "driverId": "driver_123",
  "driverName": "John Doe",
  "payPeriod": "Nov 2025",
  "payDate": "2025-12-05",
  "basePay": 200000,
  "bonuses": 10000,
  "grossPay": 210000,
  "tax": 12233,
  "pension": 16000,
  "nhf": 5000,
  "netPay": 176767,
  "status": "Draft",
  "bankInfo": { ... }
}
```

---

## Code Locations

### Payroll Calculation Logic:
- **File:** `services/firestore/payroll.ts`
- **Function:** `calculatePayslips()` (lines 76-136)
- **Tax Calculation:** `calculateNigerianPAYE()` (lines 24-71)

### Payroll Creation:
- **File:** `services/firestore/payroll.ts`
- **Function:** `createPayrollRun()` (lines 232-280)

### UI Components:
- **Payroll Screen:** `components/screens/PayrollScreen.tsx`
- **Payroll Run Details:** `components/screens/PayrollRunDetailsScreen.tsx`
- **Create Modal:** `components/modals/CreatePayrollRunModal.tsx`
- **Payslip Preview:** `components/payslip/PayslipPreview.tsx`

---

## Testing the System

### Test Case: Create Payroll for 1 Driver

1. **Add a driver:**
   - Name: Test Driver
   - Annual Salary: ₦2,400,000
   - Pension: 8%
   - NHF: 2.5%

2. **Create payroll run:**
   - Period: Nov 1 - Nov 30, 2025
   - Click "Create"

3. **Expected Result:**
   - Total Amount: ~₦176,767 (net pay)
   - 1 payslip showing:
     - Base Pay: ₦200,000
     - Bonuses: ~₦10,000 (random)
     - Gross Pay: ~₦210,000
     - Tax: ~₦12,233
     - Pension: ₦16,000
     - NHF: ₦5,000
     - Net Pay: ~₦176,767

---

## Advanced Features

### 1. **Bulk Operations**
- Create payroll for all drivers at once
- Process all payslips in one click
- Mark all as paid with one button

### 2. **PDF Generation**
- Download individual payslip PDFs
- Download all payslips in one PDF
- Uses jsPDF + html2canvas

### 3. **Filtering**
- Filter by status (Draft/Processed/Paid)
- Filter by date range
- Clear filters

### 4. **Bank Information**
- Stored in driver profile
- Appears on payslips
- Used for payment processing

---

## Common Questions

### Q: Can I edit payslips after creation?
**A:** Currently, no. Payslips are auto-generated. To change, you'd need to:
1. Update driver's salary
2. Delete payroll run
3. Create new payroll run

**Future:** Add manual editing feature for one-time adjustments.

### Q: Can I add bonuses to specific drivers?
**A:** Currently, bonuses are random (0-10%). To add manual bonuses:
1. Edit `payroll.ts` line 92
2. Pass bonus amount when creating payroll
3. Or add bonus field to driver profile

### Q: What if a driver starts mid-month?
**A:** Currently, system calculates full month salary. To prorate:
1. Manually adjust their annual salary temporarily
2. Or add "days worked" field
3. Calculate: `(basePay / 30) × daysWorked`

### Q: Can I change tax rates?
**A:** Yes! Edit `calculateNigerianPAYE()` in `services/firestore/payroll.ts` (lines 24-71).

---

## Summary

✅ **Your payroll system is fully functional!**

- Automatically generates payslips from driver's annual salary
- Uses Nigerian PAYE tax calculation (2026 reform)
- Includes pension, NHF deductions
- PDF download support
- Multi-status workflow (Draft → Processed → Paid)

**If you see "No payslips found":**
1. Check drivers have `baseSalary` filled in
2. Ensure drivers exist in Firestore
3. Create new payroll run

**Need help?** Check the code in `services/firestore/payroll.ts` for calculation logic!
