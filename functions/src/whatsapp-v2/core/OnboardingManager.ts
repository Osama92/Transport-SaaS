/**
 * WhatsApp V2 - Onboarding Manager
 *
 * Handles the complete onboarding flow for new WhatsApp users
 * Based on Xara-inspired UI with WhatsApp interactive forms
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Timestamp } from 'firebase-admin/firestore';
import { sendWhatsAppMessage, sendInteractiveMessage } from '../utils/whatsappApi';
import type { OnboardingSession, OnboardingStep } from '../types/schema';
import * as bcrypt from 'bcrypt';

const db = admin.firestore();

// Nigerian states for dropdown
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
];

export class OnboardingManager {
  /**
   * Start onboarding for a new user
   */
  static async startOnboarding(phoneNumber: string, phoneNumberId: string): Promise<void> {
    functions.logger.info('[ONBOARDING] Starting onboarding', { phoneNumber });

    // Check if user already has an active session
    const existingSession = await this.getSession(phoneNumber);
    if (existingSession && !existingSession.completed) {
      // Resume existing session
      await this.resumeOnboarding(phoneNumber, phoneNumberId, existingSession);
      return;
    }

    // Create new onboarding session
    const session: OnboardingSession = {
      phoneNumber,
      step: 'initial',
      data: {},
      startedAt: Timestamp.now(),
      currentStepStartedAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000), // 1 hour
      completed: false,
    };

    await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).set(session);

    // Send welcome message with "Complete Onboarding" button
    await this.sendWelcomeMessage(phoneNumber, phoneNumberId);
  }

  /**
   * Resume incomplete onboarding
   */
  static async resumeOnboarding(
    phoneNumber: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    functions.logger.info('[ONBOARDING] Resuming onboarding', {
      phoneNumber,
      currentStep: session.step,
    });

    const message = `Welcome back! 👋\n\nLet's continue your registration.\n\nYou were at: ${this.getStepName(session.step)}`;

    await sendWhatsAppMessage(phoneNumber, message, phoneNumberId);

    // Continue from current step
    await this.processStep(phoneNumber, phoneNumberId, session);
  }

  /**
   * Send welcome message
   */
  private static async sendWelcomeMessage(
    phoneNumber: string,
    phoneNumberId: string
  ): Promise<void> {
    const message = `Hey! 👋 Welcome to Amana!

I'm your AI assistant for managing transport logistics in Nigeria.

Before we dive in, please complete the onboarding! Once you're set up, I can help with:

🚚 Managing drivers & vehicles
📍 Creating & tracking routes
💰 Processing payroll
📄 Generating invoices
📊 Analytics & reports

Let's get started!`;

    await sendInteractiveMessage(phoneNumber, {
      type: 'button',
      body: { text: message },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'start_onboarding',
              title: '✅ Complete Onboarding',
            },
          },
        ],
      },
    }, phoneNumberId);
  }

  /**
   * Handle user response during onboarding
   */
  static async handleResponse(
    phoneNumber: string,
    message: string,
    phoneNumberId: string,
    buttonId?: string
  ): Promise<void> {
    const session = await this.getSession(phoneNumber);

    if (!session) {
      functions.logger.warn('[ONBOARDING] No session found', { phoneNumber });
      await this.startOnboarding(phoneNumber, phoneNumberId);
      return;
    }

    // Check if session expired
    if (session.expiresAt.toMillis() < Date.now()) {
      await sendWhatsAppMessage(
        phoneNumber,
        '⚠️ Your registration session expired. Let\'s start over!',
        phoneNumberId
      );
      await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).delete();
      await this.startOnboarding(phoneNumber, phoneNumberId);
      return;
    }

    // Handle button click
    if (buttonId === 'start_onboarding' || message.toLowerCase().trim() === 'complete onboarding') {
      await this.moveToStep(phoneNumber, phoneNumberId, 'personal_info', session);
      return;
    }

    // Process based on current step
    await this.processResponse(phoneNumber, message, phoneNumberId, session);
  }

  /**
   * Process user response based on current step
   */
  private static async processResponse(
    phoneNumber: string,
    message: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    functions.logger.info('[ONBOARDING] Processing response', {
      phoneNumber,
      step: session.step,
      message: message.substring(0, 100),
    });

    switch (session.step) {
      case 'personal_info':
        await this.handlePersonalInfo(phoneNumber, message, phoneNumberId, session);
        break;

      case 'company_info':
        await this.handleCompanyInfo(phoneNumber, message, phoneNumberId, session);
        break;

      case 'address':
        await this.handleAddress(phoneNumber, message, phoneNumberId, session);
        break;

      case 'terms':
        await this.handleTerms(phoneNumber, message, phoneNumberId, session);
        break;

      case 'pin':
        await this.handlePIN(phoneNumber, message, phoneNumberId, session);
        break;

      default:
        functions.logger.warn('[ONBOARDING] Unknown step', { step: session.step });
        break;
    }
  }

  /**
   * Move to next step
   */
  private static async moveToStep(
    phoneNumber: string,
    phoneNumberId: string,
    step: OnboardingStep,
    session: OnboardingSession
  ): Promise<void> {
    session.step = step;
    session.currentStepStartedAt = Timestamp.now();

    await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).update({
      step,
      currentStepStartedAt: session.currentStepStartedAt,
    });

    await this.processStep(phoneNumber, phoneNumberId, session);
  }

  /**
   * Process current step (send form/message)
   */
  private static async processStep(
    phoneNumber: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    switch (session.step) {
      case 'personal_info':
        await this.sendPersonalInfoForm(phoneNumber, phoneNumberId);
        break;

      case 'company_info':
        await this.sendCompanyInfoForm(phoneNumber, phoneNumberId);
        break;

      case 'address':
        await this.sendAddressForm(phoneNumber, phoneNumberId);
        break;

      case 'terms':
        await this.sendTermsAndPrivacy(phoneNumber, phoneNumberId);
        break;

      case 'pin':
        await this.sendPINSetup(phoneNumber, phoneNumberId, session);
        break;

      default:
        break;
    }
  }

  /**
   * Step 1: Personal Information
   */
  private static async sendPersonalInfoForm(
    phoneNumber: string,
    phoneNumberId: string
  ): Promise<void> {
    const message = `📝 Personal Information

Please reply with your details in this format:

First Name | Last Name

Example:
John | Doe

(Separate with | symbol)`;

    await sendWhatsAppMessage(phoneNumber, message, phoneNumberId);
  }

  private static async handlePersonalInfo(
    phoneNumber: string,
    message: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    // Parse "First Name | Last Name"
    const parts = message.split('|').map(p => p.trim());

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      await sendWhatsAppMessage(
        phoneNumber,
        '❌ Invalid format. Please use: FirstName | LastName\n\nExample: John | Doe',
        phoneNumberId
      );
      return;
    }

    const [firstName, lastName] = parts;

    // Validate names
    if (firstName.length < 2 || lastName.length < 2) {
      await sendWhatsAppMessage(
        phoneNumber,
        '❌ Names must be at least 2 characters long.',
        phoneNumberId
      );
      return;
    }

    // Save to session
    session.data.firstName = firstName;
    session.data.lastName = lastName;

    await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).update({
      'data.firstName': firstName,
      'data.lastName': lastName,
    });

    functions.logger.info('[ONBOARDING] Personal info saved', { phoneNumber, firstName, lastName });

    // Move to next step
    await this.moveToStep(phoneNumber, phoneNumberId, 'company_info', session);
  }

  /**
   * Step 2: Company Information
   */
  private static async sendCompanyInfoForm(
    phoneNumber: string,
    phoneNumberId: string
  ): Promise<void> {
    const message = `🏢 Company Information

Reply with your company details:

Company Name | Fleet Size

Fleet Size options:
1 = 1-5 vehicles
2 = 6-10 vehicles
3 = 11-20 vehicles
4 = 21-50 vehicles
5 = 50+ vehicles

Example:
ABC Transport Ltd | 2

(This means 6-10 vehicles)`;

    await sendWhatsAppMessage(phoneNumber, message, phoneNumberId);
  }

  private static async handleCompanyInfo(
    phoneNumber: string,
    message: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    const parts = message.split('|').map(p => p.trim());

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      await sendWhatsAppMessage(
        phoneNumber,
        '❌ Invalid format. Please use: Company Name | Fleet Size Number\n\nExample: ABC Transport | 2',
        phoneNumberId
      );
      return;
    }

    const [companyName, fleetSizeCode] = parts;

    // Map fleet size code to range
    const fleetSizeMap: Record<string, '1-5' | '6-10' | '11-20' | '21-50' | '50+'> = {
      '1': '1-5',
      '2': '6-10',
      '3': '11-20',
      '4': '21-50',
      '5': '50+',
    };

    const fleetSize = fleetSizeMap[fleetSizeCode];

    if (!fleetSize) {
      await sendWhatsAppMessage(
        phoneNumber,
        '❌ Invalid fleet size. Please use numbers 1-5.\n\n1=1-5 vehicles, 2=6-10, 3=11-20, 4=21-50, 5=50+',
        phoneNumberId
      );
      return;
    }

    // Save to session
    session.data.companyName = companyName;
    session.data.fleetSize = fleetSize;

    await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).update({
      'data.companyName': companyName,
      'data.fleetSize': fleetSize,
    });

    functions.logger.info('[ONBOARDING] Company info saved', { phoneNumber, companyName, fleetSize });

    // Move to next step
    await this.moveToStep(phoneNumber, phoneNumberId, 'address', session);
  }

  /**
   * Step 3: Business Address
   */
  private static async sendAddressForm(
    phoneNumber: string,
    phoneNumberId: string
  ): Promise<void> {
    const message = `📍 Business Address

Reply with your address:

Street Address | City | State

Example:
123 Main Street | Lagos | Lagos

Available states: ${NIGERIAN_STATES.slice(0, 5).join(', ')}... (and more)

Type your full address with | separating each part.`;

    await sendWhatsAppMessage(phoneNumber, message, phoneNumberId);
  }

  private static async handleAddress(
    phoneNumber: string,
    message: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    const parts = message.split('|').map(p => p.trim());

    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      await sendWhatsAppMessage(
        phoneNumber,
        '❌ Invalid format. Please use: Street | City | State\n\nExample: 123 Main St | Lagos | Lagos',
        phoneNumberId
      );
      return;
    }

    const [street, city, state] = parts;

    // Validate state
    const stateNormalized = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
    if (!NIGERIAN_STATES.includes(stateNormalized)) {
      await sendWhatsAppMessage(
        phoneNumber,
        `❌ Invalid state. Please use one of: ${NIGERIAN_STATES.join(', ')}`,
        phoneNumberId
      );
      return;
    }

    // Save to session
    session.data.street = street;
    session.data.city = city;
    session.data.state = stateNormalized;

    await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).update({
      'data.street': street,
      'data.city': city,
      'data.state': stateNormalized,
    });

    functions.logger.info('[ONBOARDING] Address saved', { phoneNumber, street, city, state: stateNormalized });

    // Move to next step
    await this.moveToStep(phoneNumber, phoneNumberId, 'terms', session);
  }

  /**
   * Step 4: Terms & Privacy
   */
  private static async sendTermsAndPrivacy(
    phoneNumber: string,
    phoneNumberId: string
  ): Promise<void> {
    const message = `📜 Terms & Privacy Policy

We'll share your data with authorized third parties and comply with relevant Nigerian laws and regulations.

Terms Summary:
Amana is an AI-powered transport management platform. To use the service, you must:
• Be at least 18 years old
• Be the owner of this WhatsApp number
• Provide accurate information
• Use service for lawful business only

We reserve the right to suspend or terminate access if you violate these terms.

Read full Terms: https://amana.ng/terms

By continuing you agree with our Terms of Service.`;

    await sendInteractiveMessage(phoneNumber, {
      type: 'button',
      body: { text: message },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'accept_terms',
              title: '✅ Accept & Continue',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'read_terms',
              title: '📖 Read Full Terms',
            },
          },
        ],
      },
    }, phoneNumberId);
  }

  private static async handleTerms(
    phoneNumber: string,
    message: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    const messageLower = message.toLowerCase().trim();

    if (messageLower === 'accept_terms' || messageLower.includes('accept') || messageLower === 'yes' || messageLower === '1') {
      // Accept terms
      session.data.termsAccepted = true;
      session.data.termsAcceptedAt = Timestamp.now();

      await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).update({
        'data.termsAccepted': true,
        'data.termsAcceptedAt': session.data.termsAcceptedAt,
      });

      functions.logger.info('[ONBOARDING] Terms accepted', { phoneNumber });

      // Move to PIN setup
      await this.moveToStep(phoneNumber, phoneNumberId, 'pin', session);
    } else if (messageLower === 'read_terms' || messageLower.includes('read')) {
      // Send link to full terms
      await sendWhatsAppMessage(
        phoneNumber,
        `Read our full Terms of Service here:\n\nhttps://amana.ng/terms\n\nWhen ready, type "ACCEPT" to continue.`,
        phoneNumberId
      );
    } else {
      await sendWhatsAppMessage(
        phoneNumber,
        '❌ Please type "ACCEPT" to continue or "READ" to view full terms.',
        phoneNumberId
      );
    }
  }

  /**
   * Step 5: PIN Setup
   */
  private static async sendPINSetup(
    phoneNumber: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    if (!session.data.pinHash) {
      // First time - ask for PIN
      const message = `🔐 Set Transaction PIN

Create a 4-digit PIN for approving:
• Payroll processing
• Wallet withdrawals
• Large payments

Reply with your 4-digit PIN (e.g., 1234)

⚠️ Keep this PIN secure!`;

      await sendWhatsAppMessage(phoneNumber, message, phoneNumberId);
    } else {
      // Confirmation step
      const message = `🔐 Confirm Your PIN

Please enter your 4-digit PIN again to confirm.`;

      await sendWhatsAppMessage(phoneNumber, message, phoneNumberId);
    }
  }

  private static async handlePIN(
    phoneNumber: string,
    message: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    const pin = message.trim();

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      await sendWhatsAppMessage(
        phoneNumber,
        '❌ Invalid PIN. Must be exactly 4 digits (e.g., 1234).',
        phoneNumberId
      );
      return;
    }

    if (!session.data.pinHash) {
      // First PIN entry - hash and store temporarily
      const pinHash = await bcrypt.hash(pin, 10);
      session.data.pinHash = pinHash;

      await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).update({
        'data.pinHash': pinHash,
      });

      functions.logger.info('[ONBOARDING] PIN set (first entry)', { phoneNumber });

      // Ask for confirmation
      await sendWhatsAppMessage(
        phoneNumber,
        '✅ PIN set!\n\nPlease enter your PIN again to confirm.',
        phoneNumberId
      );
    } else {
      // Confirmation - verify match
      const match = await bcrypt.compare(pin, session.data.pinHash);

      if (!match) {
        // PINs don't match - reset and start over
        await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).update({
          'data.pinHash': admin.firestore.FieldValue.delete(),
        });

        await sendWhatsAppMessage(
          phoneNumber,
          '❌ PINs don\'t match. Let\'s try again.\n\nEnter your 4-digit PIN:',
          phoneNumberId
        );
        return;
      }

      // PINs match - complete onboarding!
      functions.logger.info('[ONBOARDING] PIN confirmed', { phoneNumber });
      await this.completeOnboarding(phoneNumber, phoneNumberId, session);
    }
  }

  /**
   * Complete onboarding and create account
   */
  private static async completeOnboarding(
    phoneNumber: string,
    phoneNumberId: string,
    session: OnboardingSession
  ): Promise<void> {
    functions.logger.info('[ONBOARDING] Completing onboarding', { phoneNumber });

    try {
      const { firstName, lastName, companyName, fleetSize, street, city, state, pinHash } = session.data;

      // Generate email from phone (e.g., +2348012345678@amana.ng)
      const email = `${phoneNumber}@amana.ng`;

      // Generate random password
      const password = this.generatePassword();

      // 1. Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        phoneNumber, // Firebase Auth phone field
      });

      // 2. Create organization
      const orgRef = await db.collection('organizations').add({
        name: companyName,
        ownerId: userRecord.uid,
        address: {
          street,
          city,
          state,
        },
        fleetSize,
        subscription: {
          plan: 'trial',
          status: 'trial',
          trialStartDate: admin.firestore.FieldValue.serverTimestamp(),
          trialEndsAt: Timestamp.fromMillis(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
          autoRenew: true,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdVia: 'whatsapp',
      });

      const organizationId = orgRef.id;

      // 3. Create user profile
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        displayName: `${firstName} ${lastName}`,
        phone: phoneNumber,
        organizationId,
        role: 'partner',
        whatsappLinked: true,
        whatsappOptIn: true,
        registrationSource: 'whatsapp',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. Create WhatsApp user link
      await db.collection('whatsapp_users').doc(phoneNumber).set({
        phoneNumber,
        userId: userRecord.uid,
        organizationId,
        role: 'partner',
        displayName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        pinHash: pinHash!,
        requirePinForAll: false, // Only for payroll/wallet/payments
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        registrationMethod: 'whatsapp',
        onboardingCompleted: true,
        termsAcceptedAt: session.data.termsAcceptedAt,
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
        preferences: {
          language: 'en',
          notifications: true,
        },
      });

      // 5. Mark session as complete
      await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).update({
        completed: true,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 6. Send welcome message
      await this.sendWelcomeCompleteMessage(
        phoneNumber,
        phoneNumberId,
        firstName!,
        companyName!,
        fleetSize!,
        email,
        password
      );

      // 7. TODO: Send SMS with password
      // await sendSMS(phoneNumber, `Your Amana password: ${password}`);

      functions.logger.info('[ONBOARDING] Onboarding completed successfully', {
        phoneNumber,
        userId: userRecord.uid,
        organizationId,
      });
    } catch (error: any) {
      functions.logger.error('[ONBOARDING] Failed to complete onboarding', {
        phoneNumber,
        error: error.message,
        stack: error.stack,
      });

      await sendWhatsAppMessage(
        phoneNumber,
        '❌ Sorry, there was an error creating your account. Please try again or contact support.',
        phoneNumberId
      );
    }
  }

  /**
   * Send welcome message after successful registration
   */
  private static async sendWelcomeCompleteMessage(
    phoneNumber: string,
    phoneNumberId: string,
    firstName: string,
    companyName: string,
    fleetSize: string,
    email: string,
    password: string
  ): Promise<void> {
    const trialEndDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString();

    const message = `✅ Account Setup Complete!

Hey! 👋 Welcome, ${firstName}!

I'm Amana, your Fleet Management AI from Amana Technologies.

I can help with:
• Managing drivers & vehicles 🚚
• Creating & tracking routes 📍
• Processing payroll 💰
• Generating invoices 📄
• Analyzing performance 📊

For security, please lock your WhatsApp. 🔒

---

YOUR ACCOUNT DETAILS:

👤 Name: ${firstName}
🏢 Company: ${companyName}
📱 Phone: ${phoneNumber}
🚚 Fleet: ${fleetSize} vehicles

💰 WALLET BALANCE: ₦0.00

⭐ FREE TRIAL: 10 days (ends ${trialEndDate})

---

WEB DASHBOARD ACCESS:
🌐 https://amana.ng
📧 Email: ${email}
🔑 Password: ${password}

(Password also sent via SMS)

---

QUICK START GUIDE:

What would you like to do first?`;

    await sendInteractiveMessage(phoneNumber, {
      type: 'button',
      body: { text: message },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'add_driver',
              title: '🚗 Add Driver',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'add_vehicle',
              title: '🚚 Add Vehicle',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'help',
              title: '❓ Help',
            },
          },
        ],
      },
    }, phoneNumberId);
  }

  /**
   * Get onboarding session
   */
  private static async getSession(phoneNumber: string): Promise<OnboardingSession | null> {
    const doc = await db.collection('whatsapp_onboarding_sessions').doc(phoneNumber).get();
    return doc.exists ? (doc.data() as OnboardingSession) : null;
  }

  /**
   * Generate random password
   */
  private static generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Get user-friendly step name
   */
  private static getStepName(step: OnboardingStep): string {
    const names: Record<OnboardingStep, string> = {
      initial: 'Welcome',
      personal_info: 'Personal Information',
      company_info: 'Company Details',
      address: 'Business Address',
      terms: 'Terms & Privacy',
      pin: 'PIN Setup',
      complete: 'Completed',
    };
    return names[step] || step;
  }
}
