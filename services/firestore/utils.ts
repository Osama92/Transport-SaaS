/**
 * Utility functions for Firestore operations
 */

/**
 * Generate a readable document ID with prefix and timestamp
 * Format: prefix-YYYYMMDD-HHMMSS-random
 * Example: driver-20251009-143022-abc123
 */
export const generateReadableId = (prefix: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Generate a short random suffix for uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;
};

/**
 * Generate driver ID
 * Format: DRV-YYYYMMDD-HHMMSS-random
 * Example: DRV-20251009-143022-abc123
 */
export const generateDriverId = (): string => {
    return generateReadableId('DRV');
};

/**
 * Generate vehicle ID
 * Format: VEH-YYYYMMDD-HHMMSS-random
 * Example: VEH-20251009-143022-abc123
 */
export const generateVehicleId = (): string => {
    return generateReadableId('VEH');
};

/**
 * Generate route ID with origin and destination
 * Format: RTE-Origin-Destination-random
 * Example: RTE-Lagos-Abuja-abc123
 */
export const generateRouteId = (origin?: string, destination?: string): string => {
    if (origin && destination) {
        // Clean up the names: remove special characters, trim, and limit length
        const cleanOrigin = origin.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
        const cleanDestination = destination.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        return `RTE-${cleanOrigin}-${cleanDestination}-${randomSuffix}`.toUpperCase();
    }
    // Fallback to timestamp-based ID if origin/destination not provided
    return generateReadableId('RTE');
};

/**
 * Generate client ID
 * Format: CLT-YYYYMMDD-HHMMSS-random
 * Example: CLT-20251009-143022-abc123
 */
export const generateClientId = (): string => {
    return generateReadableId('CLT');
};

/**
 * Generate invoice ID
 * Format: INV-YYYYMMDD-HHMMSS-random
 * Example: INV-20251009-143022-abc123
 */
export const generateInvoiceId = (): string => {
    return generateReadableId('INV');
};

/**
 * Generate payroll run ID
 * Format: PAY-YYYYMMDD-HHMMSS-random
 * Example: PAY-20251009-143022-abc123
 */
export const generatePayrollRunId = (): string => {
    return generateReadableId('PAY');
};

/**
 * Generate organization ID
 * Format: ORG-YYYYMMDD-HHMMSS-random
 * Example: ORG-20251009-143022-abc123
 */
export const generateOrganizationId = (): string => {
    return generateReadableId('ORG');
};

/**
 * Extract date from readable ID
 * Example: DRV-20251009-143022-abc123 -> 2025-10-09
 */
export const getDateFromId = (id: string): string | null => {
    const match = id.match(/\d{8}/);
    if (match) {
        const dateStr = match[0];
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}-${month}-${day}`;
    }
    return null;
};

/**
 * Get prefix from readable ID
 * Example: DRV-20251009-143022-abc123 -> DRV
 */
export const getPrefixFromId = (id: string): string | null => {
    const parts = id.split('-');
    return parts.length > 0 ? parts[0] : null;
};