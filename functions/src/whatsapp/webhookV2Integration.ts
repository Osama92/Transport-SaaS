/**
 * WebhookV2 Integration
 *
 * This file provides integration functions to connect the new onboarding system
 * with the existing webhook.ts file.
 *
 * USAGE: Import these functions in webhook.ts to replace the old onboarding logic
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { OnboardingManager } from '../whatsapp-v2/core/OnboardingManager';
import type { WhatsAppMessage } from './types';

const db = admin.firestore();

/**
 * Check if user is registered in WhatsApp V2
 */
export async function getWhatsAppV2User(phoneNumber: string): Promise<any | null> {
  try {
    const doc = await db.collection('whatsapp_users').doc(phoneNumber).get();

    if (doc.exists) {
      const data = doc.data();
      functions.logger.info('[V2] WhatsApp user found', { phoneNumber, userId: data?.userId });
      return data;
    }

    functions.logger.info('[V2] No WhatsApp user found', { phoneNumber });
    return null;
  } catch (error: any) {
    functions.logger.error('[V2] Error fetching WhatsApp user', {
      phoneNumber,
      error: error.message,
    });
    return null;
  }
}

/**
 * Check if user is in onboarding process
 */
export async function isInOnboarding(phoneNumber: string): Promise<boolean> {
  try {
    const doc = await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).get();
    return doc.exists && !doc.data()?.completed;
  } catch (error) {
    return false;
  }
}

/**
 * Handle new user (start onboarding)
 */
export async function handleNewUser(
  phoneNumber: string,
  phoneNumberId: string,
  message: WhatsAppMessage
): Promise<void> {
  functions.logger.info('[V2] Handling new user', { phoneNumber });

  const messageText = message.type === 'text' && message.text ? message.text.body.toLowerCase().trim() : '';

  // Check if user is already in onboarding
  const inOnboarding = await isInOnboarding(phoneNumber);

  if (inOnboarding) {
    // User is in onboarding - process their response
    await OnboardingManager.handleResponse(phoneNumber, messageText, phoneNumberId);
  } else {
    // New user - start onboarding
    await OnboardingManager.startOnboarding(phoneNumber, phoneNumberId);
  }
}

/**
 * Handle button click during onboarding
 */
export async function handleOnboardingButtonClick(
  phoneNumber: string,
  buttonId: string,
  phoneNumberId: string
): Promise<void> {
  functions.logger.info('[V2] Handling onboarding button click', { phoneNumber, buttonId });

  await OnboardingManager.handleResponse(phoneNumber, '', phoneNumberId, buttonId);
}

/**
 * INTEGRATION INSTRUCTIONS FOR webhook.ts:
 *
 * Replace lines 180-202 with:
 *
 * ```typescript
 * import { getWhatsAppV2User, handleNewUser, handleOnboardingButtonClick, isInOnboarding } from './webhookV2Integration';
 *
 * // In processIncomingMessage function:
 * const whatsappUser = await getWhatsAppV2User(from);
 *
 * if (!whatsappUser) {
 *   // New user or onboarding - use V2 system
 *   await handleNewUser(from, phoneNumberId, message);
 *   return;
 * }
 *
 * // Check for button clicks during onboarding
 * if (message.type === 'button' && message.button) {
 *   const inOnboarding = await isInOnboarding(from);
 *   if (inOnboarding) {
 *     await handleOnboardingButtonClick(from, message.button.payload, phoneNumberId);
 *     return;
 *   }
 * }
 *
 * // Check for interactive button replies
 * if (message.type === 'interactive' && message.interactive) {
 *   const inOnboarding = await isInOnboarding(from);
 *   if (inOnboarding) {
 *     const buttonId = message.interactive.button_reply?.id ||
 *                      message.interactive.list_reply?.id;
 *     if (buttonId) {
 *       await handleOnboardingButtonClick(from, buttonId, phoneNumberId);
 *       return;
 *     }
 *   }
 * }
 *
 * // Rest of existing message processing (AI, etc.)
 * ```
 */
