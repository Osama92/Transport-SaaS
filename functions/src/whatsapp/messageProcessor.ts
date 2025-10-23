/**
 * WhatsApp Message Processor
 * Handles different types of incoming messages and routes to appropriate handlers
 */

import * as functions from 'firebase-functions';
import type { WhatsAppMessage } from './types';
import { Intent } from './types';
import { sendWhatsAppMessage } from './webhook';
import { processUserMessage, transcribeAudio } from './aiService';
import { handleCreateInvoice, handleAddClient, handleBalanceQuery, handleListRoutes, handleListClients, handleListDrivers, handleListInvoices, handleListTransactions, handlePreviewInvoice, handleSendInvoice } from './commandHandlers';
import { getConversationState, updateConversationState, addToConversationHistory, handleFollowUp, handleOutOfScope, detectContextualCommand, detectCompliment, generateComplimentResponse, handleInvoiceConfirmation } from './conversationManager';

/**
 * Send instant acknowledgment message to make user feel heard
 * Returns contextual "processing" message based on intent
 */
async function sendAcknowledgment(
  intent: Intent,
  phoneNumber: string,
  phoneNumberId: string
): Promise<void> {
  const acknowledgments: Record<string, string[]> = {
    // Routes & Shipments
    [Intent.LIST_ROUTES]: [
      '🚚 Let me check your routes... ⏳',
      '🚚 One second, pulling up your routes... ⏳',
      '🚚 Getting your routes ready... ⏳'
    ],
    [Intent.VIEW_ROUTE]: [
      '🔍 Looking up that route for you... ⏳',
      '🔍 Checking the route details... ⏳',
      '🔍 Let me find that route... ⏳'
    ],
    [Intent.UPDATE_ROUTE_STATUS]: [
      '✅ Updating route status... ⏳',
      '✅ Making that change now... ⏳'
    ],
    [Intent.ADD_ROUTE_EXPENSE]: [
      '💰 Recording the expense... ⏳',
      '💰 Adding that expense now... ⏳'
    ],

    // Drivers
    [Intent.LIST_DRIVERS]: [
      '👥 Checking your drivers... ⏳',
      '👥 Let me get the driver list... ⏳',
      '👥 Pulling up driver info... ⏳'
    ],
    [Intent.DRIVER_LOCATION]: [
      '📍 Tracking driver location... ⏳',
      '📍 Let me see where they dey... ⏳',
      '📍 Checking GPS now... ⏳'
    ],
    [Intent.DRIVER_SALARY]: [
      '💵 Checking salary details... ⏳',
      '💵 Let me pull up the payroll... ⏳'
    ],

    // Vehicles
    [Intent.LIST_VEHICLES]: [
      '🚗 Checking your fleet... ⏳',
      '🚗 Getting vehicle list... ⏳'
    ],
    [Intent.VEHICLE_LOCATION]: [
      '📍 Tracking vehicle... ⏳',
      '📍 Locating that vehicle... ⏳'
    ],

    // Invoices
    [Intent.LIST_INVOICES]: [
      '📄 Pulling up your invoices... ⏳',
      '📄 Checking invoice records... ⏳'
    ],
    [Intent.PREVIEW_INVOICE]: [
      '👀 Generating invoice preview... ⏳',
      '📋 Let me show you how it looks... ⏳',
      '✨ Preparing invoice preview... ⏳'
    ],
    [Intent.SEND_INVOICE]: [
      '📧 Preparing to send invoice... ⏳',
      '📨 Getting invoice ready... ⏳'
    ],
    [Intent.OVERDUE_INVOICES]: [
      '⚠️ Checking for overdue invoices... ⏳',
      '⚠️ Let me see who never pay... ⏳'
    ],
    [Intent.RECORD_PAYMENT]: [
      '💰 Recording payment... ⏳',
      '💰 Updating invoice status... ⏳'
    ],

    // Wallet
    [Intent.VIEW_BALANCE]: [
      '💰 Checking your wallet... ⏳',
      '💰 Let me see your balance... ⏳'
    ],
    [Intent.LIST_TRANSACTIONS]: [
      '💳 Getting transaction history... ⏳',
      '💳 Checking your transactions... ⏳'
    ],
    [Intent.TRANSFER_TO_DRIVER]: [
      '💸 Processing transfer... ⏳',
      '💸 Sending money now... ⏳'
    ],

    // Clients
    [Intent.LIST_CLIENTS]: [
      '👥 Getting your client list... ⏳',
      '👥 Checking client records... ⏳'
    ],
    [Intent.VIEW_CLIENT]: [
      '🔍 Looking up client details... ⏳',
      '🔍 Checking client info... ⏳'
    ],

    // Payroll
    [Intent.LIST_PAYROLL]: [
      '💵 Checking payroll records... ⏳',
      '💵 Getting salary information... ⏳'
    ],

    // Reports
    [Intent.REVENUE_SUMMARY]: [
      '📊 Calculating revenue... ⏳',
      '📊 Checking how much you don make... ⏳'
    ],
    [Intent.EXPENSE_SUMMARY]: [
      '📊 Calculating expenses... ⏳',
      '📊 Checking how much you don spend... ⏳'
    ]
  };

  // Get contextual message or default
  const messages = acknowledgments[intent] || [
    '⏳ Got it! Let me check that for you...',
    '⏳ One moment please...',
    '⏳ Working on it...'
  ];

  // Pick random message for variety
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  await sendWhatsAppMessage(phoneNumber, phoneNumberId, {
    type: 'text',
    text: randomMessage
  });

  functions.logger.info('Acknowledgment sent', { intent, message: randomMessage });
}

/**
 * Main message processing function
 * Routes messages to appropriate handlers based on type
 */
export async function processMessage(
  message: WhatsAppMessage,
  whatsappUser: any,
  phoneNumberId: string
): Promise<void> {
  try {
    let messageText = '';

    // Extract message text based on type
    if (message.type === 'text' && message.text) {
      messageText = message.text.body;
    } else if (message.type === 'audio' && message.audio) {
      // Process voice note with Whisper API
      try {
        functions.logger.info('Processing voice note', { mediaId: message.audio.id });

        // Step 1: Download audio file from WhatsApp
        let audioBuffer: Buffer;
        try {
          audioBuffer = await downloadWhatsAppMedia(message.audio.id);
          functions.logger.info('Audio downloaded', { size: audioBuffer.length });
        } catch (downloadError: any) {
          functions.logger.error('Failed to download voice note', {
            error: downloadError.message,
            mediaId: message.audio.id
          });

          await sendWhatsAppMessage(
            message.from,
            phoneNumberId,
            {
              type: 'text',
              text: `😅 *E be like say I no fit download that voice note o.*\n\nPlease try again, or just type your message for me. I go understand am better! 💬`
            }
          );
          return;
        }

        // Step 2: Transcribe audio with Whisper
        let transcription;
        try {
          transcription = await transcribeAudio(audioBuffer);
          messageText = transcription.text;
          functions.logger.info('Audio transcribed successfully', {
            text: messageText,
            language: transcription.language,
            confidence: transcription.confidence
          });

          // Send confirmation with transcribed text
          await sendWhatsAppMessage(
            message.from,
            phoneNumberId,
            {
              type: 'text',
              text: `🎤 *I don hear you loud and clear!*\n\n"${messageText}"\n\nLet me help you with that... ⏳`
            }
          );

        } catch (transcriptionError: any) {
          functions.logger.error('Failed to transcribe voice note', {
            error: transcriptionError.message,
            audioSize: audioBuffer.length,
            mediaId: message.audio.id
          });

          // Determine specific error message
          let errorMessage = '';

          if (transcriptionError.message.includes('Empty transcription') ||
              transcriptionError.message.includes('too quiet')) {
            errorMessage = `🎤 *Voice note no clear o!* 😅\n\nThe audio too quiet or no clear well. Make you:\n\n1️⃣ Talk louder and clear\n2️⃣ Reduce background noise\n3️⃣ Hold phone closer\n4️⃣ Or just type your message 💬\n\nI dey wait!`;
          } else if (transcriptionError.message.includes('too small') ||
                     transcriptionError.message.includes('corrupted')) {
            errorMessage = `😅 *The voice note no complete o!*\n\nE be like say the audio file corrupt or too short.\n\nMake you record am again, or just type wetin you wan talk. I go understand! 💬`;
          } else if (transcriptionError.message.includes('timeout') ||
                     transcriptionError.message.includes('network')) {
            errorMessage = `⚠️ *Network problem o!*\n\nI no fit process that voice note because network slow.\n\nMake you:\n1️⃣ Try again (might work now)\n2️⃣ Or just type your message 💬\n\nI dey wait for you!`;
          } else {
            errorMessage = `😅 *Something went wrong with that voice note o!*\n\nMake you try again, or just type your message for me.\n\nI fit understand text messages better! 💬`;
          }

          await sendWhatsAppMessage(
            message.from,
            phoneNumberId,
            {
              type: 'text',
              text: errorMessage
            }
          );
          return;
        }

      } catch (voiceError: any) {
        // Unexpected error
        functions.logger.error('Unexpected voice processing error', {
          error: voiceError.message,
          stack: voiceError.stack,
          mediaId: message.audio?.id
        });

        await sendWhatsAppMessage(
          message.from,
          phoneNumberId,
          {
            type: 'text',
            text: `Ah sorry o! 😅 Something went wrong while processing your voice note.\n\nPlease try again or just type your message. I go understand am better with text! 💬`
          }
        );
        return;
      }
    } else if (message.type === 'button' && message.button) {
      messageText = message.button.payload;
    } else if (message.type === 'interactive' && message.interactive) {
      if (message.interactive.button_reply) {
        messageText = message.interactive.button_reply.id;
      } else if (message.interactive.list_reply) {
        messageText = message.interactive.list_reply.id;
      }
    } else {
      // Unsupported message type
      await sendWhatsAppMessage(
        message.from,
        phoneNumberId,
        {
          type: 'text',
          text: 'Sorry, I can only process text and voice messages at the moment.'
        }
      );
      return;
    }

    functions.logger.info('Processing message text', {
      from: message.from,
      text: messageText.substring(0, 100) // Log first 100 chars
    });

    // Get conversation context
    const conversationState = await getConversationState(
      message.from,
      whatsappUser.organizationId,
      whatsappUser.userId
    );

    // Add user message to conversation history
    await addToConversationHistory(message.from, 'user', messageText);

    // Check for simple commands first
    const command = messageText.trim().toLowerCase();

    if (command === 'help' || command === 'menu') {
      await sendHelpMessage(message.from, phoneNumberId);
      await addToConversationHistory(message.from, 'assistant', 'Sent help menu', Intent.HELP);
      return;
    }

    // Check for compliments first (respond warmly!)
    const complimentDetection = detectCompliment(messageText);
    if (complimentDetection.isCompliment) {
      const response = generateComplimentResponse(
        complimentDetection.language,
        complimentDetection.enthusiasmLevel
      );

      await sendWhatsAppMessage(message.from, phoneNumberId, {
        type: 'text',
        text: response
      });

      await addToConversationHistory(message.from, 'assistant', response);
      return;
    }

    // Check for invoice confirmation first (yes/no/edit after preview)
    if (conversationState && conversationState.awaitingInput === 'invoice_confirmation') {
      const confirmation = await handleInvoiceConfirmation(
        messageText,
        conversationState,
        phoneNumberId,
        message.from
      );

      if (confirmation.handled) {
        const invoiceNumber = conversationState.conversationData?.invoiceNumber;
        const clientName = conversationState.lastClientName;

        if (confirmation.action === 'confirm') {
          // User approved the invoice
          await sendWhatsAppMessage(message.from, phoneNumberId, {
            type: 'text',
            text: `✅ *Invoice Confirmed!*\n\n📄 Invoice ${invoiceNumber} is ready.\n📊 Status: Draft\n\n*What's next?*\n📧 Type "send" to email it to ${clientName}\n📋 Type "another" to create another invoice\n🏠 Type "menu" for more options`
          });

          // Clear awaiting state
          await updateConversationState(message.from, {
            awaitingConfirmation: false,
            awaitingInput: null
          });

          return;
        }

        if (confirmation.action === 'send') {
          // User wants to send immediately
          await sendWhatsAppMessage(message.from, phoneNumberId, {
            type: 'text',
            text: `📧 Sending invoice ${invoiceNumber} to ${clientName}...`
          });

          // Call send handler
          const { handleSendInvoice: sendInvoice } = await import('./commandHandlers');
          await sendInvoice(
            whatsappUser.organizationId,
            invoiceNumber,
            message.from,
            phoneNumberId
          );

          // Clear awaiting state
          await updateConversationState(message.from, {
            awaitingConfirmation: false,
            awaitingInput: null
          });

          return;
        }

        if (confirmation.action === 'cancel') {
          // User wants to cancel/discard
          await sendWhatsAppMessage(message.from, phoneNumberId, {
            type: 'text',
            text: `❌ Invoice ${invoiceNumber} cancelled.\n\nThe invoice is still saved in your dashboard as Draft. You can edit or delete it there if needed.\n\n💡 Type "menu" to see what else I can help with.`
          });

          // Clear awaiting state
          await updateConversationState(message.from, {
            awaitingConfirmation: false,
            awaitingInput: null
          });

          return;
        }

        if (confirmation.action === 'edit') {
          // User wants to make edits
          await sendWhatsAppMessage(message.from, phoneNumberId, {
            type: 'text',
            text: `✏️ *Edit Invoice ${invoiceNumber}*\n\nWhat would you like to change?\n\n💡 *Examples:*\n• "change total to 500000"\n• "update client name to XYZ Corp"\n• "change quantity of cement to 100"\n• "add item: delivery fee 5000"\n• "remove vat"\n• "use professional template"\n\n_Or describe the change in your own words - I'll understand!_ 😊`
          });

          // Keep in confirmation state, waiting for edit instructions
          return;
        }
      }
    }

    // Check for contextual commands (preview, send, etc. without invoice number)
    const contextualCommand = detectContextualCommand(messageText, conversationState);
    if (contextualCommand.isContextual && contextualCommand.intent) {
      functions.logger.info('Contextual command detected', {
        intent: contextualCommand.intent,
        invoiceNumber: contextualCommand.invoiceNumber,
        clientName: contextualCommand.clientName
      });

      // Route to appropriate handler with context
      if (contextualCommand.intent === Intent.PREVIEW_INVOICE && contextualCommand.invoiceNumber) {
        await handlePreviewInvoice(
          whatsappUser.organizationId,
          contextualCommand.invoiceNumber,
          message.from,
          phoneNumberId
        );
        return;
      }

      if (contextualCommand.intent === Intent.SEND_INVOICE && contextualCommand.invoiceNumber) {
        await handleSendInvoice(
          whatsappUser.organizationId,
          contextualCommand.invoiceNumber,
          message.from,
          phoneNumberId
        );
        return;
      }

      if (contextualCommand.intent === Intent.CREATE_INVOICE && contextualCommand.clientName) {
        // Pre-fill client name for next invoice
        await updateConversationState(message.from, {
          awaitingInput: 'invoice_details',
          conversationData: { clientName: contextualCommand.clientName }
        });

        await sendWhatsAppMessage(message.from, phoneNumberId, {
          type: 'text',
          text: `📋 *Creating another invoice for ${contextualCommand.clientName}*\n\nWhat items are on this invoice?\n\n💡 Example: "50 cement bags at 5000 naira each"`
        });
        return;
      }
    }

    // Handle conversational follow-ups (yes/no, 1/2/3, retry)
    if (conversationState) {
      const followUp = await handleFollowUp(messageText, conversationState, phoneNumberId, message.from);

      if (followUp.handled) {
        functions.logger.info('Follow-up handled', { action: followUp.action });

        // Handle specific follow-up actions
        if (followUp.action === 'retry') {
          return; // Retry handler already sent response
        }

        if (followUp.action === 'cancel') {
          return; // Cancel handler already sent response
        }

        // Continue processing for other follow-up actions
      }
    }

    // Process with AI for intent recognition
    const aiResult = await processUserMessage(messageText);

    functions.logger.info('AI intent recognized', {
      intent: aiResult.intent,
      confidence: aiResult.confidence
    });

    // Handle out-of-scope or low confidence queries
    if (aiResult.intent === Intent.UNKNOWN || aiResult.confidence < 0.4) {
      await handleOutOfScope(messageText, phoneNumberId, message.from, aiResult.confidence);
      await addToConversationHistory(message.from, 'assistant', 'Sent out-of-scope message');
      return;
    }

    // Update conversation state with current intent
    if (conversationState) {
      await updateConversationState(message.from, {
        currentIntent: aiResult.intent,
        lastIntent: aiResult.intent
      });
    }

    // Send instant acknowledgment (makes user feel heard immediately!)
    // This fires BEFORE any database queries, so it's super fast
    if (aiResult.intent !== Intent.HELP) {
      await sendAcknowledgment(aiResult.intent, message.from, phoneNumberId);
    }

    // Route to appropriate handler based on intent
    switch (aiResult.intent) {
      case Intent.CREATE_INVOICE:
        await handleCreateInvoice(
          whatsappUser,
          aiResult.entities as any,
          phoneNumberId,
          message.from
        );
        break;

      case Intent.ADD_CLIENT:
        await handleAddClient(
          whatsappUser,
          aiResult.entities as any,
          phoneNumberId,
          message.from
        );
        break;

      case Intent.VIEW_BALANCE:
        await handleBalanceQuery(whatsappUser, phoneNumberId, message.from);
        break;

      case Intent.LIST_TRANSACTIONS:
        await handleListTransactions(whatsappUser, phoneNumberId, message.from);
        break;

      case Intent.LIST_ROUTES:
        await handleListRoutes(
          whatsappUser,
          aiResult.entities,
          phoneNumberId,
          message.from
        );
        break;

      case Intent.LIST_CLIENTS:
        await handleListClients(
          whatsappUser,
          aiResult.entities,
          phoneNumberId,
          message.from
        );
        break;

      case Intent.LIST_DRIVERS:
        await handleListDrivers(
          whatsappUser,
          aiResult.entities,
          phoneNumberId,
          message.from
        );
        break;

      case Intent.LIST_INVOICES:
        await handleListInvoices(
          whatsappUser,
          aiResult.entities,
          phoneNumberId,
          message.from
        );
        break;

      case Intent.PREVIEW_INVOICE:
        await handlePreviewInvoice(
          whatsappUser,
          aiResult.entities,
          phoneNumberId,
          message.from
        );
        break;

      case Intent.SEND_INVOICE:
        await handleSendInvoice(
          whatsappUser,
          aiResult.entities,
          phoneNumberId,
          message.from
        );
        break;

      case Intent.HELP:
        await sendHelpMessage(message.from, phoneNumberId);
        break;

      default:
        // Feature not yet implemented - friendly Nigerian response
        const featureName = aiResult.intent.replace(/_/g, ' ');
        await sendWhatsAppMessage(
          message.from,
          phoneNumberId,
          {
            type: 'text',
            text: `I hear you! 👂\n\nThe "${featureName}" feature dey come soon. Our developers dey work on am. 🔨\n\nFor now, I fit help you with:\n\n✅ Create invoices\n✅ Add clients\n✅ Check wallet balance\n\nType *HELP* to see full menu.`
          }
        );
    }

  } catch (error: any) {
    functions.logger.error('Error processing message', {
      error: error.message,
      messageId: message.id
    });

    // Send error message to user
    await sendWhatsAppMessage(
      message.from,
      phoneNumberId,
      {
        type: 'text',
        text: 'Sorry, I encountered an error processing your message. Please try again.'
      }
    );
  }
}

/**
 * Download media file from WhatsApp with enhanced error handling and retries
 */
async function downloadWhatsAppMedia(
  mediaId: string,
  retryCount: number = 0
): Promise<Buffer> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  try {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || functions.config().whatsapp?.token;

    if (!WHATSAPP_TOKEN) {
      throw new Error('WhatsApp token not configured');
    }

    functions.logger.info('Downloading WhatsApp media', {
      mediaId,
      retryCount
    });

    // Step 1: Get media URL from WhatsApp API
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      throw new Error(`Failed to get media URL (${mediaResponse.status}): ${errorText}`);
    }

    const mediaData = await mediaResponse.json();

    if (!mediaData.url) {
      throw new Error('Media URL not found in response');
    }

    const mediaUrl = mediaData.url;
    const mimeType = mediaData.mime_type;
    const fileSizeBytes = mediaData.file_size;

    functions.logger.info('Media URL retrieved', {
      mediaId,
      mimeType,
      fileSizeBytes,
      urlLength: mediaUrl.length
    });

    // Step 2: Download actual media file
    const fileResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      },
    });

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      throw new Error(`Failed to download media file (${fileResponse.status}): ${errorText}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate downloaded buffer
    if (buffer.length === 0) {
      throw new Error('Downloaded file is empty');
    }

    if (buffer.length < 100) {
      throw new Error(`Downloaded file too small (${buffer.length} bytes) - may be corrupted`);
    }

    functions.logger.info('Media downloaded successfully', {
      mediaId,
      size: buffer.length,
      mimeType,
      retryCount
    });

    return buffer;

  } catch (error: any) {
    functions.logger.error('Media download error', {
      error: error.message,
      mediaId,
      retryCount,
      stack: error.stack
    });

    // Retry on network errors or server errors
    if (retryCount < MAX_RETRIES && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('500') ||
      error.message.includes('503') ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT'
    )) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      functions.logger.info('Retrying media download', {
        retryCount: retryCount + 1,
        delayMs: delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return downloadWhatsAppMedia(mediaId, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Send help/menu message
 */
export async function sendHelpMessage(to: string, phoneNumberId: string): Promise<void> {
  const helpMessage = `🚚 *Amana - Your Transport Business Assistant*

I be Amana (meaning "trust" 🤝), your AI helper for transport & logistics!

*✅ Wetin I Fit Do:*

📄 *Invoices*
• "Create invoice for [Client], [Items] at [Price]"
• "Create invoice modern template" (classic, modern, minimal, professional)
• "Create invoice with VAT inclusive" (or "VAT exclusive")
• "Preview invoice INV-202510-0001"
• "Send invoice INV-202510-0001"
• "List invoices"
• Example: "Create invoice professional template for ABC Ltd, 50 cement at 5000"

👤 *Clients*
• "Add client [Name], email [Email], phone [Phone]"
• "List clients"
• Example: "Add client John Doe, email john@example.com"

💰 *Wallet*
• "What's my balance?"
• "Show transactions"
• "View my wallet"

🚚 *Routes & Fleet*
• "List routes"
• "List drivers"
• "List vehicles"

*🎨 Invoice Templates:*
• Classic - Traditional layout
• Modern - Contemporary design
• Minimal - Clean & simple
• Professional - Corporate style

*💵 VAT Options:*
• VAT Inclusive - Price includes tax
• VAT Exclusive - Tax added on top (default)
• Custom VAT rate: "invoice with 5% VAT"

*💬 Natural Language:*
Just yarn me wetin you need - I go understand! I fit even give you smart suggestions based on your business patterns 😊

*🎤 Voice Notes:*
Send voice messages in:
• English
• Hausa
• Igbo
• Yoruba
• Nigerian Pidgin

*💡 Amana Intelligence:*
I dey learn your business patterns and go give you proactive insights like overdue invoices, low balance alerts, and smart suggestions!

*Need Help?*
Type "HELP" anytime to see this menu again.

How I fit help you today? 🚀`;

  await sendWhatsAppMessage(to, phoneNumberId, {
    type: 'text',
    text: helpMessage
  });
}

