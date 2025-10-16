/**
 * Firebase Storage service for uploading and retrieving media files
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase/firebaseConfig';

/**
 * Upload a driver photo to Firebase Storage
 * @param file - The image file to upload
 * @param driverId - The driver's ID
 * @param organizationId - The organization's ID
 * @returns The download URL of the uploaded image
 */
export const uploadDriverPhoto = async (
    file: File,
    driverId: string,
    organizationId: string
): Promise<string> => {
    try {
        // Create a unique file name with timestamp
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${driverId}_${timestamp}.${fileExtension}`;

        // Create storage reference: organizations/{orgId}/drivers/{driverId}/photos/{fileName}
        const storageRef = ref(storage, `organizations/${organizationId}/drivers/${driverId}/photos/${fileName}`);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
            customMetadata: {
                driverId: driverId,
                organizationId: organizationId,
                uploadedAt: new Date().toISOString(),
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading driver photo:', error);
        throw new Error('Failed to upload driver photo');
    }
};

/**
 * Upload a driver license photo to Firebase Storage
 * @param file - The license image file to upload
 * @param driverId - The driver's ID
 * @param organizationId - The organization's ID
 * @returns The download URL of the uploaded license
 */
export const uploadDriverLicense = async (
    file: File,
    driverId: string,
    organizationId: string
): Promise<string> => {
    try {
        // Create a unique file name with timestamp
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `license_${driverId}_${timestamp}.${fileExtension}`;

        // Create storage reference: organizations/{orgId}/drivers/{driverId}/licenses/{fileName}
        const storageRef = ref(storage, `organizations/${organizationId}/drivers/${driverId}/licenses/${fileName}`);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
            customMetadata: {
                driverId: driverId,
                organizationId: organizationId,
                documentType: 'license',
                uploadedAt: new Date().toISOString(),
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading driver license:', error);
        throw new Error('Failed to upload driver license');
    }
};

/**
 * Delete a file from Firebase Storage
 * @param fileUrl - The download URL of the file to delete
 */
export const deleteStorageFile = async (fileUrl: string): Promise<void> => {
    try {
        // Extract the path from the URL
        const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
        if (!fileUrl.startsWith(baseUrl)) {
            throw new Error('Invalid Firebase Storage URL');
        }

        // Parse the URL to get the file path
        const urlParts = fileUrl.split('/o/')[1];
        if (!urlParts) {
            throw new Error('Could not parse storage URL');
        }

        const filePath = decodeURIComponent(urlParts.split('?')[0]);

        // Create reference and delete
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);

        console.log('File deleted successfully:', filePath);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw new Error('Failed to delete file');
    }
};

/**
 * Upload a vehicle document to Firebase Storage
 * @param file - The document file to upload
 * @param vehicleId - The vehicle's ID
 * @param organizationId - The organization's ID
 * @param documentType - The type of document (registration, insurance, etc.)
 * @returns The download URL of the uploaded document
 */
export const uploadVehicleDocument = async (
    file: File,
    vehicleId: string,
    organizationId: string,
    documentType: string
): Promise<string> => {
    try {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${documentType}_${vehicleId}_${timestamp}.${fileExtension}`;

        // Create storage reference
        const storageRef = ref(storage, `organizations/${organizationId}/vehicles/${vehicleId}/documents/${fileName}`);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
            customMetadata: {
                vehicleId: vehicleId,
                organizationId: organizationId,
                documentType: documentType,
                uploadedAt: new Date().toISOString(),
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading vehicle document:', error);
        throw new Error('Failed to upload vehicle document');
    }
};

/**
 * Upload a proof of delivery image
 * @param file - The POD image file to upload
 * @param routeId - The route's ID
 * @param organizationId - The organization's ID
 * @returns The download URL of the uploaded image
 */
export const uploadProofOfDelivery = async (
    file: File,
    routeId: string,
    organizationId: string
): Promise<string> => {
    try {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `pod_${routeId}_${timestamp}.${fileExtension}`;

        // Create storage reference
        const storageRef = ref(storage, `organizations/${organizationId}/routes/${routeId}/proofs/${fileName}`);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
            customMetadata: {
                routeId: routeId,
                organizationId: organizationId,
                documentType: 'proof-of-delivery',
                uploadedAt: new Date().toISOString(),
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading proof of delivery:', error);
        throw new Error('Failed to upload proof of delivery');
    }
};

/**
 * Convert base64 data URL to Blob
 */
const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

/**
 * Upload invoice company logo from base64 data URL
 * @param dataURL - Base64 data URL of the logo
 * @param organizationId - The organization's ID
 * @returns The download URL of the uploaded logo
 */
export const uploadInvoiceLogo = async (
    dataURL: string,
    organizationId: string
): Promise<string> => {
    try {
        // Convert data URL to Blob
        const blob = dataURLtoBlob(dataURL);

        const timestamp = Date.now();
        const fileName = `logo_${timestamp}.png`;

        // Create storage reference
        const storageRef = ref(storage, `organizations/${organizationId}/invoices/logos/${fileName}`);

        // Upload blob
        const snapshot = await uploadBytes(storageRef, blob, {
            contentType: 'image/png',
            customMetadata: {
                organizationId: organizationId,
                documentType: 'invoice-logo',
                uploadedAt: new Date().toISOString(),
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading invoice logo:', error);
        throw new Error('Failed to upload invoice logo');
    }
};

/**
 * Upload invoice signature from base64 data URL
 * @param dataURL - Base64 data URL of the signature
 * @param organizationId - The organization's ID
 * @returns The download URL of the uploaded signature
 */
export const uploadInvoiceSignature = async (
    dataURL: string,
    organizationId: string
): Promise<string> => {
    try {
        // Convert data URL to Blob
        const blob = dataURLtoBlob(dataURL);

        const timestamp = Date.now();
        const fileName = `signature_${timestamp}.png`;

        // Create storage reference
        const storageRef = ref(storage, `organizations/${organizationId}/invoices/signatures/${fileName}`);

        // Upload blob
        const snapshot = await uploadBytes(storageRef, blob, {
            contentType: 'image/png',
            customMetadata: {
                organizationId: organizationId,
                documentType: 'invoice-signature',
                uploadedAt: new Date().toISOString(),
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading invoice signature:', error);
        throw new Error('Failed to upload invoice signature');
    }
};
