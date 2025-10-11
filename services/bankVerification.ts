/**
 * Bank Account Verification Service using Paystack API
 * Docs: https://paystack.com/docs/identity-verification/resolve-account-number
 */

export interface NigerianBank {
    name: string;
    code: string;
    slug: string;
}

export interface AccountVerificationResult {
    accountNumber: string;
    accountName: string;
    bankCode: string;
}

// List of major Nigerian banks
export const NIGERIAN_BANKS: NigerianBank[] = [
    { name: 'Access Bank', code: '044', slug: 'access-bank' },
    { name: 'Citibank Nigeria', code: '023', slug: 'citibank-nigeria' },
    { name: 'Diamond Bank', code: '063', slug: 'diamond-bank' },
    { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
    { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
    { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
    { name: 'First City Monument Bank', code: '214', slug: 'first-city-monument-bank' },
    { name: 'Guaranty Trust Bank', code: '058', slug: 'guaranty-trust-bank' },
    { name: 'Heritage Bank', code: '030', slug: 'heritage-bank' },
    { name: 'Keystone Bank', code: '082', slug: 'keystone-bank' },
    { name: 'Polaris Bank', code: '076', slug: 'polaris-bank' },
    { name: 'Providus Bank', code: '101', slug: 'providus-bank' },
    { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
    { name: 'Standard Chartered Bank', code: '068', slug: 'standard-chartered-bank' },
    { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
    { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
    { name: 'United Bank For Africa', code: '033', slug: 'united-bank-for-africa' },
    { name: 'Unity Bank', code: '215', slug: 'unity-bank' },
    { name: 'Wema Bank', code: '035', slug: 'wema-bank' },
    { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
    { name: 'Jaiz Bank', code: '301', slug: 'jaiz-bank' },
    { name: 'Suntrust Bank', code: '100', slug: 'suntrust-bank' },
    { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
    { name: 'Opay', code: '999992', slug: 'opay' },
    { name: 'PalmPay', code: '999991', slug: 'palmpay' },
    { name: 'Moniepoint', code: '50515', slug: 'moniepoint' },
];

/**
 * Verify a Nigerian bank account using Paystack API
 * @param accountNumber - 10-digit account number
 * @param bankCode - 3 or 6-digit bank code
 * @returns Account verification result or null if verification fails
 */
export async function verifyBankAccount(
    accountNumber: string,
    bankCode: string
): Promise<AccountVerificationResult | null> {
    const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

    if (!secretKey || secretKey === 'sk_test_your_secret_key_here') {
        console.warn('Paystack secret key not configured. Please add VITE_PAYSTACK_SECRET_KEY to .env');
        return null;
    }

    // Validate inputs
    if (!accountNumber || accountNumber.length !== 10) {
        throw new Error('Account number must be exactly 10 digits');
    }

    if (!bankCode) {
        throw new Error('Bank code is required');
    }

    try {
        const response = await fetch(
            `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Paystack API error:', data);
            throw new Error(data.message || 'Failed to verify account');
        }

        if (data.status && data.data) {
            return {
                accountNumber: data.data.account_number,
                accountName: data.data.account_name,
                bankCode: bankCode,
            };
        }

        return null;
    } catch (error) {
        console.error('Error verifying bank account:', error);
        throw error;
    }
}

/**
 * Get all Nigerian banks from Paystack (optional, for dynamic list)
 * For now, we use the static list above
 */
export async function getBanksList(): Promise<NigerianBank[]> {
    const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

    if (!secretKey || secretKey === 'sk_test_your_secret_key_here') {
        // Return static list if API key not configured
        return NIGERIAN_BANKS;
    }

    try {
        const response = await fetch('https://api.paystack.co/bank', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.status && data.data) {
            return data.data.map((bank: any) => ({
                name: bank.name,
                code: bank.code,
                slug: bank.slug,
            }));
        }

        // Fallback to static list
        return NIGERIAN_BANKS;
    } catch (error) {
        console.error('Error fetching banks list:', error);
        // Fallback to static list
        return NIGERIAN_BANKS;
    }
}
