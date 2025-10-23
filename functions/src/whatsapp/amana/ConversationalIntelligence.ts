/**
 * Amana - Conversational Intelligence
 * Makes Amana feel like a real Nigerian business assistant with ChatGPT
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || functions.config().openai?.api_key;
const OPENAI_API_URL = 'https://api.openai.com/v1';

/**
 * Conversation Types
 */
export enum ConversationType {
  GREETING = 'greeting',
  SMALL_TALK = 'small_talk',
  COMPLIMENT = 'compliment',
  QUESTION = 'question',
  TASK = 'task',
  UNKNOWN = 'unknown'
}

/**
 * Detect conversation type using ChatGPT
 */
export async function detectConversationType(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{
  type: ConversationType;
  isGreeting: boolean;
  isSmallTalk: boolean;
  isCompliment: boolean;
  isQuestion: boolean;
  needsBusinessAction: boolean;
  suggestedResponse?: string;
}> {
  try {
    const systemPrompt = `You are Amana, a Nigerian business AI assistant. Analyze the user's message and determine its type.

CONVERSATION TYPES:
- GREETING: "how far", "wetin dey happen", "good morning", "hello"
- SMALL_TALK: "how you dey", "you good?", "thanks", "nice one"
- COMPLIMENT: "you too good", "nice work", "well done"
- QUESTION: "how does this work?", "wetin be invoice?"
- TASK: "create invoice", "show balance", "list clients"

Respond in JSON:
{
  "type": "greeting|small_talk|compliment|question|task|unknown",
  "isGreeting": true/false,
  "isSmallTalk": true/false,
  "isCompliment": true/false,
  "isQuestion": true/false,
  "needsBusinessAction": true/false,
  "suggestedResponse": "Friendly Nigerian response in Pidgin/English"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-5), // Last 5 messages for context
      { role: 'user', content: message }
    ];

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      throw new Error('ChatGPT API error');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      type: result.type || ConversationType.UNKNOWN,
      isGreeting: result.isGreeting || false,
      isSmallTalk: result.isSmallTalk || false,
      isCompliment: result.isCompliment || false,
      isQuestion: result.isQuestion || false,
      needsBusinessAction: result.needsBusinessAction || false,
      suggestedResponse: result.suggestedResponse
    };

  } catch (error: any) {
    functions.logger.error('Conversation type detection error', { error: error.message });

    // Fallback to keyword detection
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.match(/how far|wetin dey|good morning|hello|hi|hey/)) {
      return {
        type: ConversationType.GREETING,
        isGreeting: true,
        isSmallTalk: false,
        isCompliment: false,
        isQuestion: false,
        needsBusinessAction: false,
        suggestedResponse: "I dey o! 😊 Wetin I fit do for you today?"
      };
    }

    if (lowerMessage.match(/thank|nice|well done|good job|you good/)) {
      return {
        type: ConversationType.COMPLIMENT,
        isGreeting: false,
        isSmallTalk: false,
        isCompliment: true,
        isQuestion: false,
        needsBusinessAction: false,
        suggestedResponse: "Na my job be that! 😊 How I fit help you?"
      };
    }

    return {
      type: ConversationType.UNKNOWN,
      isGreeting: false,
      isSmallTalk: false,
      isCompliment: false,
      isQuestion: false,
      needsBusinessAction: true
    };
  }
}

/**
 * Generate conversational response with business context
 */
export async function generateConversationalResponse(
  userMessage: string,
  organizationId: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  businessContext?: {
    unpaidInvoices?: number;
    overdueInvoices?: number;
    walletBalance?: number;
    activeRoutes?: number;
    totalRevenue?: number;
  }
): Promise<string> {
  try {
    // Build rich context for ChatGPT
    let contextInfo = '';

    if (businessContext) {
      if (businessContext.unpaidInvoices && businessContext.unpaidInvoices > 0) {
        contextInfo += `\n- User has ${businessContext.unpaidInvoices} unpaid invoices`;
      }
      if (businessContext.overdueInvoices && businessContext.overdueInvoices > 0) {
        contextInfo += `\n- ${businessContext.overdueInvoices} invoices are overdue`;
      }
      if (businessContext.walletBalance !== undefined) {
        contextInfo += `\n- Wallet balance: ₦${businessContext.walletBalance.toLocaleString()}`;
      }
      if (businessContext.activeRoutes && businessContext.activeRoutes > 0) {
        contextInfo += `\n- ${businessContext.activeRoutes} active routes`;
      }
    }

    const systemPrompt = `You are Amana (meaning "trust" in Hausa), a warm and intelligent Nigerian business AI assistant for a transport & logistics company.

PERSONALITY:
- Friendly, warm, and conversational like a Nigerian colleague
- Use Nigerian Pidgin naturally: "I dey", "wetin", "abeg", "no wahala", "e don set"
- Proactive - offer helpful suggestions based on business context
- Professional but relatable - balance work with warmth

CURRENT BUSINESS CONTEXT:${contextInfo || '\n- No specific business alerts'}

RESPONSE STYLE:
- Keep responses concise (2-3 sentences max)
- Be helpful and action-oriented
- Use emojis naturally: 😊 💰 📄 ✅ ⚠️
- Always end with a helpful question or next step
- Match user's language level (Pidgin ↔ English)

GREETINGS:
- "How far?" → "I dey o! 😊 Wetin I fit do for you today?"
- "Good morning" → "Good morning! ☀️ How your business dey?"
- "Wetin dey happen?" → "Everything dey kampe! How I fit help?"

COMPLIMENTS:
- "Nice work" → "Thank you! 😊 Na team work. Anything else?"
- "You good" → "I dey try! 💪 How I fit help you?"

PROACTIVE REMINDERS (when greeting):
If unpaid invoices > 0: Mention it naturally
If overdue invoices > 0: Suggest following up with clients
If low balance: Suggest funding wallet
If active routes: Offer to show updates

Example: "I dey o! 😊 By the way, you get 3 unpaid invoices worth ₦500,000. Want make I show you?"`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Last 6 messages
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.9, // Higher for more natural conversation
        max_tokens: 250,
        top_p: 0.95
      }),
    });

    if (!response.ok) {
      throw new Error('ChatGPT API error');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error: any) {
    functions.logger.error('Conversational response error', { error: error.message });

    // Fallback responses
    const fallbacks = [
      "I dey here to help! 😊 Wetin you need today?",
      "E don set! How I fit assist you?",
      "No wahala! Tell me wetin you need.",
      "I ready to help! 💪 Talk to me."
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

/**
 * Get business context for proactive insights
 */
export async function getBusinessContextForChat(
  organizationId: string
): Promise<{
  unpaidInvoices: number;
  unpaidInvoicesTotal: number;
  overdueInvoices: number;
  overdueInvoicesTotal: number;
  walletBalance: number;
  activeRoutes: number;
  totalRevenue: number;
  recentInvoices: Array<{
    invoiceNumber: string;
    clientName: string;
    total: number;
    status: string;
    dueDate: string;
    daysOverdue?: number;
  }>;
}> {
  try {
    const now = new Date();

    // Get invoices
    const invoicesSnapshot = await db.collection('invoices')
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    let unpaidInvoices = 0;
    let unpaidInvoicesTotal = 0;
    let overdueInvoices = 0;
    let overdueInvoicesTotal = 0;
    let totalRevenue = 0;
    const recentInvoices: any[] = [];

    invoicesSnapshot.docs.forEach(doc => {
      const invoice = doc.data();

      if (invoice.status === 'Paid') {
        totalRevenue += invoice.total || 0;
      } else if (invoice.status === 'Sent' || invoice.status === 'Draft') {
        unpaidInvoices += 1;
        unpaidInvoicesTotal += invoice.total || 0;

        // Check if overdue
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
        if (dueDate && dueDate < now) {
          overdueInvoices += 1;
          overdueInvoicesTotal += invoice.total || 0;

          const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          recentInvoices.push({
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.clientName,
            total: invoice.total,
            status: invoice.status,
            dueDate: invoice.dueDate,
            daysOverdue
          });
        }
      }
    });

    // Get wallet balance
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    const walletBalance = orgDoc.exists ? (orgDoc.data()?.walletBalance || 0) : 0;

    // Get active routes
    const activeRoutesSnapshot = await db.collection('routes')
      .where('organizationId', '==', organizationId)
      .where('status', 'in', ['Pending', 'In Progress'])
      .get();

    return {
      unpaidInvoices,
      unpaidInvoicesTotal,
      overdueInvoices,
      overdueInvoicesTotal,
      walletBalance,
      activeRoutes: activeRoutesSnapshot.size,
      totalRevenue,
      recentInvoices: recentInvoices.slice(0, 5) // Top 5 overdue
    };

  } catch (error: any) {
    functions.logger.error('Error fetching business context', { error: error.message });

    return {
      unpaidInvoices: 0,
      unpaidInvoicesTotal: 0,
      overdueInvoices: 0,
      overdueInvoicesTotal: 0,
      walletBalance: 0,
      activeRoutes: 0,
      totalRevenue: 0,
      recentInvoices: []
    };
  }
}
