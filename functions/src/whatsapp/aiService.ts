/**
 * AI Service for WhatsApp
 * Handles intent recognition, entity extraction, and multilingual support
 */

import * as functions from 'firebase-functions';
import { Intent } from './types';
import type { AIIntentResult } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || functions.config().openai?.api_key;
const OPENAI_API_URL = 'https://api.openai.com/v1';

/**
 * Transcribe audio using OpenAI Whisper API with enhanced error handling
 * Supports English, Hausa, Igbo, Yoruba, Nigerian Pidgin
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  retryCount: number = 0
): Promise<{
  text: string;
  language: string;
  confidence?: number;
}> {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second

  try {
    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Empty audio buffer received');
    }

    if (audioBuffer.length < 100) {
      throw new Error('Audio file too small - may be corrupted');
    }

    functions.logger.info('Transcribing audio', {
      size: audioBuffer.length,
      retryCount
    });

    const FormData = require('form-data');
    const formData = new FormData();

    // Try to detect audio format from buffer
    const audioFormat = detectAudioFormat(audioBuffer);

    formData.append('file', audioBuffer, {
      filename: `audio.${audioFormat}`,
      contentType: `audio/${audioFormat}`,
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json'); // Get language detection & confidence
    formData.append('temperature', '0'); // More deterministic transcription

    const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      functions.logger.error('Whisper API error response', {
        status: response.status,
        error: errorData,
        retryCount
      });

      // Retry on specific error codes
      if (retryCount < MAX_RETRIES && (
        response.status === 429 || // Rate limit
        response.status === 500 || // Server error
        response.status === 503    // Service unavailable
      )) {
        functions.logger.info('Retrying transcription', { retryCount: retryCount + 1 });
        await sleep(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return transcribeAudio(audioBuffer, retryCount + 1);
      }

      throw new Error(`Whisper API error (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    // Validate response
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('Empty transcription received - audio may be too quiet or unclear');
    }

    const transcribedText = data.text.trim();
    const detectedLanguage = data.language || 'en';

    functions.logger.info('Audio transcribed successfully', {
      textLength: transcribedText.length,
      language: detectedLanguage,
      retryCount
    });

    return {
      text: transcribedText,
      language: detectedLanguage,
      confidence: data.confidence || 0.9 // Default high confidence if not provided
    };

  } catch (error: any) {
    functions.logger.error('Audio transcription failed', {
      error: error.message,
      stack: error.stack,
      retryCount,
      bufferSize: audioBuffer?.length || 0
    });

    // Retry on network errors
    if (retryCount < MAX_RETRIES && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT'
    )) {
      functions.logger.info('Retrying transcription after network error', { retryCount: retryCount + 1 });
      await sleep(RETRY_DELAY * (retryCount + 1));
      return transcribeAudio(audioBuffer, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Detect audio format from buffer magic bytes
 */
function detectAudioFormat(buffer: Buffer): string {
  // OGG Opus (WhatsApp default)
  if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return 'ogg';
  }

  // MP3
  if ((buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) || // MP3 frame sync
      (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33)) { // ID3 tag
    return 'mp3';
  }

  // M4A/AAC
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return 'm4a';
  }

  // WAV
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'wav';
  }

  // Default to ogg (WhatsApp's standard format)
  return 'ogg';
}

/**
 * Sleep utility for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process user message with AI to understand intent and extract entities
 */
export async function processUserMessage(
  messageText: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<AIIntentResult> {
  try {
    const systemPrompt = `You are Amana (meaning "trust"), an AI assistant for Nigerian Transport & Logistics businesses.

CASE-INSENSITIVE: "show routes" = "SHOW ROUTES" = "Show Routes"

LANGUAGE: Understand Nigerian English, Pidgin ("abeg", "oga", "wetin", "dey"), Hausa, Igbo, Yoruba, mixed grammar.

CONVERSATIONAL EXAMPLES:

INVOICES: "create invoice for ABC, 50 cement at 5000" → create_invoice | "create invoice modern template" → create_invoice (template: modern) | "invoice with VAT inclusive" → create_invoice (vatInclusive: true) | "show invoices" → list_invoices | "preview invoice INV-123" → preview_invoice | "send invoice INV-123" → send_invoice | "overdue invoices" → overdue_invoices | "record payment 50000 for INV123" → record_payment

CLIENTS: "add client Dangote" → add_client | "list clients" → list_clients | "show client Dangote" → view_client

WALLET: "what's my balance" → view_balance | "show transactions" → list_transactions | "send 50000 to driver John" → transfer_to_driver

ROUTES: "list routes" → list_routes | "active routes" → list_routes (filter) | "show route RTE-123" → view_route | "update route RTE-123 to completed" → update_route_status | "add fuel expense 15000 for RTE-123" → add_route_expense

DRIVERS: "list drivers" → list_drivers | "where is John" → driver_location | "show driver John" → view_driver | "John's salary" → driver_salary

VEHICLES: "list vehicles" → list_vehicles | "where is AAA123" → vehicle_location | "show vehicle AAA123" → view_vehicle

PAYROLL: "show payroll" → list_payroll | "John's payslip" → view_payslip

REPORTS: "revenue this month" → revenue_summary | "show expenses" → expense_summary

JSON RESPONSE:
{
  "intent": "create_invoice|preview_invoice|send_invoice|list_invoices|view_invoice|overdue_invoices|record_payment|add_client|view_client|list_clients|view_balance|list_transactions|transfer_to_driver|list_routes|view_route|update_route_status|add_route_expense|get_route_expenses|list_drivers|view_driver|driver_location|driver_salary|list_vehicles|view_vehicle|vehicle_location|list_payroll|view_payslip|revenue_summary|expense_summary|help|unknown",
  "confidence": 0.0-1.0,
  "language": "en|pidgin|ha|ig|yo|mixed",
  "entities": {}
}

ENTITIES:
Invoice: clientName, items:[{description,quantity,unitPrice}], totalAmount, template (classic|modern|minimal|professional), vatInclusive (true|false), vatRate (number), invoiceNumber (for preview/send)
Client: name (companyName), contactPerson, email, phone, address, taxId (TIN), rcNumber (CAC)
Route: routeId, origin, destination, status, expenseType, expenseAmount
Driver: name, driverId, status
Vehicle: plateNumber, vehicleId
Transfer: recipientName, amount
Payment: invoiceId, amount
Filter: status (active/pending/completed), timeframe (today/week/month)

Be FLEXIBLE - accept any grammar!`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: messageText }
    ];

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Upgraded to GPT-4o for paid tier optimization
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.3, // Low temperature for consistent extraction
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);

    functions.logger.info('AI intent recognized', {
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
      language: aiResponse.language
    });

    return {
      intent: aiResponse.intent as Intent,
      confidence: aiResponse.confidence,
      language: aiResponse.language || 'en',
      entities: aiResponse.entities,
      rawText: messageText
    };
  } catch (error: any) {
    functions.logger.error('AI processing error', { error: error.message });

    // Fallback to simple keyword matching
    return fallbackIntentRecognition(messageText);
  }
}

/**
 * Fallback intent recognition using keywords (when AI fails)
 */
function fallbackIntentRecognition(text: string): AIIntentResult {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('invoice') || lowerText.includes('bill')) {
    return {
      intent: Intent.CREATE_INVOICE,
      confidence: 0.6,
      language: 'en',
      entities: {},
      rawText: text
    };
  }

  if (lowerText.includes('client') || lowerText.includes('customer')) {
    if (lowerText.includes('add') || lowerText.includes('new') || lowerText.includes('create')) {
      return {
        intent: Intent.ADD_CLIENT,
        confidence: 0.6,
        language: 'en',
        entities: {},
        rawText: text
      };
    }
    return {
      intent: Intent.LIST_CLIENTS,
      confidence: 0.6,
      language: 'en',
      entities: {},
      rawText: text
    };
  }

  if (lowerText.includes('balance') || lowerText.includes('wallet')) {
    return {
      intent: Intent.VIEW_BALANCE,
      confidence: 0.7,
      language: 'en',
      entities: {},
      rawText: text
    };
  }

  if (lowerText.includes('transaction') || lowerText.includes('history')) {
    return {
      intent: Intent.LIST_TRANSACTIONS,
      confidence: 0.7,
      language: 'en',
      entities: {},
      rawText: text
    };
  }

  if (lowerText.includes('help') || lowerText.includes('menu')) {
    return {
      intent: Intent.HELP,
      confidence: 0.9,
      language: 'en',
      entities: {},
      rawText: text
    };
  }

  return {
    intent: Intent.UNKNOWN,
    confidence: 0.3,
    language: 'en',
    entities: {},
    rawText: text
  };
}

/**
 * Generate AI response based on context
 */
export async function generateResponse(
  intent: Intent,
  entities: any,
  context?: string
): Promise<string> {
  try {
    const systemPrompt = `You are Amana (meaning "trust" in Hausa), an AI assistant for Nigerian Transport & Logistics businesses.
Respond in a warm, friendly tone with Nigerian cultural awareness.
Keep responses concise (2-3 sentences max) and action-oriented.
Use Nigerian Pidgin expressions naturally ("wetin", "dey", "abeg", "I don hear you").
Be proactive and helpful - suggest next steps.`;

    const userPrompt = `Generate a response for:
Intent: ${intent}
Extracted Data: ${JSON.stringify(entities)}
Context: ${context || 'None'}

Provide a helpful, culturally-aware response with Nigerian warmth.`;

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Upgraded to GPT-4o for paid tier
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error: any) {
    functions.logger.error('Response generation error', { error: error.message });
    return 'I don hear you! Let me help you with that. 😊';
  }
}
