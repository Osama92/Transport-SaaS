/**
 * WhatsApp Webhook Handler
 * Receives and processes incoming WhatsApp messages
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { WhatsAppWebhookEvent, WhatsAppMessage } from './types';
import { SupplyChainExpert } from './SupplyChainExpert';

// Initialize the supply chain expert
const supplyChainExpert = new SupplyChainExpert();

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

      // ENHANCED LOGGING: Log full webhook payload for debugging
      functions.logger.info('========== WHATSAPP WEBHOOK RECEIVED ==========', {
        timestamp: new Date().toISOString(),
        object: body.object,
        entryCount: body.entry?.length,
        fullPayload: JSON.stringify(body, null, 2)
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
                // ENHANCED LOGGING: Log incoming message details
                functions.logger.info('========== NEW MESSAGE DETECTED ==========', {
                  from: message.from,
                  messageId: message.id,
                  type: message.type,
                  timestamp: message.timestamp,
                  text: message.type === 'text' ? message.text?.body : undefined
                });

                // Process message asynchronously (don't block webhook response)
                processIncomingMessage(message, value.metadata.phone_number_id)
                  .catch(error => {
                    functions.logger.error('========== ERROR PROCESSING MESSAGE ==========', {
                      error: error.message,
                      stack: error.stack,
                      messageId: message.id,
                      from: message.from
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

    // Process the message using the Supply Chain Expert AI
    if (message.type === 'text' && message.text) {
      const messageText = message.text.body;

      // Get user's name from profile
      const userName = whatsappUser.displayName || whatsappUser.email?.split('@')[0] || 'there';

      // Process with SupplyChainExpert for natural conversation
      functions.logger.info('========== SENDING TO AI FOR PROCESSING ==========', {
        from,
        userName,
        messageLength: messageText.length,
        messagePreview: messageText.substring(0, 100)
      });

      const response = await supplyChainExpert.processMessage(from, messageText, userName);

      functions.logger.info('========== AI RESPONSE GENERATED ==========', {
        from,
        responseLength: response.length,
        responsePreview: response.substring(0, 100)
      });

      // Send the response
      await sendWhatsAppMessage(from, phoneNumberId, { type: 'text', text: response });

      functions.logger.info('========== RESPONSE SENT TO USER ==========', {
        from,
        phoneNumberId
      });
    } else if (message.type === 'location') {
      // Handle location messages
      await handleLocationMessage(message, whatsappUser, phoneNumberId);
    } else if (message.type === 'audio') {
      // Handle voice messages (WhatsApp uses 'audio' type for voice notes)
      const userName = whatsappUser.displayName || whatsappUser.email?.split('@')[0] || 'there';
      await handleVoiceMessage(message, whatsappUser, phoneNumberId, userName);
    } else if (message.type === 'image' || message.type === 'document') {
      // Handle media messages
      await handleMediaMessage(message, whatsappUser, phoneNumberId);
    } else {
      // Unsupported message type
      await sendWhatsAppMessage(from, phoneNumberId, {
        type: 'text',
        text: 'I can help you better with text messages or voice notes. Please describe what you need assistance with.'
      });
    }

    // Log performance metrics
    const duration = Date.now() - startTime;
    functions.logger.info('========== MESSAGE PROCESSING COMPLETED ==========', {
      messageId: message.id,
      from: from,
      duration: `${duration}ms`,
      cached: userCache.has(from),
      processingTimestamp: new Date().toISOString(),
      success: true
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    functions.logger.error('========== MESSAGE PROCESSING FAILED ==========', {
      error: error.message,
      messageId: message.id,
      from: message.from,
      duration: `${duration}ms`,
      stack: error.stack,
      failureTimestamp: new Date().toISOString()
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
      .collection('whatsapp_users')
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
  const message = `Welcome to Amana! 👋

I'm Amana, your trusted AI assistant for transport and logistics operations.

Quick Start:
• Type "HELP" to see what I can do
• Share your email to link this WhatsApp number to your account

Already have an account? Just send your email address.
Example: "john.doe@company.com"

How can I assist you today?`;

  await sendWhatsAppMessage(to, phoneNumberId, { type: 'text', text: message });
}

/**
 * Handle location messages
 */
async function handleLocationMessage(
  message: WhatsAppMessage,
  whatsappUser: any,
  phoneNumberId: string
): Promise<void> {
  const from = message.from;

  if (message.location) {
    const { latitude, longitude } = message.location;

    // Store location or use for route tracking
    functions.logger.info('Location received', { from, latitude, longitude });

    await sendWhatsAppMessage(from, phoneNumberId, {
      type: 'text',
      text: `I've received your location (${latitude}, ${longitude}). This can be used for:\n\n• Setting pickup/delivery points\n• Tracking current position\n• Finding nearest drivers\n\nHow would you like to use this location?`
    });
  }
}

/**
 * Download media from WhatsApp
 */
async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer | null> {
  try {
    // Step 1: Get media URL
    const mediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`
      }
    });

    if (!mediaResponse.ok) {
      functions.logger.error('Failed to get media URL', { mediaId });
      return null;
    }

    const mediaData = await mediaResponse.json();
    const downloadUrl = mediaData.url;

    // Step 2: Download the actual media file
    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`
      }
    });

    if (!downloadResponse.ok) {
      functions.logger.error('Failed to download media', { downloadUrl });
      return null;
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    functions.logger.error('Error downloading WhatsApp media', {
      error: error.message,
      mediaId
    });
    return null;
  }
}

/**
 * Upload image to Firebase Storage
 */
async function uploadToFirebaseStorage(
  buffer: Buffer,
  organizationId: string,
  fileName: string,
  mimeType: string
): Promise<string | null> {
  try {
    const bucket = admin.storage().bucket();
    const filePath = `organizations/${organizationId}/${fileName}`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    functions.logger.info('Image uploaded to Firebase Storage', {
      filePath,
      publicUrl
    });

    return publicUrl;
  } catch (error: any) {
    functions.logger.error('Error uploading to Firebase Storage', {
      error: error.message,
      fileName
    });
    return null;
  }
}

/**
 * Handle media messages (images, documents)
 */
async function handleMediaMessage(
  message: WhatsAppMessage,
  whatsappUser: any,
  phoneNumberId: string
): Promise<void> {
  const from = message.from;
  const organizationId = whatsappUser.organizationId;

  if (message.type === 'image' && message.image) {
    const { getConversationState, updateConversationState } = await import('./conversationManager');
    const conversationState = await getConversationState(from, organizationId, whatsappUser.userId);

    // Check if user is expecting logo or signature upload
    const awaitingLogo = conversationState?.awaitingInput === 'logo_upload';
    const awaitingSignature = conversationState?.awaitingInput === 'signature_upload';

    if (awaitingLogo || awaitingSignature) {
      // Send processing message
      await sendWhatsAppMessage(from, phoneNumberId, {
        type: 'text',
        text: '📤 Uploading your image... ⏳\n\nThis may take a few seconds...'
      });

      // Download the image from WhatsApp
      const imageBuffer = await downloadWhatsAppMedia(message.image.id);

      if (!imageBuffer) {
        await sendWhatsAppMessage(from, phoneNumberId, {
          type: 'text',
          text: '❌ Sorry, I couldn\'t download your image. Please try again.'
        });
        return;
      }

      // Upload to Firebase Storage
      const fileName = awaitingLogo ? `logo_${Date.now()}.jpg` : `signature_${Date.now()}.jpg`;
      const imageUrl = await uploadToFirebaseStorage(
        imageBuffer,
        organizationId,
        fileName,
        message.image.mime_type || 'image/jpeg'
      );

      if (!imageUrl) {
        await sendWhatsAppMessage(from, phoneNumberId, {
          type: 'text',
          text: '❌ Sorry, I couldn\'t upload your image. Please try again.'
        });
        return;
      }

      // Update organization with image URL
      const updateData: any = {};
      if (awaitingLogo) {
        updateData['companyDetails.logoUrl'] = imageUrl;
      } else {
        updateData['companyDetails.signatureUrl'] = imageUrl;
      }

      await getDb()
        .collection('organizations')
        .doc(organizationId)
        .set(updateData, { merge: true });

      // Clear awaiting state
      await updateConversationState(from, {
        awaitingInput: null
      });

      // Send success message
      const fieldName = awaitingLogo ? 'company logo' : 'digital signature';
      await sendWhatsAppMessage(from, phoneNumberId, {
        type: 'text',
        text: `✅ ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} uploaded successfully!\n\n🔗 ${imageUrl}\n\nYour ${fieldName} will now appear on all your invoices. 🎉`
      });

      functions.logger.info(`${fieldName} uploaded`, {
        organizationId,
        imageUrl,
        whatsappNumber: from
      });

      return;
    }

    // Not awaiting logo/signature - show general image message
    await sendWhatsAppMessage(from, phoneNumberId, {
      type: 'text',
      text: 'I received your image. This could be used for:\n\n• Company Logo (for invoices)\n• Digital Signature (for invoices)\n• Proof of Delivery (POD)\n• Damage documentation\n• Vehicle condition reports\n\nPlease describe what this image is for, or say "this is for my invoice logo" or "this is my signature".'
    });
  } else if (message.type === 'document') {
    await sendWhatsAppMessage(from, phoneNumberId, {
      type: 'text',
      text: 'Document received. I can help process:\n\n• Invoices and receipts\n• Shipping documents\n• Compliance certificates\n\nWhat type of document is this?'
    });
  }
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
    await getDb().collection('whatsapp_users').doc(whatsappNumber).set({
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
      text: `✅ Account linked successfully!\n\nWelcome ${userData.displayName || 'back'}! 🎉\n\nYour WhatsApp is now connected to Amana, your trusted transport assistant.\n\nType "HELP" to see what I can do for you! 🚀`
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
 * Handle voice messages with multi-language support
 * Uses OpenAI Whisper for transcription
 */
async function handleVoiceMessage(
  message: WhatsAppMessage,
  whatsappUser: any,
  phoneNumberId: string,
  userName: string
): Promise<void> {
  const from = message.from;

  try {
    // Get audio media ID (WhatsApp uses 'audio' type for voice notes)
    const audio = message.audio;

    if (!audio || !audio.id) {
      await sendWhatsAppMessage(from, phoneNumberId, {
        type: 'text',
        text: '❌ Sorry, I couldn\'t process your voice message. Please try again.'
      });
      return;
    }

    // Send processing message
    await sendWhatsAppMessage(from, phoneNumberId, {
      type: 'text',
      text: '🎤 Processing your voice message... ⏳'
    });

    functions.logger.info('Voice message received', {
      from,
      audioId: audio.id,
      mimeType: audio.mime_type
    });

    // Download audio from WhatsApp
    const audioBuffer = await downloadWhatsAppMedia(audio.id);

    if (!audioBuffer) {
      await sendWhatsAppMessage(from, phoneNumberId, {
        type: 'text',
        text: '❌ Sorry, I couldn\'t download your voice message. Please try again.'
      });
      return;
    }

    // Transcribe using OpenAI Whisper
    const transcribedText = await transcribeAudioWithWhisper(audioBuffer, audio.mime_type);

    if (!transcribedText) {
      await sendWhatsAppMessage(from, phoneNumberId, {
        type: 'text',
        text: '❌ Sorry, I couldn\'t understand your voice message. Please try speaking more clearly or use text.'
      });
      return;
    }

    functions.logger.info('Voice message transcribed', {
      from,
      transcription: transcribedText,
      length: transcribedText.length
    });

    // Process transcribed text through AI
    const response = await supplyChainExpert.processMessage(from, transcribedText, userName);

    // Send response with transcription for transparency
    await sendWhatsAppMessage(from, phoneNumberId, {
      type: 'text',
      text: `🎤 *You said:* "${transcribedText}"\n\n${response}`
    });

  } catch (error: any) {
    functions.logger.error('Error handling voice message', {
      error: error.message,
      from,
      stack: error.stack
    });

    await sendWhatsAppMessage(from, phoneNumberId, {
      type: 'text',
      text: '❌ Sorry, I encountered an error processing your voice message. Please try again.'
    });
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 * Supports multiple languages: English, Hausa, Igbo, Yoruba
 * CRITICAL: Works regardless of audio quality - uses advanced Whisper model
 */
async function transcribeAudioWithWhisper(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  try {
    // Get OpenAI API key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || functions.config().openai?.api_key;

    if (!OPENAI_API_KEY) {
      functions.logger.error('OpenAI API key not configured');
      return null;
    }

    // Import form-data and axios (both already installed)
    const FormData = require('form-data');
    const axios = require('axios');

    // Determine file extension from MIME type
    let fileExtension = 'ogg'; // WhatsApp default
    if (mimeType.includes('mp4')) fileExtension = 'mp4';
    else if (mimeType.includes('mpeg')) fileExtension = 'mp3';
    else if (mimeType.includes('wav')) fileExtension = 'wav';
    else if (mimeType.includes('webm')) fileExtension = 'webm';

    // Create FormData with audio buffer
    const form = new FormData();
    form.append('file', audioBuffer, {
      filename: `audio.${fileExtension}`,
      contentType: mimeType
    });
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');
    // Language auto-detection (supports English, Hausa, Igbo, Yoruba)

    functions.logger.info('Transcribing audio with Whisper', {
      fileSize: audioBuffer.length,
      mimeType,
      extension: fileExtension
    });

    // Call OpenAI Whisper API using axios with form-data
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const transcribedText = response.data?.text?.trim();

    if (!transcribedText) {
      functions.logger.warn('Empty transcription from Whisper');
      return null;
    }

    functions.logger.info('Whisper transcription successful', {
      language: response.data?.language || 'auto-detected',
      duration: response.data?.duration,
      textLength: transcribedText.length,
      text: transcribedText.substring(0, 100) // Log first 100 chars
    });

    return transcribedText;

  } catch (error: any) {
    functions.logger.error('Error transcribing audio with Whisper', {
      error: error.message,
      stack: error.stack,
      errorDetails: error.response?.data || error
    });
    return null;
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
