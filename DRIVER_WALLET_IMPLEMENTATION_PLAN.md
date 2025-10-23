# Driver Portal Authentication & Wallet System Implementation Plan

## Overview
Transform the driver portal to use phone-based authentication with OTP verification and integrate Paystack for complete wallet management (inflow/outflow).

## Architecture Design

### Authentication Flow
```
1. Admin registers driver with phone number (Team Management)
   └─> Phone number stored in Firestore drivers collection

2. Driver logs in with phone number
   └─> System checks if number exists in drivers collection
   └─> Sends OTP via Termii SMS API
   └─> Driver enters OTP
   └─> Termii verifies OTP
   └─> Driver gains access to portal
```

### Wallet System Architecture
```
Driver Wallet
├── Paystack Virtual Account (for receiving money)
├── Wallet Balance (stored in Firestore)
├── Transaction History
├── Transfer Recipients (for sending money)
└── Transaction Limits & Security
```

## Phase 1: Driver Registration & Phone Authentication

### 1.1 Update Driver Registration (Team Management)
- **File**: `components/modals/AddDriverModal.tsx`
- Add required phone number field with validation
- Format: Nigerian phone numbers (+234 or 0XXX)
- Store phone number as unique identifier
- Remove username/password fields

### 1.2 Create Phone Number Validation Service
```typescript
// services/phoneValidation.ts
export const validateNigerianPhone = (phone: string): string => {
  // Remove spaces and special characters
  // Convert to international format +234
  // Validate carrier prefixes
}
```

### 1.3 Update Driver Type Definition
```typescript
// types.ts
interface Driver {
  // ... existing fields
  phone: string; // Required, unique
  phoneVerified: boolean;
  walletId?: string; // Paystack subaccount ID
  virtualAccountNumber?: string;
  virtualAccountBank?: string;
  walletBalance: number;
  isActive: boolean;
  lastLogin?: Date;
}
```

## Phase 2: Termii SMS OTP Integration

### 2.1 Set up Termii Service
```typescript
// services/termii/termiiService.ts
class TermiiService {
  private apiKey: string;
  private senderId: string;

  async sendOTP(phoneNumber: string): Promise<{pinId: string}> {
    // Send OTP request to Termii
  }

  async verifyOTP(pinId: string, otp: string): Promise<boolean> {
    // Verify OTP with Termii
  }
}
```

### 2.2 Environment Variables
```env
VITE_TERMII_API_KEY=your_termii_api_key
VITE_TERMII_SENDER_ID=TransportCo
```

### 2.3 Create OTP Flow Components
- `components/driver-portal/PhoneLoginScreen.tsx`
- `components/driver-portal/OTPVerificationScreen.tsx`

## Phase 3: Paystack Wallet Integration

### 3.1 Create Driver Subaccounts
```typescript
// services/paystack/driverWallet.ts
class DriverWalletService {
  // Create dedicated virtual account for each driver
  async createDriverSubaccount(driver: Driver) {
    // POST to Paystack Subaccount API
    // Returns: account_number, bank_name, subaccount_code
  }

  // Get wallet balance
  async getBalance(subaccountCode: string): Promise<number> {
    // Fetch from Paystack + local cache
  }
}
```

### 3.2 Implement Money Transfer Out
```typescript
// services/paystack/transfers.ts
class TransferService {
  // Create transfer recipient
  async createRecipient(bankDetails: BankAccount) {
    // Verify account with Paystack
    // Store recipient code
  }

  // Initiate transfer
  async transferFunds(
    driverWalletId: string,
    recipientCode: string,
    amount: number
  ) {
    // Deduct from wallet
    // Process transfer via Paystack
    // Record transaction
  }
}
```

### 3.3 Transaction Recording
```typescript
// Firestore structure
walletTransactions/
├── {transactionId}
    ├── driverId: string
    ├── type: 'credit' | 'debit'
    ├── amount: number
    ├── status: 'pending' | 'success' | 'failed'
    ├── reference: string
    ├── metadata: {
    │   ├── description: string
    │   ├── recipientName?: string
    │   ├── recipientBank?: string
    │   └── recipientAccount?: string
    └── timestamp: Date
```

## Phase 4: Driver Portal UI Updates

### 4.1 New Driver Portal Structure
```
DriverPortal/
├── Login (Phone Number)
├── OTP Verification
├── Dashboard
│   ├── Wallet Balance Card
│   ├── Quick Actions (Withdraw, Transaction History)
│   └── Recent Transactions
├── Wallet
│   ├── Balance & Virtual Account Details
│   ├── Withdraw Funds
│   ├── Transaction History
│   └── Bank Accounts (saved recipients)
└── Profile
    └── Security Settings
```

### 4.2 Components to Create
- `components/driver-portal/WalletCard.tsx`
- `components/driver-portal/TransactionHistory.tsx`
- `components/driver-portal/WithdrawFundsModal.tsx`
- `components/driver-portal/BankAccountManager.tsx`

## Phase 5: Security & Compliance

### 5.1 Security Measures
- Rate limiting on OTP requests (max 3 per hour)
- Transaction PIN for withdrawals
- Daily/monthly withdrawal limits
- IP-based fraud detection
- Session management with JWT

### 5.2 KYC Requirements
- BVN verification (optional)
- Government ID upload
- Selfie verification

### 5.3 Audit Trail
- Log all authentication attempts
- Record all transactions
- Track IP addresses and devices

## Implementation Timeline

### Week 1: Authentication System
- [ ] Update driver registration with phone numbers
- [ ] Implement Termii OTP service
- [ ] Create phone login flow
- [ ] Test OTP verification

### Week 2: Wallet Foundation
- [ ] Set up Paystack subaccounts
- [ ] Create wallet service
- [ ] Implement balance tracking
- [ ] Design wallet UI components

### Week 3: Money Transfer
- [ ] Implement withdrawal flow
- [ ] Add recipient management
- [ ] Create transaction history
- [ ] Test end-to-end transfers

### Week 4: Polish & Security
- [ ] Add security measures
- [ ] Implement rate limiting
- [ ] Create admin monitoring dashboard
- [ ] Comprehensive testing

## API Endpoints Required

### Termii API
- `POST /api/sms/otp/send` - Send OTP
- `POST /api/sms/otp/verify` - Verify OTP

### Paystack API
- `POST /subaccount` - Create driver subaccount
- `POST /transferrecipient` - Create transfer recipient
- `POST /transfer` - Initiate transfer
- `GET /balance` - Check balance

## Testing Strategy

### Unit Tests
- Phone number validation
- OTP generation/verification
- Wallet balance calculations
- Transaction processing

### Integration Tests
- Full authentication flow
- Money in/out flows
- Error handling
- Rate limiting

### User Acceptance Tests
- Driver onboarding
- Daily operations
- Edge cases (failed transfers, etc.)

## Rollout Strategy

1. **Pilot Phase** (5-10 drivers)
   - Test with selected drivers
   - Gather feedback
   - Fix issues

2. **Gradual Rollout** (25% → 50% → 100%)
   - Monitor system performance
   - Ensure support readiness
   - Document common issues

3. **Full Production**
   - All drivers on new system
   - Deprecate old authentication
   - Continuous monitoring

## Success Metrics

- Authentication success rate > 95%
- OTP delivery rate > 98%
- Transaction success rate > 99%
- Average login time < 30 seconds
- User satisfaction score > 4.5/5

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| SMS delivery failure | High | Implement Firebase Auth as backup |
| Paystack downtime | High | Queue transactions for retry |
| Phone number changes | Medium | Admin override capability |
| Fraud attempts | High | ML-based fraud detection |
| Network issues | Medium | Offline mode with sync |

## Support Documentation

### For Drivers
- How to login with phone number
- Managing your wallet
- Withdrawing funds
- Troubleshooting guide

### For Admins
- Driver onboarding process
- Monitoring transactions
- Handling disputes
- Security best practices

## Configuration Checklist

- [ ] Termii API credentials
- [ ] Paystack secret/public keys
- [ ] Firebase Auth setup
- [ ] Firestore security rules
- [ ] SMS templates approved
- [ ] Bank account for settlements
- [ ] Support team trained
- [ ] Documentation complete

## Next Steps

1. **Immediate Actions**
   - Get Termii API credentials
   - Set up Paystack test account
   - Create development environment

2. **Design Phase**
   - Create UI mockups
   - Review with stakeholders
   - Finalize user flows

3. **Development Phase**
   - Start with authentication
   - Build wallet foundation
   - Implement transfers
   - Add security layers

4. **Testing & Deployment**
   - Internal testing
   - Pilot program
   - Production rollout