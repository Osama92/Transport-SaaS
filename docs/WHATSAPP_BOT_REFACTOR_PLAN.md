# WhatsApp Bot Refactor Plan - Clean Slate Approach

## Current Problems

1. **Too many files** - Scattered logic across 20+ files
2. **Multiple AI systems** - Amana, SupplyChainExpert, OpenAI integration (confusing)
3. **Unclear flow** - Hard to trace message → response
4. **Collection naming inconsistency** - whatsappUsers vs whatsapp_users
5. **No clear architecture** - Business logic mixed everywhere

## Recommended Architecture (Clean & Simple)

```
functions/src/whatsapp/
├── index.ts                    # Main webhook entry point
├── core/
│   ├── webhook.ts              # Webhook verification & routing
│   ├── messageHandler.ts       # Main message processor
│   └── responseBuilder.ts      # Format WhatsApp responses
├── ai/
│   ├── amana.ts               # Single AI brain (OpenAI)
│   └── prompts.ts             # All system prompts
├── features/
│   ├── invoices.ts            # Invoice creation
│   ├── routes.ts              # Route management
│   ├── drivers.ts             # Driver queries
│   ├── clients.ts             # Client management
│   └── wallet.ts              # Wallet operations
├── auth/
│   ├── userAuth.ts            # User registration & linking
│   └── orgResolver.ts         # Get organizationId from WhatsApp number
├── database/
│   ├── firestore.ts           # Firestore queries
│   └── schema.ts              # Database schema definitions
└── utils/
    ├── formatting.ts          # Nigerian formatting (₦, dates)
    ├── validation.ts          # Input validation
    └── logger.ts              # Structured logging
```

## New Message Flow (Simple)

```
1. WhatsApp → Webhook (index.ts)
   ↓
2. Verify signature & extract message (webhook.ts)
   ↓
3. Get user's organizationId (orgResolver.ts)
   ↓
4. Process message (messageHandler.ts)
   ↓
5. Amana decides action (amana.ts)
   ↓
6. Execute feature (features/*.ts)
   ↓
7. Format response (responseBuilder.ts)
   ↓
8. Send to WhatsApp
```

## Single AI System: Amana

**Delete these confusing files:**
- ❌ SupplyChainExpert.ts (1200+ lines of chaos)
- ❌ aiService.ts (duplicate AI logic)
- ❌ ConversationalIntelligence.ts (over-engineered)
- ❌ AmanaConversationalAI.ts (redundant)

**Keep ONE clean AI file:**
```typescript
// ai/amana.ts
export async function processWithAmana(
  message: string,
  organizationId: string,
  whatsappNumber: string
): Promise<string> {
  // 1. Determine intent
  const intent = await determineIntent(message);

  // 2. Execute action
  const result = await executeAction(intent, organizationId);

  // 3. Format Nigerian response
  return formatResponse(result);
}
```

## Database: One Collection Name

**Fix:**
- ✅ Always use `whatsapp_users` (snake_case)
- ✅ Always use `users` (not mix of user/users)
- ✅ Clear schema documentation

## Refactor Steps

### Phase 1: Core Foundation (Week 1)
```bash
1. Create new folder: functions/src/whatsapp-v2/
2. Build new webhook.ts (100 lines max)
3. Build messageHandler.ts (150 lines max)
4. Build orgResolver.ts (50 lines max)
5. Test with simple "hello" message
```

### Phase 2: AI Brain (Week 1)
```bash
1. Create amana.ts with OpenAI GPT-4
2. Define clear system prompt
3. Test intent detection
4. Add function calling for actions
```

### Phase 3: Features (Week 2)
```bash
1. Build invoices.ts (create invoice flow)
2. Build routes.ts (list/track routes)
3. Build drivers.ts (driver queries)
4. Build wallet.ts (balance check)
5. Test each feature independently
```

### Phase 4: Migration (Week 2)
```bash
1. Run old and new in parallel
2. Compare responses
3. Switch traffic to new system
4. Delete old code
```

## Simplified AI Prompts

### System Prompt (ONE clear prompt)
```
You are Amana, a trusted AI assistant for Nigerian transport companies.

Your job:
1. Understand what the user wants
2. Call the right function (create_invoice, list_routes, check_wallet, etc.)
3. Respond in friendly Nigerian English

Rules:
- Be concise (max 3 sentences)
- Use Nigerian Naira (₦) for money
- Always confirm before creating/modifying data
- If unsure, ask clarifying questions
```

### Function Definitions
```typescript
const functions = [
  {
    name: "create_invoice",
    description: "Create a new invoice for a client",
    parameters: {
      clientName: "string",
      items: "array",
      amount: "number"
    }
  },
  {
    name: "list_routes",
    description: "Show all routes or filter by status",
    parameters: {
      status: "pending | in-progress | completed"
    }
  },
  // ... etc
];
```

## Testing Strategy

### Unit Tests
```bash
# Test each file independently
npm test -- orgResolver.test.ts
npm test -- amana.test.ts
npm test -- invoices.test.ts
```

### Integration Tests
```bash
# Test full flow
npm test -- e2e/createInvoice.test.ts
npm test -- e2e/listRoutes.test.ts
```

### Manual Testing Checklist
```
□ Send "hello" → Get welcome message
□ Send "list routes" → Get route list
□ Send "create invoice" → Start invoice flow
□ Send "check balance" → Get wallet balance
□ Send gibberish → Get helpful error
□ Unregistered user → Get registration prompt
```

## File Size Limits

To keep code manageable:
- **Max 200 lines per file** (except database schemas)
- **Max 50 lines per function**
- **If longer, split into smaller files**

## Documentation Requirements

Each file must have:
```typescript
/**
 * File: invoices.ts
 * Purpose: Handle invoice creation via WhatsApp
 *
 * Flow:
 * 1. User requests invoice
 * 2. Amana extracts client/items/amount
 * 3. Validate data
 * 4. Create in Firestore
 * 5. Send confirmation
 *
 * Dependencies:
 * - firestore.ts (database)
 * - formatting.ts (₦ formatting)
 */
```

## Success Criteria

After refactor:
1. ✅ Any developer can understand the flow in 5 minutes
2. ✅ Adding new feature = create one new file
3. ✅ Bug in invoices? Only check invoices.ts
4. ✅ All responses < 2 seconds
5. ✅ 100% test coverage on critical paths

## Migration Timeline

- **Week 1**: Build foundation + AI brain
- **Week 2**: Build features + testing
- **Week 3**: Parallel run + monitoring
- **Week 4**: Full cutover + delete old code

## Current Complexity vs Target

| Metric | Current | Target |
|--------|---------|--------|
| Total files | 35+ | 15 |
| Lines of code | 8000+ | 2000 |
| AI systems | 3 | 1 |
| Entry points | Multiple | 1 |
| Test coverage | 0% | 80% |

## Decision: Keep or Rewrite?

**My Recommendation: REWRITE from scratch**

Why?
1. Current code has too much technical debt
2. Faster to rebuild clean than fix mess
3. You'll understand 100% of the new code
4. Future modifications will be easy
5. Better performance & reliability

**Timeline:**
- Old system: Keep running (don't break production)
- New system: Build in parallel (whatsapp-v2/)
- Switch: One-time cutover when ready
- Cleanup: Delete old code after 1 week of success

## Next Steps

Do you want me to:
1. **Start the refactor now** - Build whatsapp-v2/ from scratch?
2. **Document current system first** - Map out what exists?
3. **Quick wins** - Fix critical bugs in current system first?

Let me know and I'll execute!
