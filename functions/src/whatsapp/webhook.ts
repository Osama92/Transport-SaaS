/**
 * WhatsApp Webhook Handler
 * Receives and processes incoming WhatsApp messages
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { WhatsAppWebhookEvent, WhatsAppMessage } from './types';
import { processMessage } from './messageProcessor';

// Lazy initialization - only access Firestore when functions are called
const getDb = () => admin.firestore();

// WhatsApp Configuration
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || functions.config().whatsapp?.token;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || functions.config().whatsapp?.verify_token || 'transport_saas_verify_2024';

// PREMIUM OPTIMIZATION: In-memory cache for user data (10 minute TTL)
// This avoids repeated Firestore queries for the same user
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * WhatsApp Webhook Handler
 * Handles both verification (GET) and message events (POST)
 *
 * DEVELOPMENT CONFIGURATION (Free Tier):
 * - 512MB memory (adequate for development)
 * - 60s timeout (WhatsApp requires < 5s webhook response, but processing continues after)
 * - No min instances (cold starts ~1-2s first message, then warm for ~15 mins)
 * - Max instances = 3 (sufficient for development)
 *
 * Note: For production, switch to premium config:
 *   memory: '1GB', minInstances: 2, maxInstances: 10
 */
export const whatsappWebhook = functions
  .runWith({
    memory: '512MB',      // Development: 512MB (free tier friendly)
    timeoutSeconds: 60,
    // minInstances: 0,   // Development: No always-on instances (saves ~$10/month)
    maxInstances: 3,      // Development: Max 3 instances
  })
  .https.onRequest(async (req, res) => {
  try {
    // Handle webhook verification (GET request from Meta)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // Verify the token matches
      if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        functions.logger.info('WhatsApp webhook verified successfully');
        res.status(200).send(challenge);
        return;
      } else {
        functions.logger.warn('WhatsApp webhook verification failed', {
          mode,
          receivedToken: token,
          expectedToken: WHATSAPP_VERIFY_TOKEN
        });
        res.status(403).send('Forbidden');
        return;
      }
    }

    // Handle incoming messages (POST request)
    if (req.method === 'POST') {
      const body = req.body as WhatsAppWebhookEvent;

      functions.logger.info('WhatsApp webhook received', {
        object: body.object,
        entryCount: body.entry?.length
      });

      // Verify it's a WhatsApp event
      if (body.object !== 'whatsapp_business_account') {
        functions.logger.warn('Invalid webhook object type', { object: body.object });
        res.status(404).send('Not Found');
        return;
      }

      // IMMEDIATELY respond with 200 OK (within 5 seconds as required by Meta)
      // This ensures Meta doesn't retry the webhook
      res.status(200).send('OK');

      // Process messages AFTER responding to webhook
      // This prevents timeout issues and ensures fast acknowledgment
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const value = change.value;

            // Process each message asynchronously (don't block webhook response)
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                // Process message asynchronously (don't block webhook response)
                processIncomingMessage(message, value.metadata.phone_number_id)
                  .catch(error => {
                    functions.logger.error('Error processing message', {
                      error: error.message,
                      messageId: message.id
                    });
                  });
              }
            }

            // Log message status updates (sent, delivered, read)
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                functions.logger.info('Message status update', {
                  messageId: status.id,
                  status: status.status,
                  recipientId: status.recipient_id
                });
              }
            }
          }
        }
      }

      return;
    }

    // Unsupported method
    res.status(405).send('Method Not Allowed');
  } catch (error: any) {
    functions.logger.error('WhatsApp webhook error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Process incoming WhatsApp message
 */
async function processIncomingMessage(
  message: WhatsAppMessage,
  phoneNumberId: string
): Promise<void> {
  const startTime = Date.now();  // Track performance

  try {
    const from = message.from;
    const messageId = message.id;

    functions.logger.info('Processing WhatsApp message', {
      from,
      messageId,
      type: message.type
    });

    // PREMIUM OPTIMIZATION: Run these in parallel for instant response
    const [whatsappUser] = await Promise.all([
      getWhatsAppUser(from),  // Fetch user data
      markMessageAsRead(messageId, phoneNumberId).catch(err =>
        functions.logger.error('Failed to mark message as read', { error: err.message })
      )  // Mark as read simultaneously
    ]);

    if (!whatsappUser) {
      // User not registered
      // Check if this is a HELP request or email verification
      const messageText = message.type === 'text' && message.text ? message.text.body.toLowerCase().trim() : '';

      if (messageText === 'help' || messageText === 'menu') {
        // Send help message even if not registered
        const { sendHelpMessage } = await import('./messageProcessor');
        await sendHelpMessage(from, phoneNumberId);
        return;
      }

      // Check if it's an email (for registration)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(messageText)) {
        // User is trying to register with email
        await handleEmailVerification(from, messageText, phoneNumberId);
        return;
      }

      // Otherwise send onboarding message
      await sendOnboardingMessage(from, phoneNumberId);
      return;
    }

    // Process the message based on type
    await processMessage(message, whatsappUser, phoneNumberId);

    // Log performance metrics
    const duration = Date.now() - startTime;
    functions.logger.info('Message processed successfully', {
      messageId: message.id,
      duration: `${duration}ms`,
      cached: userCache.has(from)
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    functions.logger.error('Error in processIncomingMessage', {
      error: error.message,
      messageId: message.id,
      duration: `${duration}ms`,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get WhatsApp user from Firestore (with in-memory caching for speed)
 * PREMIUM OPTIMIZATION: Cache user data for 10 minutes to avoid repeated DB queries
 */
async function getWhatsAppUser(whatsappNumber: string) {
  try {
    // Check cache first
    const cached = userCache.get(whatsappNumber);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      functions.logger.info('User data served from cache', { whatsappNumber });
      return cached.data;
    }

    // Cache miss or expired - fetch from Firestore
    const userDoc = await getDb()
      .collection('whatsappUsers')
      .doc(whatsappNumber)
      .get();

    const userData = userDoc.exists ? userDoc.data() : null;

    // Store in cache (even if null, to avoid repeated lookups for unregistered users)
    userCache.set(whatsappNumber, {
      data: userData,
      timestamp: Date.now()
    });

    // Clean up old cache entries (keep cache size manageable)
    if (userCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of userCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          userCache.delete(key);
        }
      }
    }

    return userData;
  } catch (error: any) {
    functions.logger.error('Error fetching WhatsApp user', {
      error: error.message,
      whatsappNumber
    });
    return null;
  }
}

/**
 * Send onboarding message to new user
 */
async function sendOnboardingMessage(to: string, phoneNumberId: string): Promise<void> {
  const message = `Welcome to Glyde Systems! 🚚✨

I'm your AI assistant for transport & logistics management.

*🎯 Quick Start:*
Type "HELP" to see everything I can do for you!

*📝 Already have an account?*
Send your email address to link this WhatsApp number.
Example: "my.email@example.com"

Let's get started! 🚀`;

  await sendWhatsAppMessage(to, phoneNumberId, { type: 'text', text: message });
}

/**
 * Handle email verification for new user registration
 */
async function handleEmailVerification(
  whatsappNumber: string,
  email: string,
  phoneNumberId: string
): Promise<void> {
  try {
    // Look up user by email in users collection
    const usersSnapshot = await getDb()
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `❌ No account found with email: ${email}\n\nPlease check your email and try again, or create an account at:\nhttps://your-app-url.com`
      });
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Get user's organization
    const organizationId = userData.organizationId;

    if (!organizationId) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `⚠️ Your account doesn't have an organization set up yet. Please complete your onboarding at:\nhttps://your-app-url.com`
      });
      return;
    }

    // Register WhatsApp number with user
    await getDb().collection('whatsappUsers').doc(whatsappNumber).set({
      whatsappNumber,
      userId: userDoc.id,
      organizationId,
      email,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info('WhatsApp user registered', {
      whatsappNumber,
      userId: userDoc.id,
      email
    });

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: `✅ Account linked successfully!\n\nWelcome ${userData.displayName || 'back'}! 🎉\n\nYour WhatsApp is now connected to your Glyde Systems account.\n\nType "HELP" to see what I can do for you! 🚀`
    });
  } catch (error: any) {
    functions.logger.error('Error in handleEmailVerification', {
      error: error.message,
      whatsappNumber,
      email
    });

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: '❌ Sorry, something went wrong during verification. Please try again later.'
    });
  }
}

/**
 * Mark message as read
 */
async function markMessageAsRead(messageId: string, phoneNumberId: string): Promise<void> {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });

    functions.logger.info('Message marked as read', { messageId });
  } catch (error: any) {
    functions.logger.error('Error marking message as read', {
      error: error.message,
      messageId
    });
  }
}

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(
  to: string,
  phoneNumberId: string,
  response: { type: string; text?: string; [key: string]: any }
): Promise<void> {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
    };

    // Build message payload based on type
    if (response.type === 'text') {
      payload.type = 'text';
      payload.text = { body: response.text };
    } else if (response.type === 'button') {
      payload.type = 'interactive';
      payload.interactive = {
        type: 'button',
        body: { text: response.text },
        action: {
          buttons: response.buttons.map((btn: any) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        }
      };
    } else if (response.type === 'list') {
      payload.type = 'interactive';
      payload.interactive = {
        type: 'list',
        body: { text: response.text },
        action: {
          button: response.buttonText,
          sections: response.sections
        }
      };
    } else if (response.type === 'document') {
      payload.type = 'document';
      payload.document = {
        link: response.url,
        filename: response.filename,
        caption: response.caption
      };
    } else if (response.type === 'image') {
      payload.type = 'image';
      payload.image = {
        link: response.image.link,
        caption: response.image.caption || ''
      };
    }

    const result = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await result.json();

    if (!result.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
    }

    functions.logger.info('WhatsApp message sent', {
      to,
      type: response.type,
      messageId: data.messages?.[0]?.id
    });
  } catch (error: any) {
    functions.logger.error('Error sending WhatsApp message', {
      error: error.message,
      to
    });
    throw error;
  }
}
