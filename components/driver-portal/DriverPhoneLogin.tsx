/**
 * Driver Portal - Phone Number Login Screen
 * Step 1: Enter phone number
 * Step 2: Verify OTP
 */

import React, { useState } from 'react';
import { validateNigerianPhone, formatPhoneForDisplay } from '../../services/phoneValidation';
import { termiiService } from '../../services/termii/termiiService';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { Driver } from '../../types';

interface DriverPhoneLoginProps {
  onLoginSuccess: (driver: Driver) => void;
}

type LoginStep = 'phone' | 'otp';

const DriverPhoneLogin: React.FC<DriverPhoneLoginProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<LoginStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinId, setPinId] = useState('');
  const [driver, setDriver] = useState<Driver | null>(null);

  // Handle phone number input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers, spaces, +, and ()
    const cleaned = value.replace(/[^0-9+\s()]/g, '');
    setPhoneNumber(cleaned);
    setError('');
  };

  // Handle phone number submission
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate phone number
      const validation = validateNigerianPhone(phoneNumber);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid phone number');
        setLoading(false);
        return;
      }

      // Check if driver exists with this phone number
      // Try multiple formats to handle existing data
      const driversRef = collection(db, 'drivers');

      console.log('[LOGIN] Searching for driver with phone:', {
        formatted: validation.formatted,
        original: phoneNumber
      });

      // First try formatted version (+234...)
      let q = query(driversRef, where('phone', '==', validation.formatted));
      let snapshot = await getDocs(q);
      console.log('[LOGIN] Try 1 - Formatted (+234...):', snapshot.size, 'results');

      // If not found, try without + sign
      if (snapshot.empty) {
        q = query(driversRef, where('phone', '==', validation.formatted.replace('+', '')));
        snapshot = await getDocs(q);
        console.log('[LOGIN] Try 2 - Without +:', snapshot.size, 'results');
      }

      // If still not found, try original input
      if (snapshot.empty) {
        q = query(driversRef, where('phone', '==', phoneNumber));
        snapshot = await getDocs(q);
        console.log('[LOGIN] Try 3 - Original input:', snapshot.size, 'results');
      }

      if (snapshot.empty) {
        // Get all drivers to help debug
        const allDriversSnapshot = await getDocs(collection(db, 'drivers'));
        const allPhones = allDriversSnapshot.docs.map(d => ({ id: d.id, phone: d.data().phone }));
        console.error('[LOGIN] No driver found. All driver phones:', allPhones);

        setError(`No driver account found with this phone number. Please contact your administrator. (Searched: ${validation.formatted}, ${phoneNumber})`);
        setLoading(false);
        return;
      }

      console.log('[LOGIN] Driver found:', snapshot.docs[0].id);

      const driverDoc = snapshot.docs[0];
      const driverData = { id: driverDoc.id, ...driverDoc.data() } as Driver;

      // Check if driver's portal access is enabled
      if (!driverData.portalAccess?.enabled) {
        setError('Your portal access has been disabled. Please contact your administrator.');
        setLoading(false);
        return;
      }

      // Send OTP
      const otpResult = await termiiService.sendOTP(validation.formatted);

      if (!otpResult.success) {
        setError(otpResult.error || 'Failed to send OTP. Please try again.');
        setLoading(false);
        return;
      }

      // Store driver data and pinId for verification
      setDriver(driverData);
      setPinId(otpResult.pinId || '');
      setStep('otp');
      setLoading(false);
    } catch (err) {
      console.error('Phone submit error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all digits entered
    if (newOtp.every((digit) => digit !== '')) {
      handleOtpSubmit(newOtp.join(''));
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardPaste<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    const newOtp = [...otp];

    for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
      newOtp[i] = pastedData[i];
    }

    setOtp(newOtp);

    // Auto-submit if complete
    if (newOtp.every((digit) => digit !== '')) {
      handleOtpSubmit(newOtp.join(''));
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (otpCode?: string) => {
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify OTP with Termii
      const verifyResult = await termiiService.verifyOTP(pinId, code);

      if (!verifyResult.success || !verifyResult.verified) {
        setError('Invalid or expired OTP. Please try again.');
        setLoading(false);
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
        return;
      }

      // OTP verified successfully
      if (driver) {
        // Update driver's last login and phone verified status
        const driverRef = doc(db, 'drivers', driver.id);
        await updateDoc(driverRef, {
          phoneVerified: true,
          'portalAccess.lastLogin': serverTimestamp(),
          'portalAccess.loginAttempts': 0, // Reset failed attempts
          updatedAt: serverTimestamp()
        });

        // Login successful
        onLoginSuccess({
          ...driver,
          phoneVerified: true
        });
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!driver) return;

    setLoading(true);
    setError('');

    try {
      const validation = validateNigerianPhone(driver.phone);
      const otpResult = await termiiService.sendOTP(validation.formatted);

      if (!otpResult.success) {
        setError(otpResult.error || 'Failed to resend OTP');
        setLoading(false);
        return;
      }

      setPinId(otpResult.pinId || '');
      setOtp(['', '', '', '', '', '']);
      setLoading(false);
      alert('OTP has been resent to your phone');
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError('Failed to resend OTP. Please try again.');
      setLoading(false);
    }
  };

  // Go back to phone entry
  const handleBack = () => {
    setStep('phone');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setPinId('');
    setDriver(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Portal</h1>
          <p className="text-gray-600 mt-2">
            {step === 'phone' ? 'Enter your phone number to login' : 'Enter verification code'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Phone Number Entry */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="08012345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter your registered phone number (e.g., 08012345678 or +2348012345678)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium
                       hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending OTP...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        )}

        {/* OTP Verification */}
        {step === 'otp' && driver && (
          <div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-center mb-6">
                We've sent a verification code to<br />
                <span className="font-semibold">{formatPhoneForDisplay(driver.phone)}</span>
              </p>

              <div className="flex gap-2 justify-center mb-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300
                             rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                             transition-colors"
                    disabled={loading}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-gray-400"
                >
                  Didn't receive code? Resend
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium
                         hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed
                         transition-colors"
              >
                Back
              </button>

              <button
                onClick={() => handleOtpSubmit()}
                disabled={loading || otp.some((d) => !d)}
                className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium
                         hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Secure login powered by Termii OTP</p>
          <p className="mt-1">Need help? Contact your administrator</p>
        </div>
      </div>
    </div>
  );
};

export default DriverPhoneLogin;
