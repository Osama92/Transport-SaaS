/**
 * Amana - Advanced Conversational AI System
 * Multi-phase conversation management with GPT-4o and Nigerian cultural awareness
 *
 * Named after the Hausa word for "trust" - reflecting reliability and care
 */

import * as functions from 'firebase-functions';
import { Intent } from '../types';
import { getUserContext, UserContext } from './AmanaContextManager';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || functions.config().openai?.api_key;
const OPENAI_API_URL = 'https://api.openai.com/v1';

/**
 * Conversation Phases
 * Represents the lifecycle of a user request
 */
export enum ConversationPhase {
  IDLE = 'idle',                   // No active conversation, waiting for user input
  COLLECTING = 'collecting',       // Gathering required information from user
  CONFIRMING = 'confirming',       // Asking user to verify the action
  EXECUTING = 'executing',         // Performing the requested action
}

/**
 * Conversation State
 * Tracks the current state of a multi-turn conversation
 */
export interface ConversationState {
  phase: ConversationPhase;
  intent: Intent | null;
  collectedData: Record<string, any>;
  requiredFields: string[];
  missingFields: string[];
  lastActivity: Date;
  turnCount: number;
  language: 'en' | 'ha' | 'ig' | 'yo' | 'pidgin';
  confirmationAttempts: number;
}

/**
 * AI Decision Structure (from GPT-4o)
 */
export interface AIDecision {
  intent: Intent;
  confidence: number;
  phase: ConversationPhase;
  nextAction: 'collect' | 'confirm' | 'execute' | 'clarify' | 'abort';
  extractedEntities: Record<string, any>;
  missingFields: string[];
  responseMessage: string;
  quickReplies?: string[];
  proactiveInsights?: string[];
  shouldAutoExecute: boolean; // True if no confirmation needed (simple queries)
}

/**
 * Process a conversational message using Amana's advanced AI
 * This is the main entry point for conversational processing
 */
export async function processConversation(
  userMessage: string,
  whatsappNumber: string,
  organizationId: string,
  currentState?: ConversationState
): Promise<{
  response: string;
  intent: Intent;
  phase: ConversationPhase;
  updatedState: ConversationState;
  quickReplies?: string[];
  shouldExecute: boolean;
  collectedData?: Record<string, any>;
}> {
  try {
    functions.logger.info('Amana processing conversation', {
      whatsappNumber,
      message: userMessage.substring(0, 100),
      currentPhase: currentState?.phase || 'none'
    });

    // Get enriched user context
    const userContext = await getUserContext(whatsappNumber, organizationId);

    // Get AI decision using GPT-4o with structured output
    const decision = await getAIDecision(
      userMessage,
      userContext,
      currentState
    );

    functions.logger.info('Amana decision', {
      intent: decision.intent,
      phase: decision.phase,
      nextAction: decision.nextAction,
      confidence: decision.confidence,
      shouldAutoExecute: decision.shouldAutoExecute
    });

    // Build updated conversation state
    const updatedState: ConversationState = currentState || {
      phase: ConversationPhase.IDLE,
      intent: null,
      collectedData: {},
      requiredFields: [],
      missingFields: [],
      lastActivity: new Date(),
      turnCount: 0,
      language: decision.responseMessage.includes('wetin') || decision.responseMessage.includes('dey') ? 'pidgin' : 'en',
      confirmationAttempts: 0
    };

    updatedState.intent = decision.intent;
    updatedState.phase = decision.phase;
    updatedState.collectedData = { ...updatedState.collectedData, ...decision.extractedEntities };
    updatedState.missingFields = decision.missingFields;
    updatedState.lastActivity = new Date();
    updatedState.turnCount += 1;

    // Handle each conversation phase
    let finalResponse = decision.responseMessage;
    let shouldExecute = false;

    switch (decision.phase) {
      case ConversationPhase.IDLE:
        finalResponse = await handleIdlePhase(decision, userContext);
        break;

      case ConversationPhase.COLLECTING:
        finalResponse = await handleCollectingPhase(decision, updatedState, userContext);
        break;

      case ConversationPhase.CONFIRMING:
        finalResponse = await handleConfirmingPhase(decision, updatedState, userContext);
        updatedState.confirmationAttempts += 1;
        break;

      case ConversationPhase.EXECUTING:
        finalResponse = await handleExecutingPhase(decision, updatedState, userContext);
        shouldExecute = true;
        break;
    }

    // Auto-execute simple queries (no confirmation needed)
    if (decision.shouldAutoExecute && decision.nextAction === 'execute') {
      shouldExecute = true;
      updatedState.phase = ConversationPhase.EXECUTING;
    }

    // Add proactive insights if available
    if (decision.proactiveInsights && decision.proactiveInsights.length > 0) {
      const insights = decision.proactiveInsights.join('\n• ');
      finalResponse += `\n\n💡 *Amana Insights:*\n• ${insights}`;
    }

    return {
      response: finalResponse,
      intent: decision.intent,
      phase: updatedState.phase,
      updatedState,
      quickReplies: decision.quickReplies,
      shouldExecute,
      collectedData: updatedState.collectedData
    };

  } catch (error: any) {
    functions.logger.error('Amana conversation error', {
      error: error.message,
      stack: error.stack
    });

    return {
      response: getNigerianErrorMessage(),
      intent: Intent.UNKNOWN,
      phase: ConversationPhase.IDLE,
      updatedState: currentState || {
        phase: ConversationPhase.IDLE,
        intent: null,
        collectedData: {},
        requiredFields: [],
        missingFields: [],
        lastActivity: new Date(),
        turnCount: 0,
        language: 'en',
        confirmationAttempts: 0
      },
      shouldExecute: false
    };
  }
}

/**
 * Get AI decision using GPT-4o with structured JSON output
 * This is the BRAIN of Amana - powered by paid tier OpenAI
 */
async function getAIDecision(
  userMessage: string,
  context: UserContext,
  currentState?: ConversationState
): Promise<AIDecision> {
  try {
    const systemPrompt = buildAmanaSystemPrompt(context);
    const conversationHistory = buildConversationHistory(userMessage, context, currentState);

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Latest GPT-4o model (paid tier optimized)
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' }, // Structured JSON output
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content || '{}');

    return {
      intent: aiResponse.intent || Intent.UNKNOWN,
      confidence: aiResponse.confidence || 0.5,
      phase: aiResponse.phase || ConversationPhase.IDLE,
      nextAction: aiResponse.nextAction || 'clarify',
      extractedEntities: aiResponse.extractedEntities || {},
      missingFields: aiResponse.missingFields || [],
      responseMessage: aiResponse.responseMessage || "I no understand well. Wetin you need?",
      quickReplies: aiResponse.quickReplies || [],
      proactiveInsights: aiResponse.proactiveInsights || [],
      shouldAutoExecute: aiResponse.shouldAutoExecute || false
    };

  } catch (error: any) {
    functions.logger.error('GPT-4o decision error', { error: error.message });

    // Fallback to basic intent detection
    return {
      intent: Intent.UNKNOWN,
      confidence: 0.3,
      phase: ConversationPhase.IDLE,
      nextAction: 'clarify',
      extractedEntities: {},
      missingFields: [],
      responseMessage: "Ah sorry o! My brain no work well now. Make you try again? 😅",
      quickReplies: ['Help', 'Try again'],
      proactiveInsights: [],
      shouldAutoExecute: false
    };
  }
}

/**
 * Build Amana's system prompt with Nigerian cultural awareness
 */
function buildAmanaSystemPrompt(context: UserContext): string {
  return `You are Amana, an AI assistant for Nigerian transport and logistics businesses. Your name means "trust" in Hausa.

PERSONALITY:
- Warm, friendly, and culturally aware of Nigerian business practices
- Use Nigerian Pidgin expressions naturally (e.g., "wetin you need?", "I don hear you", "make I check")
- Professional but conversational - balance efficiency with warmth
- Proactive with insights based on user's business patterns

CAPABILITIES:
You can help with: invoices, clients, wallet/balance, routes, drivers, vehicles, payroll, expenses, analytics

USER CONTEXT:
- Organization ID: ${context.organizationId}
- Recent Activity: ${context.recentActivity.map(a => `${a.action} (${a.timestamp})`).join(', ') || 'None'}
- Common Clients: ${context.commonEntities.clients.join(', ') || 'None'}
- Common Routes: ${context.commonEntities.routes.join(', ') || 'None'}
- Drivers: ${context.commonEntities.drivers.join(', ') || 'None'}
- Language Preference: ${context.userProfile?.language || 'English'}

RESPONSE FORMAT (JSON):
{
  "intent": "create_invoice|list_invoices|view_balance|...",
  "confidence": 0.0-1.0,
  "phase": "idle|collecting|confirming|executing",
  "nextAction": "collect|confirm|execute|clarify|abort",
  "extractedEntities": {"clientName": "...", "amount": 5000, ...},
  "missingFields": ["dueDate", ...],
  "responseMessage": "Your conversational response with Nigerian flair",
  "quickReplies": ["Yes", "No", "Edit"],
  "proactiveInsights": ["You have 3 overdue invoices", ...],
  "shouldAutoExecute": true/false
}

CONVERSATION PHASES:
1. IDLE: User starting new request - determine intent and required fields
2. COLLECTING: Missing required data - ask conversationally for missing fields
3. CONFIRMING: All data collected - show summary and ask for confirmation
4. EXECUTING: User confirmed - execute the action

AUTO-EXECUTE (no confirmation):
- Simple queries: balance, list items, view status
- Read-only operations

REQUIRE CONFIRMATION:
- Creating/modifying data: invoices, clients, transfers
- Financial transactions
- Bulk operations

PROACTIVE INSIGHTS:
- Overdue invoices when checking balance
- Low balance when creating expense
- Incomplete client info when creating invoice
- Driver availability when creating route

NIGERIAN EXPRESSIONS:
- Greetings: "How far?", "Wetin dey happen?"
- Acknowledgment: "I don hear you", "Na so", "E clear"
- Waiting: "Small time o", "I dey check am"
- Success: "E don set!", "We don finish", "Chop knuckle! 👊"
- Error: "Ah sorry o!", "E no work", "Make we try again"

Always respond in valid JSON format.`;
}

/**
 * Build conversation history for context
 */
function buildConversationHistory(
  currentMessage: string,
  context: UserContext,
  currentState?: ConversationState
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add recent conversation turns for context
  if (context.recentActivity.length > 0) {
    // Include last 3 activities for context
    context.recentActivity.slice(-3).forEach(activity => {
      history.push({
        role: 'user',
        content: `[Previous: ${activity.action}]`
      });
    });
  }

  return history;
}

/**
 * Handle IDLE phase - User starting a new request
 */
async function handleIdlePhase(decision: AIDecision, context: UserContext): Promise<string> {
  let response = decision.responseMessage;

  // Add greeting if it's first interaction
  if (context.recentActivity.length === 0) {
    const greetings = [
      "👋 How far! I be Amana, your transport business assistant. Wetin you need today?",
      "🚚 Hey! Na Amana here. How I fit help your business today?",
      "✨ Amana here! Ready to help with your logistics. Wetin we dey do?"
    ];
    response = greetings[Math.floor(Math.random() * greetings.length)];
  }

  return response;
}

/**
 * Handle COLLECTING phase - Gathering required information
 */
async function handleCollectingPhase(
  decision: AIDecision,
  state: ConversationState,
  context: UserContext
): Promise<string> {
  const missing = decision.missingFields;

  if (missing.length === 0) {
    // All data collected, move to confirmation
    return decision.responseMessage;
  }

  // Build conversational prompt for missing fields
  let response = decision.responseMessage;

  // Add smart suggestions based on context
  if (missing.includes('clientName') && context.commonEntities.clients.length > 0) {
    response += `\n\n💡 *Recent clients:* ${context.commonEntities.clients.slice(0, 3).join(', ')}`;
  }

  if (missing.includes('driverId') && context.commonEntities.drivers.length > 0) {
    response += `\n\n💡 *Available drivers:* ${context.commonEntities.drivers.slice(0, 3).join(', ')}`;
  }

  return response;
}

/**
 * Handle CONFIRMING phase - Asking user to verify action
 */
async function handleConfirmingPhase(
  decision: AIDecision,
  state: ConversationState,
  context: UserContext
): Promise<string> {
  let response = decision.responseMessage;

  // Add confirmation summary
  const data = state.collectedData;
  const summaryLines: string[] = [];

  Object.entries(data).forEach(([key, value]) => {
    const formatted = formatFieldForDisplay(key, value);
    if (formatted) summaryLines.push(formatted);
  });

  if (summaryLines.length > 0) {
    response += `\n\n📋 *Summary:*\n${summaryLines.join('\n')}`;
  }

  // Add confirmation options
  response += `\n\n*Confirm?*`;

  return response;
}

/**
 * Handle EXECUTING phase - Performing the action
 */
async function handleExecutingPhase(
  decision: AIDecision,
  state: ConversationState,
  context: UserContext
): Promise<string> {
  const executingMessages = [
    "⚡ E don set! Processing your request...",
    "🚀 On it! Give me small time...",
    "✨ I dey work on am now...",
    "⏳ Almost done..."
  ];

  return executingMessages[Math.floor(Math.random() * executingMessages.length)];
}

/**
 * Generate proactive insights based on user context
 */
export async function generateProactiveInsights(
  context: UserContext,
  currentIntent: Intent
): Promise<string[]> {
  const insights: string[] = [];

  // Overdue invoices insight
  if (context.businessMetrics && context.businessMetrics.overdueInvoices > 0) {
    const count = context.businessMetrics.overdueInvoices;
    insights.push(`⚠️ You get ${count} overdue invoice${count > 1 ? 's' : ''}`);
  }

  // Low balance insight (when creating expense/transfer)
  if (
    (currentIntent === Intent.ADD_ROUTE_EXPENSE || currentIntent === Intent.TRANSFER_TO_DRIVER) &&
    context.businessMetrics &&
    context.businessMetrics.walletBalance < 10000
  ) {
    insights.push(`💰 Your wallet balance low (₦${context.businessMetrics.walletBalance.toLocaleString()})`);
  }

  // Incomplete client info
  if (currentIntent === Intent.CREATE_INVOICE && context.recentActivity.length > 0) {
    const lastClient = context.recentActivity.find(a => a.entity?.type === 'client')?.entity;
    if (lastClient && (!lastClient.email || !lastClient.phone)) {
      insights.push(`📝 Update ${lastClient.name} contact info for easier invoicing`);
    }
  }

  // Recent pattern insights
  if (context.userPatterns.mostUsedFeatures.length > 0) {
    const topFeature = context.userPatterns.mostUsedFeatures[0];
    if (topFeature.includes('invoice') && currentIntent === Intent.VIEW_BALANCE) {
      insights.push(`📄 You create plenty invoices - want to see unpaid ones?`);
    }
  }

  return insights;
}

/**
 * Format field for display in confirmation
 */
function formatFieldForDisplay(key: string, value: any): string | null {
  if (value === undefined || value === null) return null;

  const formatters: Record<string, (val: any) => string> = {
    clientName: (val) => `👤 Client: ${val}`,
    amount: (val) => `💰 Amount: ₦${Number(val).toLocaleString()}`,
    totalAmount: (val) => `💰 Total: ₦${Number(val).toLocaleString()}`,
    dueDate: (val) => `📅 Due Date: ${val}`,
    items: (val) => `📦 Items: ${Array.isArray(val) ? val.length : 0} item(s)`,
    description: (val) => `📝 Description: ${val}`,
    recipientName: (val) => `👤 To: ${val}`,
    routeName: (val) => `🚚 Route: ${val}`,
    driverName: (val) => `👤 Driver: ${val}`,
  };

  const formatter = formatters[key];
  return formatter ? formatter(value) : `${key}: ${value}`;
}

/**
 * Get Nigerian-style error message
 */
function getNigerianErrorMessage(): string {
  const messages = [
    "Ah sorry o! 😅 Something go wrong. Make you try again?",
    "Omo! E no work as expected. Let's try again abeg.",
    "Chai! Network wahala. Make we try again?",
    "My bad! 😓 Something shake. Try am again?",
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Detect if conversation has timed out (idle for > 5 minutes)
 */
export function hasConversationTimedOut(state: ConversationState): boolean {
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const now = new Date().getTime();
  const lastActivity = new Date(state.lastActivity).getTime();

  return (now - lastActivity) > TIMEOUT_MS;
}

/**
 * Reset conversation state after timeout
 */
export function resetConversationState(): ConversationState {
  return {
    phase: ConversationPhase.IDLE,
    intent: null,
    collectedData: {},
    requiredFields: [],
    missingFields: [],
    lastActivity: new Date(),
    turnCount: 0,
    language: 'en',
    confirmationAttempts: 0
  };
}
