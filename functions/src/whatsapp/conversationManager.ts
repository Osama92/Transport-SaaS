/**
 * Conversation Manager for WhatsApp
 * Handles conversation context, state, and natural flow
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Intent } from './types';
import type { ConversationState } from './types';
import { sendWhatsAppMessage } from './webhook';

const getDb = () => admin.firestore();

/**
 * Get or create conversation state
 */
export async function getConversationState(
  whatsappNumber: string,
  organizationId: string,
  userId: string
): Promise<ConversationState | null> {
  try {
    const conversationDoc = await getDb()
      .collection('whatsappConversations')
      .doc(whatsappNumber)
      .get();

    if (conversationDoc.exists) {
      return conversationDoc.data() as ConversationState;
    }

    // Create new conversation state
    const newState: ConversationState = {
      userId,
      organizationId,
      whatsappNumber,
      sessionId: `session_${Date.now()}`,
      awaitingConfirmation: false,
      awaitingInput: null,
      conversationData: {},
      retryCount: 0,
      conversationHistory: [],
      lastMessageAt: new Date(),
      createdAt: new Date(),
      language: 'en',
      lastInvoiceNumber: null,  // Track last created/viewed invoice
      lastClientName: null,     // Track last client mentioned
      lastDriverId: null        // Track last driver mentioned
    };

    await getDb()
      .collection('whatsappConversations')
      .doc(whatsappNumber)
      .set(newState);

    return newState;
  } catch (error: any) {
    functions.logger.error('Error getting conversation state', {
      error: error.message,
      whatsappNumber
    });
    return null;
  }
}

/**
 * Update conversation state
 */
export async function updateConversationState(
  whatsappNumber: string,
  updates: Partial<ConversationState>
): Promise<void> {
  try {
    await getDb()
      .collection('whatsappConversations')
      .doc(whatsappNumber)
      .update({
        ...updates,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
      });

    functions.logger.info('Conversation state updated', {
      whatsappNumber,
      updates: Object.keys(updates)
    });
  } catch (error: any) {
    functions.logger.error('Error updating conversation state', {
      error: error.message,
      whatsappNumber
    });
  }
}

/**
 * Add message to conversation history
 */
export async function addToConversationHistory(
  whatsappNumber: string,
  role: 'user' | 'assistant',
  message: string,
  intent?: Intent
): Promise<void> {
  try {
    const conversationDoc = await getDb()
      .collection('whatsappConversations')
      .doc(whatsappNumber)
      .get();

    if (!conversationDoc.exists) return;

    const state = conversationDoc.data() as ConversationState;
    const history = state.conversationHistory || [];

    // Keep last 20 messages for context
    const historyEntry: any = {
      role,
      message: message.substring(0, 500), // Truncate long messages
      timestamp: new Date()
    };

    // Only add intent if it's defined (Firestore doesn't allow undefined)
    if (intent) {
      historyEntry.intent = intent;
    }

    const updatedHistory = [
      ...history,
      historyEntry
    ].slice(-20);

    await getDb()
      .collection('whatsappConversations')
      .doc(whatsappNumber)
      .update({
        conversationHistory: updatedHistory,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
      });
  } catch (error: any) {
    functions.logger.error('Error adding to conversation history', {
      error: error.message
    });
  }
}

/**
 * Handle retry/correction requests
 */
export async function handleRetry(
  whatsappNumber: string,
  phoneNumberId: string,
  state: ConversationState
): Promise<boolean> {
  try {
    if (!state.lastError || !state.lastIntent) {
      return false; // No error to retry
    }

    // Send helpful retry message
    const retryMessages = [
      `Ah, let me try that again! 🔄\n\nWhat went wrong: ${state.lastError}\n\nCould you give me the details one more time?\n\nOr type "HELP" if you need guidance.`,
      `No wahala! Let's fix this together. 💪\n\nThe issue was: ${state.lastError}\n\nPlease share the details again and I'll get it right this time!`,
      `Sorry about that! 😅\n\nProblem: ${state.lastError}\n\nLet's try again - what would you like me to do?`
    ];

    const message = retryMessages[Math.floor(Math.random() * retryMessages.length)];

    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: message
    });

    // Reset error state
    await updateConversationState(whatsappNumber, {
      lastError: undefined,
      awaitingInput: 'retry',
      retryCount: (state.retryCount || 0) + 1
    });

    return true;
  } catch (error: any) {
    functions.logger.error('Error handling retry', { error: error.message });
    return false;
  }
}

/**
 * Handle conversational follow-ups (yes/no, 1/2/3, etc.)
 */
export async function handleFollowUp(
  message: string,
  state: ConversationState,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<{ handled: boolean; action?: string }> {
  const normalizedMessage = message.toLowerCase().trim();

  // Handle yes/no responses
  if (['yes', 'y', 'yeah', 'sure', 'ok', 'okay', 'yep', 'yup', 'oya'].includes(normalizedMessage)) {
    if (state.awaitingConfirmation) {
      return { handled: true, action: 'confirm' };
    }
  }

  if (['no', 'n', 'nope', 'nah', 'cancel', 'stop'].includes(normalizedMessage)) {
    if (state.awaitingConfirmation) {
      await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
        type: 'text',
        text: `No problem! Operation cancelled. ✋\n\nWhat else can I help you with?`
      });
      await updateConversationState(whatsappNumber, {
        awaitingConfirmation: false,
        conversationData: {}
      });
      return { handled: true, action: 'cancel' };
    }
  }

  // Handle numbered responses (1, 2, 3, 4)
  const numberMatch = normalizedMessage.match(/^[1-4]$/);
  if (numberMatch && state.lastIntent) {
    const number = parseInt(normalizedMessage);

    // Context-aware number handling
    if (state.lastIntent === Intent.CREATE_INVOICE) {
      const actions = {
        1: 'preview_invoice',
        2: 'send_invoice',
        3: 'create_another',
        4: 'view_all'
      };
      return { handled: true, action: actions[number as keyof typeof actions] };
    }
  }

  // Handle "try again" / "retry" keywords
  if (['try again', 'retry', 'redo', 'repeat'].some(keyword => normalizedMessage.includes(keyword))) {
    const retried = await handleRetry(whatsappNumber, phoneNumberId, state);
    return { handled: retried, action: 'retry' };
  }

  return { handled: false };
}

/**
 * Handle out-of-scope queries with friendly messages
 */
export async function handleOutOfScope(
  message: string,
  phoneNumberId: string,
  whatsappNumber: string,
  confidence: number
): Promise<void> {
  // Detect if message is greeting/small talk
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo'];
  const isGreeting = greetings.some(greeting => message.toLowerCase().includes(greeting));

  if (isGreeting) {
    const greetingResponses = [
      `Hey there! 👋\n\nI'm your Glyde Systems AI assistant. I can help you with:\n\n✅ Create invoices\n✅ Manage clients\n✅ Track routes & drivers\n✅ Check wallet balance\n\nWhat would you like to do today?`,
      `Hello! 😊\n\nGreat to hear from you! I'm here to help manage your transport business.\n\nType "HELP" to see everything I can do, or just tell me what you need!`,
      `Hi! 🚚\n\nReady to help with your logistics needs!\n\nSome quick options:\n• Create invoice\n• List routes\n• Check balance\n\nWhat's on your mind?`
    ];

    const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: response
    });
    return;
  }

  // Handle general chitchat / off-topic
  const chitchatKeywords = ['how are you', 'what\'s up', 'weather', 'football', 'politics', 'joke', 'story'];
  const isChitchat = chitchatKeywords.some(keyword => message.toLowerCase().includes(keyword));

  if (isChitchat || confidence < 0.3) {
    const outOfScopeResponses = [
      `I appreciate the chat! 😊 But I'm focused on helping with your transport business.\n\nI can help with:\n• Invoices & payments\n• Route tracking\n• Driver management\n• Client records\n\nWhat business task can I assist with?`,
      `Haha, I'd love to chat about that! 😄 But I'm specifically built for logistics management.\n\nLet me help you with something business-related:\n• Create an invoice?\n• Check your wallet?\n• Track a route?\n\nWhat do you need?`,
      `That's interesting! 🤔 But I'm best at handling transport & logistics tasks.\n\nTry asking me to:\n• "Create invoice for XYZ"\n• "Show my routes"\n• "List clients"\n\nOr type "HELP" for all options!`
    ];

    const response = outOfScopeResponses[Math.floor(Math.random() * outOfScopeResponses.length)];
    await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
      type: 'text',
      text: response
    });
    return;
  }

  // Handle unclear business requests
  const clarificationResponses = [
    `Hmm, I'm not quite sure what you mean. 🤔\n\nCould you rephrase that? Or here are some things I can do:\n\n✅ "Create invoice for ABC Ltd"\n✅ "Show my drivers"\n✅ "What's my balance"\n\nType "HELP" for the full menu!`,
    `I didn't quite catch that. 😅\n\nTry being more specific, like:\n• "List my clients"\n• "Create professional invoice"\n• "Show active routes"\n\nOr type "HELP" to see all commands!`,
    `Sorry, I'm not sure how to help with that. 🤷‍♂️\n\nI'm great at:\n📄 Managing invoices\n🚚 Tracking routes\n👥 Client records\n💰 Wallet & payments\n\nWhat would you like to do?`
  ];

  const response = clarificationResponses[Math.floor(Math.random() * clarificationResponses.length)];
  await sendWhatsAppMessage(whatsappNumber, phoneNumberId, {
    type: 'text',
    text: response
  });
}

/**
 * Store error for retry context
 */
export async function storeError(
  whatsappNumber: string,
  errorMessage: string,
  intent?: Intent
): Promise<void> {
  try {
    await updateConversationState(whatsappNumber, {
      lastError: errorMessage,
      lastIntent: intent
    });
  } catch (error: any) {
    functions.logger.error('Error storing error context', {
      error: error.message
    });
  }
}

/**
 * Clear conversation state (reset)
 */
export async function clearConversationState(whatsappNumber: string): Promise<void> {
  try {
    await updateConversationState(whatsappNumber, {
      awaitingConfirmation: false,
      awaitingInput: null,
      conversationData: {},
      lastError: undefined,
      retryCount: 0
    });
  } catch (error: any) {
    functions.logger.error('Error clearing conversation state', {
      error: error.message
    });
  }
}

/**
 * Handle invoice confirmation after preview
 * Detects yes/no/edit/send responses
 */
export async function handleInvoiceConfirmation(
  message: string,
  conversationState: ConversationState,
  phoneNumberId: string,
  whatsappNumber: string
): Promise<{ handled: boolean; action?: 'confirm' | 'send' | 'edit' | 'cancel'; editInstructions?: string }> {
  if (!conversationState || conversationState.awaitingInput !== 'invoice_confirmation') {
    return { handled: false };
  }

  const lowerMessage = message.toLowerCase().trim();

  // Confirmation patterns (Yes, looks good, perfect, etc.)
  const confirmPatterns = [
    /^(yes|yeah|yep|yup|ok|okay|confirm|correct|good|fine)$/i,
    /^(looks?\s*(good|great|perfect|fine|ok|okay))$/i,
    /^(that\'?s?\s*(good|great|perfect|fine|correct))$/i,
    /^(perfect|excellent|nice|approved?)$/i
  ];

  for (const pattern of confirmPatterns) {
    if (pattern.test(lowerMessage)) {
      return { handled: true, action: 'confirm' };
    }
  }

  // Send patterns (Send it, send to client, etc.)
  const sendPatterns = [
    /^send(\s*(it|invoice|now))?$/i,
    /^(send|email)\s*to\s*client$/i,
    /^(deliver|submit)(\s*it)?$/i
  ];

  for (const pattern of sendPatterns) {
    if (pattern.test(lowerMessage)) {
      return { handled: true, action: 'send' };
    }
  }

  // Cancel patterns
  const cancelPatterns = [
    /^(cancel|delete|discard|nevermind|never\s*mind|no\s*thanks?)$/i
  ];

  for (const pattern of cancelPatterns) {
    if (pattern.test(lowerMessage)) {
      return { handled: true, action: 'cancel' };
    }
  }

  // Edit patterns
  const editPatterns = [
    /^edit/i,
    /^change/i,
    /^update/i,
    /^modify/i,
    /^fix/i,
    /^correct/i
  ];

  for (const pattern of editPatterns) {
    if (pattern.test(lowerMessage)) {
      return {
        handled: true,
        action: 'edit',
        editInstructions: message  // Pass full message for AI to parse
      };
    }
  }

  // If message contains "no" or "not good", treat as edit request
  if (/^no$/i.test(lowerMessage) || /not\s*(good|right|correct)/i.test(lowerMessage)) {
    return {
      handled: true,
      action: 'edit',
      editInstructions: 'User wants to make changes'
    };
  }

  return { handled: false };
}

/**
 * Detect contextual commands that reference recent actions
 * e.g., "preview", "show invoice", "send it" after creating an invoice
 */
export function detectContextualCommand(
  message: string,
  conversationState: ConversationState | null
): { isContextual: boolean; intent?: Intent; invoiceNumber?: string; clientName?: string } {
  if (!conversationState) {
    return { isContextual: false };
  }

  const lowerMessage = message.toLowerCase().trim();

  // Preview commands (case-insensitive, flexible)
  const previewPatterns = [
    /^(show|preview|see|view|display)\s*(invoice|it|that)?$/i,
    /^(show|preview|see|view|display)\s*(the|my)?\s*invoice$/i,
    /^invoice\s*(preview|view)?$/i,
    /^(let me see|lemme see|show me)(\s*it)?$/i,
    /^preview$/i,
    /^show$/i
  ];

  for (const pattern of previewPatterns) {
    if (pattern.test(lowerMessage)) {
      if (conversationState.lastInvoiceNumber) {
        return {
          isContextual: true,
          intent: Intent.PREVIEW_INVOICE,
          invoiceNumber: conversationState.lastInvoiceNumber
        };
      }
    }
  }

  // Send commands (case-insensitive, flexible)
  const sendPatterns = [
    /^(send|email|deliver)\s*(invoice|it|that)?$/i,
    /^(send|email|deliver)\s*(the|my)?\s*invoice$/i,
    /^send\s*to\s*client$/i,
    /^(send it|email it)$/i
  ];

  for (const pattern of sendPatterns) {
    if (pattern.test(lowerMessage)) {
      if (conversationState.lastInvoiceNumber) {
        return {
          isContextual: true,
          intent: Intent.SEND_INVOICE,
          invoiceNumber: conversationState.lastInvoiceNumber
        };
      }
    }
  }

  // Create another invoice for same client
  const anotherInvoicePatterns = [
    /^(another|one more|create another)(\s*invoice)?(\s*for\s*them)?$/i,
    /^(same client|for them again)$/i,
    /^again$/i
  ];

  for (const pattern of anotherInvoicePatterns) {
    if (pattern.test(lowerMessage)) {
      if (conversationState.lastClientName) {
        return {
          isContextual: true,
          intent: Intent.CREATE_INVOICE,
          clientName: conversationState.lastClientName
        };
      }
    }
  }

  return { isContextual: false };
}

/**
 * Detect compliments and appreciation in user messages
 */
export function detectCompliment(message: string): {
  isCompliment: boolean;
  language: 'english' | 'pidgin' | 'hausa' | 'igbo' | 'yoruba' | null;
  enthusiasmLevel: 'low' | 'medium' | 'high';
} {
  const lowerMessage = message.toLowerCase().trim();

  // English compliments
  const englishCompliments = [
    /^(thanks?|thank you|tysm|thx)(\s+so\s+much)?[!.]*$/i,
    /^(you\'?re?\s*)?(great|awesome|amazing|excellent|brilliant|fantastic|wonderful|perfect|good job|well done|nice|cool)[!.]*$/i,
    /^(i\s*)?(appreciate|love)\s*(it|this|that|you)[!.]*$/i,
    /^good\s*work[!.]*$/i,
    /^impressive[!.]*$/i,
    /^(exactly|perfect|spot on)[!.]*$/i
  ];

  // Nigerian Pidgin compliments
  const pidginCompliments = [
    /^(abeg|thank you|tanks|tenks)(\s+o)?[!.]*$/i,
    /^(na\s*wa|e\s*choke|correct|sharp|you\s*try|well\s*done)[!.]*$/i,
    /^(i\s*dey\s*feel|i\s*like)\s*am[!.]*$/i,
    /^(you\s*too\s*much|you\s*good)[!.]*$/i,
    /^(e\s*sweet\s*me|e\s*enter)[!.]*$/i
  ];

  // Hausa compliments
  const hausaCompliments = [
    /^(na\s*gode|madalla|kai|wallahi)[!.]*$/i,
    /^(ka\s*yi\s*kyau)[!.]*$/i
  ];

  // Igbo compliments
  const igboCompliments = [
    /^(daalụ|imeela|ndewo)[!.]*$/i,
    /^(ọ\s*maka|ezigbo)[!.]*$/i
  ];

  // Yoruba compliments
  const yorubaCompliments = [
    /^(e\s*se|o\s*dabo|a\s*dupe)[!.]*$/i,
    /^(o\s*dara)[!.]*$/i
  ];

  // Determine enthusiasm by exclamation marks and caps
  const exclamationCount = (message.match(/!/g) || []).length;
  const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
  let enthusiasmLevel: 'low' | 'medium' | 'high' = 'low';

  if (exclamationCount >= 2 || capsRatio > 0.5) {
    enthusiasmLevel = 'high';
  } else if (exclamationCount >= 1 || capsRatio > 0.2) {
    enthusiasmLevel = 'medium';
  }

  // Check each language
  for (const pattern of englishCompliments) {
    if (pattern.test(lowerMessage)) {
      return { isCompliment: true, language: 'english', enthusiasmLevel };
    }
  }

  for (const pattern of pidginCompliments) {
    if (pattern.test(lowerMessage)) {
      return { isCompliment: true, language: 'pidgin', enthusiasmLevel };
    }
  }

  for (const pattern of hausaCompliments) {
    if (pattern.test(lowerMessage)) {
      return { isCompliment: true, language: 'hausa', enthusiasmLevel };
    }
  }

  for (const pattern of igboCompliments) {
    if (pattern.test(lowerMessage)) {
      return { isCompliment: true, language: 'igbo', enthusiasmLevel };
    }
  }

  for (const pattern of yorubaCompliments) {
    if (pattern.test(lowerMessage)) {
      return { isCompliment: true, language: 'yoruba', enthusiasmLevel };
    }
  }

  return { isCompliment: false, language: null, enthusiasmLevel: 'low' };
}

/**
 * Generate natural response to compliment
 */
export function generateComplimentResponse(
  language: 'english' | 'pidgin' | 'hausa' | 'igbo' | 'yoruba' | null,
  enthusiasmLevel: 'low' | 'medium' | 'high'
): string {
  const responses = {
    english: {
      low: [
        "You're welcome! Happy to help. 😊",
        "Glad I could help! Let me know if you need anything else.",
        "My pleasure! What else can I do for you?"
      ],
      medium: [
        "Thank you! I'm here whenever you need me! 🙌",
        "Appreciate that! Always happy to help! 😄",
        "You're too kind! Let's keep getting things done! 💪"
      ],
      high: [
        "WOW, thank you so much! That means a lot! 🤩🎉",
        "You just made my day! Let's keep crushing it! 🚀✨",
        "SO GLAD you're happy! I'm always here for you! 💯🔥"
      ]
    },
    pidgin: {
      low: [
        "No wahala! I dey for you. 😊",
        "E don do! Anytime you need me, just shout.",
        "My pleasure! Wetin else I fit do?"
      ],
      medium: [
        "Thank you o! I dey kampe for you! 🙌",
        "You too much! I dey always available! 😄",
        "E choke! Make we continue to dey work together! 💪"
      ],
      high: [
        "CHAI! You don make my day! 🤩🎉",
        "E SWEET ME DIE! Make we continue like this! 🚀✨",
        "YOU TOO GOOD! I go always dey for you! 💯🔥"
      ]
    },
    hausa: {
      low: [
        "Madalla! Na taimake ku. 😊",
        "Ba komai! Koyaushe ina nan.",
        "Na gode! Me zan iya yi?"
      ],
      medium: [
        "Na gode sosai! Ina nan kullum! 🙌",
        "Allah ya saka! Ina farin ciki! 😄",
        "Kai! Mu ci gaba da aiki! 💪"
      ],
      high: [
        "WALLAHI! Ka faranta mini rai! 🤩🎉",
        "KA YI KYAU SOSAI! Mu ci gaba! 🚀✨",
        "MADALLA! Ina tare da kai! 💯🔥"
      ]
    },
    igbo: {
      low: [
        "Daalụ! M nọ ebe a. 😊",
        "Ọ dị mma! Kpọọ m mgbe ọ bụla.",
        "Ezigbo! Gịnị ka m ga-eme?"
      ],
      medium: [
        "Daalụ nke ukwuu! M nọ mgbe niile! 🙌",
        "Ọ na-atọ m ụtọ! Anọ m ebe a! 😄",
        "Ọ maka! Ka anyị gaa n'ihu! 💪"
      ],
      high: [
        "CHINEKE! I mere m obi ụtọ! 🤩🎉",
        "Ọ MARA MMA NKE UKWUU! Ka anyị gaa n'ihu! 🚀✨",
        "EZIGBO! M nọnyere gị mgbe niile! 💯🔥"
      ]
    },
    yoruba: {
      low: [
        "E se! Mo wa nibi. 😊",
        "O dara! Pe mi nigbakugba.",
        "O dara! Kini mo le se?"
      ],
      medium: [
        "E se pupo! Mo wa nigbagbogbo! 🙌",
        "O wu mi lori! Mo wa fun e! 😄",
        "O dara! Je ka tesiwaju! 💪"
      ],
      high: [
        "OLORUN! O mu mi dun! 🤩🎉",
        "O DARA PUPỌ! Je ka tesiwaju! 🚀✨",
        "O DARA GAN! Mo wa pelu re! 💯🔥"
      ]
    }
  };

  const languageResponses = responses[language || 'english'];
  const levelResponses = languageResponses[enthusiasmLevel];

  // Random selection for variety
  return levelResponses[Math.floor(Math.random() * levelResponses.length)];
}
