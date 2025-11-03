/**
 * WhatsApp Business API Utilities
 *
 * Wrapper functions for sending messages via WhatsApp Business API
 */

import * as functions from 'firebase-functions';
import axios from 'axios';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || functions.config().whatsapp?.token;
const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';

/**
 * Send a simple text message
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  phoneNumberId: string
): Promise<void> {
  try {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          body: message,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    functions.logger.info('[WHATSAPP API] Message sent', {
      to,
      messageId: response.data.messages?.[0]?.id,
    });
  } catch (error: any) {
    functions.logger.error('[WHATSAPP API] Failed to send message', {
      to,
      error: error.response?.data || error.message,
    });
    throw error;
  }
}

/**
 * Send an interactive message (buttons, lists, etc.)
 */
export async function sendInteractiveMessage(
  to: string,
  interactive: any,
  phoneNumberId: string
): Promise<void> {
  try {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    functions.logger.info('[WHATSAPP API] Interactive message sent', {
      to,
      messageId: response.data.messages?.[0]?.id,
    });
  } catch (error: any) {
    functions.logger.error('[WHATSAPP API] Failed to send interactive message', {
      to,
      error: error.response?.data || error.message,
    });
    throw error;
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(
  messageId: string,
  phoneNumberId: string
): Promise<void> {
  try {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    functions.logger.info('[WHATSAPP API] Message marked as read', { messageId });
  } catch (error: any) {
    functions.logger.error('[WHATSAPP API] Failed to mark message as read', {
      messageId,
      error: error.response?.data || error.message,
    });
    // Don't throw - this is not critical
  }
}

/**
 * Send a template message (for notifications)
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  parameters: any[],
  phoneNumberId: string
): Promise<void> {
  try {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: [
            {
              type: 'body',
              parameters,
            },
          ],
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    functions.logger.info('[WHATSAPP API] Template message sent', {
      to,
      templateName,
      messageId: response.data.messages?.[0]?.id,
    });
  } catch (error: any) {
    functions.logger.error('[WHATSAPP API] Failed to send template message', {
      to,
      templateName,
      error: error.response?.data || error.message,
    });
    throw error;
  }
}

/**
 * Download media from WhatsApp
 */
export async function downloadMedia(mediaId: string): Promise<Buffer> {
  try {
    // Step 1: Get media URL
    const urlResponse = await axios.get(
      `${WHATSAPP_API_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    const mediaUrl = urlResponse.data.url;

    // Step 2: Download media
    const mediaResponse = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      },
      responseType: 'arraybuffer',
    });

    return Buffer.from(mediaResponse.data);
  } catch (error: any) {
    functions.logger.error('[WHATSAPP API] Failed to download media', {
      mediaId,
      error: error.response?.data || error.message,
    });
    throw error;
  }
}
