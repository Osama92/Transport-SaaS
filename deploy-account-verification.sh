#!/bin/bash

# Deploy Account Verification Function Script
echo "🚀 Deploying Account Verification Function..."
echo "=========================================="

# Navigate to functions directory
cd functions || { echo "❌ Functions directory not found"; exit 1; }

# Build the TypeScript
echo "📦 Building TypeScript..."
npm run build || { echo "❌ Build failed"; exit 1; }

# Go back to root
cd ..

# Deploy only the resolveBankAccount function
echo "☁️  Deploying resolveBankAccount to Firebase..."
firebase deploy --only functions:resolveBankAccount

echo "✅ Deployment complete!"
echo ""
echo "🎯 Test the function:"
echo "1. Open your wallet screen"
echo "2. Click 'Send to Bank'"
echo "3. Enter account: 0011542097"
echo "4. Select bank: First Bank of Nigeria"
echo "5. Click 'Verify' - you should see the real account name!"