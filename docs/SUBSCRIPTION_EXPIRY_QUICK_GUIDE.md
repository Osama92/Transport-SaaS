# Subscription Expiry Handling - Quick Guide

## Configuration

- **Trial Period:** 10 days (matching web)
- **Grace Period:** 3 days (recommended)
- **Role:** Partner only
- **PIN Required For:** Payroll, Wallet, Payments only

---

## Timeline

```
Day 1-7:  Silent trial (no reminders)
Day 8:    First reminder (2 days left)
Day 9:    Second reminder (1 day left)
Day 10:   Final reminder (expires at 11:59 PM)

TRIAL EXPIRES

Day 11-13: Grace period (full access + warnings)
Day 14:    Limited access mode

OR USER SUBSCRIBES → Full access continues
```

---

## After Trial Ends (3 Strategies)

### Strategy A: Immediate Limited Access (Strict) ❌
```
Day 10 11:59 PM → Immediate lockdown
Pro: Strong motivation to pay
Con: Users may abandon platform
```

### Strategy B: 3-Day Grace Period (Recommended) ✅
```
Day 10 11:59 PM → Trial expired message
Day 11-13 → Full access + daily warnings
Day 14 → Limited access mode

Pro: Gives users time to pay
Pro: Reduces churn
Pro: Industry standard
Con: 13 days free instead of 10
```

### Strategy C: Soft Landing (User-Friendly) ⚡
```
Day 10 11:59 PM → Trial expired
Day 11+ → Gradually restrict features:
  - Day 11: Can't create NEW routes (existing work)
  - Day 12: Can't add drivers/vehicles
  - Day 13: Can't process payroll
  - Day 14: Read-only mode

Pro: Very user-friendly
Pro: Users can finish active work
Con: Complex to implement
```

---

## Recommendation: Strategy B (3-Day Grace)

**Why?**
1. ✅ Industry standard (Spotify, Netflix do this)
2. ✅ Captures "forgot to pay" users
3. ✅ Allows payment processing time (bank transfers)
4. ✅ Maintains good user experience
5. ✅ Simple to implement

**Limited Access Mode** (After grace period):
- ✅ View drivers, vehicles, routes
- ✅ Check wallet balance
- ✅ Download invoices/payslips
- ❌ Create routes
- ❌ Add/edit drivers/vehicles
- ❌ Process payroll
- ❌ Generate new invoices

---

## Subscription Payment Options

### Option 1: Paystack (Instant) ✅
```
User clicks payment link
→ Paystack checkout (card/bank/USSD)
→ Payment webhook
→ Auto-activation
→ WhatsApp confirmation

Time: < 1 minute
```

### Option 2: Bank Transfer (Manual)
```
User gets account details
→ Makes transfer
→ Sends screenshot
→ Admin verifies (1-2 hours)
→ Manual activation
→ WhatsApp confirmation

Time: 1-24 hours
```

**Recommendation:** Support both, promote Paystack

---

## Auto-Renewal Behavior

### Default: Auto-Renewal ON ✅

**Why?**
- Industry standard
- Reduces churn
- Better revenue predictability
- User can cancel anytime

### Renewal Process:
```
3 days before renewal:
→ "Your subscription renews in 3 days for ₦30,000"

1 day before:
→ "Renewal tomorrow. Reply 'CANCEL' to stop"

Renewal day:
→ Charge card via Paystack
→ Success → "Renewed! Next billing: [date]"
→ Failed → "Payment failed. Update card to avoid interruption"

After 3 failed attempts:
→ Cancel subscription
→ Grace period starts
```

---

## Failed Payment Handling

### Retry Schedule:
1. Day 1: Immediate charge (renewal day)
2. Day 2: Retry #1 (24 hours later)
3. Day 4: Retry #2 (48 hours later)
4. Day 7: Retry #3 (72 hours later - final)

### After 3 Failures:
```
→ Cancel subscription
→ Send notification: "Payment failed 3 times. Update card or pay manually"
→ Start 3-day grace period
→ Then limited access
```

---

## User Commands (WhatsApp)

| Command | Action |
|---------|--------|
| `subscription` | Show plan details & status |
| `upgrade` | Switch monthly → annual |
| `pay` | Start payment flow |
| `cancel` | Cancel auto-renewal |
| `reactivate` | Resubscribe after cancellation |
| `receipt` | Download latest receipt |
| `help` | Contact support |

---

## Implementation Checklist

### Database
- [x] Schema types created
- [ ] Firestore security rules
- [ ] Indexes for queries

### Cloud Functions
- [ ] Trial expiry checker (daily cron)
- [ ] Renewal checker (daily cron)
- [ ] Paystack webhook handler
- [ ] Bank transfer verifier (manual)

### WhatsApp Messages
- [ ] Trial reminder templates (Day 8, 9, 10)
- [ ] Grace period warnings
- [ ] Payment instructions
- [ ] Success/failure messages
- [ ] Limited access mode message

### Testing
- [ ] Complete payment flow (Paystack)
- [ ] Bank transfer flow
- [ ] Grace period behavior
- [ ] Limited access restrictions
- [ ] Auto-renewal
- [ ] Failed payment retry

---

## Questions Answered

**Q: Grace period - yes or no?**
**A:** YES - 3 days. Standard practice, reduces churn.

**Q: Payment methods?**
**A:** Paystack (instant) + Bank Transfer (manual verification)

**Q: Auto-renewal default?**
**A:** ON by default. User can cancel anytime via WhatsApp.

**Q: Failed payment retry?**
**A:** 3 attempts over 7 days, then cancel → grace period → limited access

---

## Next Steps

1. ✅ Create database schema (DONE)
2. ⏳ Build WhatsApp webhook
3. ⏳ Implement onboarding flow
4. ⏳ Create payment handlers
5. ⏳ Build cron jobs for expiry/renewal
6. ⏳ Test complete flow

Ready to continue building! 🚀