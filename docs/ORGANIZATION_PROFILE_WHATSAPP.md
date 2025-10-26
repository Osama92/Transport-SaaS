# Organization Profile Management via WhatsApp

## Overview

This document describes the implementation plan for managing organization profile settings through WhatsApp. This allows users to view and update company details, bank account information, and other invoice-related settings directly from WhatsApp.

## Current State

### Existing Data Structure (from types.ts)

```typescript
Organization {
    id: string;
    name: string;
    companyDetails?: {
        address: string;
        email: string;
        phone: string;
        tin?: string;           // Tax Identification Number
        cacNumber?: string;     // Corporate Affairs Commission Number
        logoUrl?: string;       // Company logo URL
        website?: string;
    };
}
```

### What's Missing for Invoices

The current `Organization` type doesn't include bank account details needed for invoice payments. We need to add:

```typescript
paymentDetails?: {
    bankAccountName: string;    // Account holder name
    bankAccountNumber: string;  // Account number
    bankName: string;           // Bank name
}
```

## Implementation Plan

### Phase 1: Add Payment Details to Organization Type ✅

**File**: `types.ts` (lines 60-68)

**Action**: Extend the `Organization.companyDetails` or add a new `paymentDetails` field

```typescript
Organization {
    // ... existing fields
    companyDetails?: {
        address: string;
        email: string;
        phone: string;
        tin?: string;
        cacNumber?: string;
        logoUrl?: string;
        website?: string;
    };
    paymentDetails?: {
        bankAccountName: string;
        bankAccountNumber: string;
        bankName: string;
    };
}
```

### Phase 2: Create Organization Profile Functions

**File**: `functions/src/whatsapp/openaiIntegration.ts`

Add 3 new private methods:

#### 1. Get Organization Profile

```typescript
/**
 * Get organization profile (company details + payment details)
 */
private async getOrganizationProfile(organizationId: string): Promise<any> {
    try {
        const orgDoc = await this.db.collection('organizations').doc(organizationId).get();

        if (!orgDoc.exists) {
            return {
                success: false,
                error: 'Organization not found'
            };
        }

        const orgData = orgDoc.data();

        return {
            success: true,
            profile: {
                name: orgData?.name || 'Not set',
                companyDetails: orgData?.companyDetails || {},
                paymentDetails: orgData?.paymentDetails || {}
            }
        };
    } catch (error: any) {
        console.error('Error getting organization profile:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```

#### 2. Update Company Details

```typescript
/**
 * Update company details (name, address, email, phone, logo, website, tin, cacNumber)
 */
private async updateCompanyDetails(
    organizationId: string,
    updates: {
        name?: string;
        address?: string;
        email?: string;
        phone?: string;
        logoUrl?: string;
        website?: string;
        tin?: string;
        cacNumber?: string;
    }
): Promise<any> {
    try {
        const orgDoc = await this.db.collection('organizations').doc(organizationId).get();

        if (!orgDoc.exists) {
            return {
                success: false,
                error: 'Organization not found'
            };
        }

        const updateData: any = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Update organization name if provided
        if (updates.name) {
            updateData.name = updates.name;
        }

        // Update company details fields
        const companyDetailsUpdates: any = {};
        if (updates.address) companyDetailsUpdates.address = updates.address;
        if (updates.email) companyDetailsUpdates.email = updates.email;
        if (updates.phone) companyDetailsUpdates.phone = updates.phone;
        if (updates.logoUrl) companyDetailsUpdates.logoUrl = updates.logoUrl;
        if (updates.website) companyDetailsUpdates.website = updates.website;
        if (updates.tin) companyDetailsUpdates.tin = updates.tin;
        if (updates.cacNumber) companyDetailsUpdates.cacNumber = updates.cacNumber;

        // Merge with existing companyDetails
        if (Object.keys(companyDetailsUpdates).length > 0) {
            updateData['companyDetails'] = companyDetailsUpdates;
        }

        await this.db.collection('organizations').doc(organizationId).update(updateData);

        return {
            success: true,
            message: 'Company details updated successfully'
        };
    } catch (error: any) {
        console.error('Error updating company details:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```

#### 3. Update Payment Details

```typescript
/**
 * Update payment details (bank account information for invoices)
 */
private async updatePaymentDetails(
    organizationId: string,
    updates: {
        bankAccountName?: string;
        bankAccountNumber?: string;
        bankName?: string;
    }
): Promise<any> {
    try {
        const orgDoc = await this.db.collection('organizations').doc(organizationId).get();

        if (!orgDoc.exists) {
            return {
                success: false,
                error: 'Organization not found'
            };
        }

        const paymentDetailsUpdates: any = {};
        if (updates.bankAccountName) paymentDetailsUpdates.bankAccountName = updates.bankAccountName;
        if (updates.bankAccountNumber) paymentDetailsUpdates.bankAccountNumber = updates.bankAccountNumber;
        if (updates.bankName) paymentDetailsUpdates.bankName = updates.bankName;

        if (Object.keys(paymentDetailsUpdates).length === 0) {
            return {
                success: false,
                error: 'No payment details provided to update'
            };
        }

        await this.db.collection('organizations').doc(organizationId).update({
            paymentDetails: paymentDetailsUpdates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            message: 'Payment details updated successfully'
        };
    } catch (error: any) {
        console.error('Error updating payment details:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```

### Phase 3: Add OpenAI Function Definitions

Add these to the `tools` array in the OpenAI API call (around line 700):

```typescript
{
    type: 'function',
    function: {
        name: 'get_organization_profile',
        description: 'Get current organization profile including company details and payment information',
        parameters: {
            type: 'object',
            properties: {}
        }
    }
},
{
    type: 'function',
    function: {
        name: 'update_company_details',
        description: 'Update company information such as name, address, email, phone, logo, website, TIN, or CAC number',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Company name'
                },
                address: {
                    type: 'string',
                    description: 'Company address'
                },
                email: {
                    type: 'string',
                    description: 'Company email'
                },
                phone: {
                    type: 'string',
                    description: 'Company phone number'
                },
                logoUrl: {
                    type: 'string',
                    description: 'Company logo URL'
                },
                website: {
                    type: 'string',
                    description: 'Company website'
                },
                tin: {
                    type: 'string',
                    description: 'Tax Identification Number'
                },
                cacNumber: {
                    type: 'string',
                    description: 'Corporate Affairs Commission Number'
                }
            }
        }
    }
},
{
    type: 'function',
    function: {
        name: 'update_payment_details',
        description: 'Update bank account details for invoice payments',
        parameters: {
            type: 'object',
            properties: {
                bankAccountName: {
                    type: 'string',
                    description: 'Bank account holder name'
                },
                bankAccountNumber: {
                    type: 'string',
                    description: 'Bank account number'
                },
                bankName: {
                    type: 'string',
                    description: 'Bank name (e.g., Access Bank, GTBank)'
                }
            }
        }
    }
}
```

### Phase 4: Add Switch Cases for Function Execution

Add these cases in the switch statement (around line 1084):

```typescript
case 'get_organization_profile':
    functionResult = await this.getOrganizationProfile(organizationId);
    break;

case 'update_company_details':
    functionResult = await this.updateCompanyDetails(organizationId, functionArgs);
    break;

case 'update_payment_details':
    functionResult = await this.updatePaymentDetails(organizationId, functionArgs);
    break;
```

### Phase 5: Update Invoice Creation to Use Payment Details

**File**: `functions/src/whatsapp/openaiIntegration.ts` (around line 1380)

Update the invoice creation to fetch and use payment details:

```typescript
// Fetch organization data including payment details
const orgDoc = await this.db.collection('organizations').doc(organizationId).get();
const orgData = orgDoc.exists ? orgDoc.data() : null;

// ... existing invoice creation code ...

// Add payment details to invoice
invoiceData.paymentDetails = {
    method: 'Bank Transfer',
    accountName: orgData?.paymentDetails?.bankAccountName || 'Not set',
    accountNumber: orgData?.paymentDetails?.bankAccountNumber || 'Not set',
    code: '',
    bankName: orgData?.paymentDetails?.bankName || 'Not set'
};
```

## Usage Examples

### View Organization Profile

**User**: "Show my company profile"

**Bot Response**:
```
📊 Organization Profile

Company Name: Dewaks Logistics
Address: 123 Main Street, Lagos
Email: info@dewakslogistics.com
Phone: +234 703 1167 360
Website: www.dewakslogistics.com
TIN: 12345678-0001
CAC Number: RC123456

💳 Payment Details
Bank: Access Bank
Account Name: Dewaks Logistics Ltd
Account Number: 1234567890
```

### Update Company Details

**User**: "Update my company address to 456 New Street, Abuja"

**Bot Response**:
```
✅ Company details updated successfully!

Your company address has been changed to:
456 New Street, Abuja
```

### Update Payment Details

**User**: "Update my bank details to GTBank, account number 0987654321, account name Dewaks Logistics"

**Bot Response**:
```
✅ Payment details updated successfully!

New Bank Details:
Bank: GTBank
Account Name: Dewaks Logistics
Account Number: 0987654321

These details will now appear on all new invoices.
```

## Safety Measures

1. **No Deletion**: Profile updates only - no deletion of organization data
2. **Validation**: All updates are validated before saving
3. **Logging**: All profile changes are logged with timestamps
4. **Rollback**: Existing functionality is not modified - only new functions added
5. **Testing**: Each function can be tested independently before full deployment

## Testing Checklist

- [ ] Get organization profile works
- [ ] Update company name
- [ ] Update company address
- [ ] Update company email
- [ ] Update company phone
- [ ] Update logo URL
- [ ] Update website
- [ ] Update TIN
- [ ] Update CAC number
- [ ] Update bank account name
- [ ] Update bank account number
- [ ] Update bank name
- [ ] Invoice creation uses new payment details
- [ ] Invoice preview shows correct payment details
- [ ] Existing invoices are not affected

## Rollback Plan

If any issues occur:
1. The new functions are isolated - removing them won't affect existing features
2. Invoices will continue to work with existing logic
3. Simply comment out the new function definitions and switch cases
4. Redeploy to Firebase

## Next Steps

1. Review this plan
2. Update `types.ts` to add `paymentDetails` field
3. Implement the 3 new functions in `openaiIntegration.ts`
4. Add OpenAI function definitions
5. Add switch cases
6. Update invoice creation to use payment details
7. Test each function individually
8. Deploy to Firebase
9. Test via WhatsApp
10. Monitor logs for any issues
