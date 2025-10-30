# Transport SaaS - Amana Platform

Nigerian transport and logistics management platform with AI-powered WhatsApp assistant.

## Quick Start

```bash
# Install dependencies
npm install
cd functions && npm install

# Start development server
npm run dev

# Deploy to Firebase
firebase deploy
```

## Documentation

- **[Git Workflow](docs/GIT_WORKFLOW.md)** - Branching strategy and daily workflow
- **[WhatsApp Bot Refactor](docs/WHATSAPP_BOT_REFACTOR_PLAN.md)** - Architecture and improvement plan
- **[Firestore Setup](docs/FIRESTORE_SETUP.md)** - Database configuration
- **[Payroll System](docs/PAYROLL_SYSTEM_GUIDE.md)** - Nigerian PAYE implementation

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Firebase Cloud Functions
- **Database**: Cloud Firestore
- **AI**: OpenAI GPT-4 (Amana assistant)
- **Payments**: Paystack
- **Messaging**: WhatsApp Business API

## Project Structure

```
├── src/                    # React frontend
├── functions/              # Firebase Cloud Functions
│   └── src/whatsapp/      # WhatsApp bot
├── components/            # React components
├── services/              # Firestore services
├── docs/                  # Documentation
└── CLAUDE.md             # AI assistant instructions
```

## Environments

- **Development**: `firebase use dev`
- **Staging**: `firebase use staging`
- **Production**: `firebase use default`

## Key Features

- Multi-role dashboard (Individual/Business/Partner)
- Real-time route tracking
- Invoice generation and management
- Nigerian PAYE payroll system
- Driver wallet and payouts
- WhatsApp AI assistant (Amana)
- Subscription management
- Analytics and reporting

## Contributing

See [Git Workflow](docs/GIT_WORKFLOW.md) for branching strategy.

## License

Proprietary - Glyde Africa
