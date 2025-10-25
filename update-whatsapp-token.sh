#!/bin/bash

# WhatsApp Token Update Script
# This script helps you update your WhatsApp access token in Firebase

echo "🔧 WhatsApp Token Update Tool"
echo "================================"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Go to Meta Business Suite: https://business.facebook.com/"
echo "2. Navigate to WhatsApp → API Setup"
echo "3. Generate a new System User Token (permanent)"
echo "4. Copy the token"
echo ""
read -p "Enter your NEW WhatsApp Access Token: " NEW_TOKEN
echo ""

if [ -z "$NEW_TOKEN" ]; then
    echo "❌ Error: Token cannot be empty"
    exit 1
fi

echo "📝 Setting new token in Firebase..."
firebase functions:config:set whatsapp.token="$NEW_TOKEN"

echo ""
echo "✅ Token updated successfully!"
echo ""
echo "📊 Current Firebase config:"
firebase functions:config:get
echo ""
echo "🚀 Now deploying updated function..."
firebase deploy --only functions:whatsappWebhook

echo ""
echo "✅ Deployment complete!"
echo "🧪 Test your WhatsApp integration now!"
