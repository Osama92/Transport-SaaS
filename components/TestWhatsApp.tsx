import React, { useState } from 'react';
import { whatsAppService } from '../services/whatsapp/whatsappService';
import { createNotification } from '../services/firestore/notifications';
import { useAuth } from '../contexts/AuthContext';

const TestWhatsApp: React.FC = () => {
    const { currentUser, organizationId } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [message, setMessage] = useState('Hello! This is a test message from Transport SaaS. 🚚');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [result, setResult] = useState<string>('');

    const handleSendWhatsApp = async () => {
        if (!phoneNumber) {
            setResult('Please enter a phone number');
            return;
        }

        setStatus('sending');
        setResult('Sending message...');

        try {
            // Send WhatsApp message directly
            const response = await whatsAppService.sendText(phoneNumber, message);

            if (response.success) {
                setStatus('success');
                setResult(`✅ Message sent successfully! Message ID: ${response.messageId}`);

                // Also create a notification in Firestore
                if (currentUser && organizationId) {
                    await createNotification({
                        userId: currentUser.uid,
                        organizationId: organizationId,
                        type: 'system',
                        title: 'WhatsApp Test',
                        message: 'Test message sent successfully',
                        sendWhatsApp: false, // Don't send another WhatsApp
                    });
                }
            } else {
                setStatus('error');
                setResult(`❌ Failed: ${response.error}`);
            }
        } catch (error: any) {
            setStatus('error');
            setResult(`❌ Error: ${error.message}`);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg w-96 z-50">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">
                🚀 Test WhatsApp Integration
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number (with country code)
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., 2348012345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Nigeria: 234 + number (without leading 0)
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Message (for text message only)
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSendWhatsApp}
                        disabled={status === 'sending'}
                        className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send Test Message
                    </button>
                </div>

                {result && (
                    <div className={`p-3 rounded-lg text-sm ${
                        status === 'success'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : status === 'error'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                        {result}
                    </div>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2 border-t border-gray-200 dark:border-slate-700 pt-3">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">📝 Important Notes:</p>
                    <p>⚠️ <strong>Text messages</strong> only work if user messaged you first (within 24 hours)</p>
                    <p>✅ <strong>For business-initiated messages:</strong> You need to create templates</p>
                    <p className="font-semibold mt-2">🎯 How to create templates:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Go to <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">Meta Business Suite</a></li>
                        <li>Select your WhatsApp Business Account</li>
                        <li>Go to "Account tools" → "Message templates"</li>
                        <li>Click "Create template" and fill in details</li>
                        <li>Wait for approval (usually 15-30 minutes)</li>
                    </ol>
                    <p className="mt-2">💡 <strong>Free:</strong> First 1000 conversations/month</p>
                </div>
            </div>
        </div>
    );
};

export default TestWhatsApp;