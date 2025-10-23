import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getUserProfile } from '../services/firestore/users';
import { whatsAppService } from '../services/whatsapp/whatsappService';
import { EnvelopeIcon, DevicePhoneMobileIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';

interface VerificationPageProps {
    onVerificationComplete: () => void;
}

const VerificationPage: React.FC<VerificationPageProps> = ({ onVerificationComplete }) => {
    const { currentUser } = useAuth();
    const [verificationMethod, setVerificationMethod] = useState<'email' | 'whatsapp' | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const [whatsappCode, setWhatsappCode] = useState('');
    const [enteredCode, setEnteredCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSendEmailVerification = async () => {
        setLoading(true);
        setError('');

        try {
            if (!auth.currentUser) {
                throw new Error('No user is currently signed in');
            }

            await sendEmailVerification(auth.currentUser, {
                url: window.location.origin, // Redirect back to app after verification
                handleCodeInApp: false,
            });

            setEmailSent(true);
            setSuccess('Verification email sent! Please check your inbox.');
        } catch (err: any) {
            console.error('Error sending verification email:', err);
            setError(err.message || 'Failed to send verification email');
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsAppCode = async () => {
        setLoading(true);
        setError('');

        try {
            if (!currentUser) {
                throw new Error('No user is currently signed in');
            }

            // Get user's phone number from profile
            const userProfile = await getUserProfile(currentUser.uid);
            if (!userProfile?.phone) {
                throw new Error('No phone number found for this account');
            }

            // Generate 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setWhatsappCode(code);

            // Send via WhatsApp service
            const response = await whatsAppService.sendText(
                userProfile.phone,
                `Your Glyde Transport verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nDo not share this code with anyone.`
            );

            if (!response.success) {
                throw new Error(response.error || 'Failed to send WhatsApp message');
            }

            console.log('WhatsApp verification code sent:', code);
            setSuccess('Verification code sent to your WhatsApp!');
        } catch (err: any) {
            console.error('Error sending WhatsApp code:', err);
            setError(err.message || 'Failed to send WhatsApp code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyWhatsAppCode = async () => {
        if (enteredCode !== whatsappCode) {
            setError('Invalid verification code. Please try again.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (!currentUser) {
                throw new Error('No user is currently signed in');
            }

            // Update user profile to mark WhatsApp as verified
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                whatsappVerified: true,
            });

            setSuccess('WhatsApp verified successfully!');

            // Wait 1 second then proceed
            setTimeout(() => {
                onVerificationComplete();
            }, 1000);
        } catch (err: any) {
            console.error('Error verifying WhatsApp code:', err);
            setError(err.message || 'Failed to verify code');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckEmailVerification = async () => {
        setLoading(true);
        setError('');

        try {
            if (!auth.currentUser) {
                throw new Error('No user is currently signed in');
            }

            // Reload user to get latest emailVerified status
            await auth.currentUser.reload();

            if (auth.currentUser.emailVerified) {
                // Update Firestore user profile
                if (currentUser) {
                    const userRef = doc(db, 'users', currentUser.uid);
                    await updateDoc(userRef, {
                        emailVerified: true,
                    });
                }

                setSuccess('Email verified successfully!');

                // Wait 1 second then proceed
                setTimeout(() => {
                    onVerificationComplete();
                }, 1000);
            } else {
                setError('Email not verified yet. Please check your inbox and click the verification link.');
            }
        } catch (err: any) {
            console.error('Error checking email verification:', err);
            setError(err.message || 'Failed to check verification status');
        } finally {
            setLoading(false);
        }
    };

    if (!verificationMethod) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Account</h1>
                        <p className="text-gray-600">
                            Choose how you'd like to verify your account to continue
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Email Verification Card */}
                        <button
                            onClick={() => setVerificationMethod('email')}
                            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-8 text-left border-2 border-transparent hover:border-indigo-500"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="bg-indigo-100 p-3 rounded-full">
                                    <EnvelopeIcon className="h-8 w-8 text-indigo-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Email Verification</h2>
                            </div>
                            <p className="text-gray-600 mb-4">
                                We'll send a verification link to your email address
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                <span>Quick and secure</span>
                            </div>
                        </button>

                        {/* WhatsApp Verification Card */}
                        <button
                            onClick={() => setVerificationMethod('whatsapp')}
                            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-8 text-left border-2 border-transparent hover:border-green-500"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="bg-green-100 p-3 rounded-full">
                                    <DevicePhoneMobileIcon className="h-8 w-8 text-green-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">WhatsApp Verification</h2>
                            </div>
                            <p className="text-gray-600 mb-4">
                                Receive a verification code via WhatsApp message
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                <span>Instant delivery</span>
                            </div>
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            Your email: <span className="font-semibold text-gray-700">{currentUser?.email}</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (verificationMethod === 'email') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
                    <div className="text-center mb-6">
                        <div className="bg-indigo-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <EnvelopeIcon className="h-8 w-8 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verification</h1>
                        <p className="text-gray-600">
                            {emailSent
                                ? "We've sent a verification link to your email"
                                : "Click below to receive a verification link"
                            }
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        {!emailSent ? (
                            <button
                                onClick={handleSendEmailVerification}
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                                Send Verification Email
                            </button>
                        ) : (
                            <button
                                onClick={handleCheckEmailVerification}
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                                I've Verified My Email
                            </button>
                        )}

                        {emailSent && (
                            <button
                                onClick={handleSendEmailVerification}
                                disabled={loading}
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-all"
                            >
                                Resend Email
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setVerificationMethod(null);
                                setEmailSent(false);
                                setError('');
                                setSuccess('');
                            }}
                            className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-all"
                        >
                            Choose Different Method
                        </button>
                    </div>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>Check your spam folder if you don't see the email</p>
                    </div>
                </div>
            </div>
        );
    }

    if (verificationMethod === 'whatsapp') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
                    <div className="text-center mb-6">
                        <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <DevicePhoneMobileIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Verification</h1>
                        <p className="text-gray-600">
                            {whatsappCode
                                ? "Enter the 6-digit code sent to your WhatsApp"
                                : "Click below to receive your verification code"
                            }
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        {!whatsappCode ? (
                            <button
                                onClick={handleSendWhatsAppCode}
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                                Send WhatsApp Code
                            </button>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="code">
                                        Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        id="code"
                                        placeholder="Enter 6-digit code"
                                        maxLength={6}
                                        value={enteredCode}
                                        onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-center text-2xl tracking-widest font-mono"
                                    />
                                </div>

                                <button
                                    onClick={handleVerifyWhatsAppCode}
                                    disabled={loading || enteredCode.length !== 6}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                                    Verify Code
                                </button>

                                <button
                                    onClick={handleSendWhatsAppCode}
                                    disabled={loading}
                                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-all"
                                >
                                    Resend Code
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => {
                                setVerificationMethod(null);
                                setWhatsappCode('');
                                setEnteredCode('');
                                setError('');
                                setSuccess('');
                            }}
                            className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-all"
                        >
                            Choose Different Method
                        </button>
                    </div>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>Code expires in 10 minutes</p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default VerificationPage;
