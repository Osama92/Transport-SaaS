/**
 * Phone Number Validation Service for Nigerian Numbers
 * Supports formats: +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXX
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string; // Always returns +234XXXXXXXXXX format
  carrier?: 'MTN' | 'Airtel' | 'Glo' | '9mobile' | 'Unknown';
  error?: string;
}

/**
 * Nigerian mobile carrier prefixes
 */
const NIGERIAN_CARRIERS = {
  MTN: ['0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906'],
  Airtel: ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912'],
  Glo: ['0705', '0805', '0807', '0811', '0815', '0905', '0915'],
  '9mobile': ['0809', '0817', '0818', '0909', '0908']
};

/**
 * Validates and formats Nigerian phone numbers
 */
export const validateNigerianPhone = (phone: string): PhoneValidationResult => {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number is required'
    };
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Check different formats
  let normalized = '';

  if (cleaned.startsWith('234') && cleaned.length === 13) {
    // Format: 234XXXXXXXXXX
    normalized = cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Format: 0XXXXXXXXXX
    normalized = '234' + cleaned.substring(1);
  } else if (cleaned.length === 10) {
    // Format: XXXXXXXXXX (without leading 0)
    normalized = '234' + cleaned;
  } else {
    return {
      isValid: false,
      formatted: '',
      error: 'Invalid phone number format. Use format: 0XXXXXXXXXX or +234XXXXXXXXXX'
    };
  }

  // Validate length (should be 13 digits: 234 + 10 digits)
  if (normalized.length !== 13) {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number must be 11 digits (e.g., 08012345678)'
    };
  }

  // Get prefix for carrier detection
  const prefix = '0' + normalized.substring(3, 6);

  // Determine carrier
  let carrier: PhoneValidationResult['carrier'] = 'Unknown';
  for (const [carrierName, prefixes] of Object.entries(NIGERIAN_CARRIERS)) {
    if (prefixes.includes(prefix)) {
      carrier = carrierName as PhoneValidationResult['carrier'];
      break;
    }
  }

  return {
    isValid: true,
    formatted: '+' + normalized,
    carrier
  };
};

/**
 * Formats phone number for display (e.g., +234 803 123 4567)
 */
export const formatPhoneForDisplay = (phone: string): string => {
  const validation = validateNigerianPhone(phone);
  if (!validation.isValid) return phone;

  const cleaned = validation.formatted.replace('+', '');
  // Format: +234 803 123 4567
  return `+${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
};

/**
 * Check if phone number belongs to a specific carrier
 */
export const getCarrier = (phone: string): string => {
  const validation = validateNigerianPhone(phone);
  return validation.carrier || 'Unknown';
};

/**
 * Mask phone number for display (e.g., +234 803 *** 4567)
 */
export const maskPhoneNumber = (phone: string): string => {
  const validation = validateNigerianPhone(phone);
  if (!validation.isValid) return '***';

  const cleaned = validation.formatted.replace('+', '');
  return `+${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} *** ${cleaned.substring(9)}`;
};
