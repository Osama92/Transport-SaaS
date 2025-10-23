/**
 * Firebase Cloud Function to create driver authentication accounts
 * Uses Admin SDK to create accounts without affecting current user session
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface CreateDriverAuthRequest {
    driverId: string;
    username: string;
    password: string;
    organizationId: string;
}

interface CreateDriverAuthResponse {
    success: boolean;
    uid?: string;
    error?: string;
}

/**
 * Create driver authentication account using Admin SDK
 * This avoids signing in as the driver and kicking out the admin
 */
export const createDriverAuth = functions.https.onCall(
    async (data: CreateDriverAuthRequest, context): Promise<CreateDriverAuthResponse> => {
        try {
            // Verify the request is authenticated
            if (!context.auth) {
                throw new functions.https.HttpsError(
                    'unauthenticated',
                    'Must be authenticated to create driver credentials'
                );
            }

            const { driverId, username, password, organizationId } = data;

            // Validate inputs
            if (!driverId || !username || !password) {
                throw new functions.https.HttpsError(
                    'invalid-argument',
                    'Missing required fields: driverId, username, password'
                );
            }

            if (password.length < 6) {
                throw new functions.https.HttpsError(
                    'invalid-argument',
                    'Password must be at least 6 characters'
                );
            }

            // Verify the driver exists and belongs to the user's organization
            const driverRef = admin.firestore().collection('drivers').doc(driverId);
            const driverDoc = await driverRef.get();

            if (!driverDoc.exists) {
                throw new functions.https.HttpsError(
                    'not-found',
                    'Driver not found'
                );
            }

            const driverData = driverDoc.data();
            if (driverData?.organizationId !== organizationId) {
                throw new functions.https.HttpsError(
                    'permission-denied',
                    'Driver does not belong to your organization'
                );
            }

            // Create email from username for Firebase Auth
            const authEmail = `${username}@driver.internal`;

            try {
                // Try to create the user
                const userRecord = await admin.auth().createUser({
                    email: authEmail,
                    password: password,
                    displayName: driverData?.name || username,
                    disabled: false,
                });

                console.log('[CREATE_DRIVER_AUTH] Created Firebase Auth user:', userRecord.uid);

                // Update driver document with Firebase Auth UID
                await driverRef.update({
                    username,
                    firebaseAuthUid: userRecord.uid,
                    authEmail: authEmail,
                    'portalAccess.enabled': true,
                    'portalAccess.whatsappNotifications': true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log('[CREATE_DRIVER_AUTH] Updated driver document with auth info');

                return {
                    success: true,
                    uid: userRecord.uid,
                };
            } catch (authError: any) {
                // If user already exists, update password
                if (authError.code === 'auth/email-already-exists') {
                    console.log('[CREATE_DRIVER_AUTH] User already exists, updating password');

                    // Get the existing user
                    const existingUser = await admin.auth().getUserByEmail(authEmail);

                    // Update password
                    await admin.auth().updateUser(existingUser.uid, {
                        password: password,
                    });

                    // Update driver document
                    await driverRef.update({
                        username,
                        firebaseAuthUid: existingUser.uid,
                        authEmail: authEmail,
                        'portalAccess.enabled': true,
                        'portalAccess.whatsappNotifications': true,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });

                    return {
                        success: true,
                        uid: existingUser.uid,
                    };
                }

                throw authError;
            }
        } catch (error: any) {
            console.error('[CREATE_DRIVER_AUTH] Error:', error);

            // Convert Firebase errors to HttpsError
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create driver authentication'
            );
        }
    }
);
