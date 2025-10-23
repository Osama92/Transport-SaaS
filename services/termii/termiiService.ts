/**
 * Termii SMS API Service
 * Documentation: https://developers.termii.com/
 * Based on working implementation with axios
 */

import axios from 'axios';
import { validateNigerianPhone } from '../phoneValidation';

const TERMII_API_KEY = import.meta.env.VITE_TERMII_API_KEY || 'TLpqMgjXyZlBggYjZeSZUFRXgZfgFAJoipUATolSqiNezdZjsWYkqBtwafRrma';
const TERMII_SENDER_ID = import.meta.env.VITE_TERMII_SENDER_ID || 'N-Alert';
const TERMII_BASE_URL = 'https://api.ng.termii.com/api';
const OTP_EXPIRY_MINUTES = 5;

// TEST MODE: Set to true to bypass Termii API and use test OTP (123456)
// This avoids CORS issues during development. For production, move Termii calls to Firebase Functions.
const USE_TEST_MODE = false;  // PRODUCTION MODE - Real SMS via Termii API
const TEST_OTP = '123456';

interface TermiiResponse {
  success: boolean;
  message?: string;
  data?: any;
  pinId?: string;
  verified?: boolean;
  error?: string;
}

interface OtpRequest {
  phoneNumber: string;
  pinId: string;
  timestamp: number;
  formattedPhone: string;
  attempts: number;
}

// Store OTP requests in memory
const otpRequests: OtpRequest[] = [];

/**
 * Format phone number to Termii format (234XXXXXXXXXX)
 */
const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    return '234' + cleaned.substring(1);
  }

  if (cleaned.startsWith('234')) {
    return cleaned;
  }

  if (cleaned.startsWith('+234')) {
    return cleaned.substring(1);
  }

  return '234' + cleaned;
};

/**
 * Parse Termii API errors
 */
const parseTermiiError = (error: any): string => {
  if (error.response) {
    const data = error.response.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;

    // Handle specific Termii error codes
    if (data?.code === '216') return 'Invalid phone number';
    if (data?.code === '217') return 'OTP sending limit reached';
  }

  if (error.code === 'ECONNABORTED') return 'Request timeout. Please check your connection';
  if (error.message?.includes('Network Error')) return 'Network error. Please check your internet connection';

  return 'An error occurred. Please try again';
};

/**
 * Cleanup expired OTP requests
 */
const cleanupExpiredRequests = () => {
  const now = Date.now();
  for (let i = otpRequests.length - 1; i >= 0; i--) {
    if ((now - otpRequests[i].timestamp) > (OTP_EXPIRY_MINUTES * 60 * 1000)) {
      otpRequests.splice(i, 1);
    }
  }
};

/**
 * Remove an OTP request
 */
const removeRequest = (request: OtpRequest) => {
  const index = otpRequests.indexOf(request);
  if (index !== -1) otpRequests.splice(index, 1);
};

/**
 * Send OTP via Termii
 */
export const sendOtpViaTermii = async (
  phoneNumber: string,
  channel: 'generic' | 'dnd' = 'dnd'
): Promise<TermiiResponse> => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Validate phone number format
    if (!/^234[789]\d{9}$/.test(formattedPhone)) {
      return {
        success: false,
        message: 'Invalid Nigerian phone number format',
        error: 'Invalid Nigerian phone number format'
      };
    }

    // ===== TEST MODE =====
    if (USE_TEST_MODE) {
      const testPinId = `test_pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store the test request
      otpRequests.push({
        phoneNumber,
        pinId: testPinId,
        timestamp: Date.now(),
        formattedPhone,
        attempts: 0
      });

      return {
        success: true,
        message: `OTP sent successfully`,
        pinId: testPinId,
        data: { pinId: testPinId }
      };
    }
    // ===== END TEST MODE =====

    const payload = {
      api_key: TERMII_API_KEY,
      message_type: 'NUMERIC',
      to: formattedPhone,
      from: TERMII_SENDER_ID,
      channel: 'dnd',
      pin_attempts: 10,
      pin_time_to_live: OTP_EXPIRY_MINUTES,
      pin_length: 6,
      pin_placeholder: '< 1234 >',
      message_text: 'Your TransportCo OTP is < 1234 >. Valid for 5 minutes. Do not share this code.',
      pin_type: 'NUMERIC'
    };

    const response = await axios.post(
      `${TERMII_BASE_URL}/sms/otp/send`,
      payload,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    // Validate response structure
    if (!response.data?.pinId) {
      throw new Error('Invalid response from Termii API');
    }

    // Store the request
    otpRequests.push({
      phoneNumber,
      pinId: response.data.pinId,
      timestamp: Date.now(),
      formattedPhone,
      attempts: 0
    });

    return {
      success: true,
      message: 'OTP sent successfully',
      pinId: response.data.pinId,
      data: response.data
    };
  } catch (error: any) {
    return {
      success: false,
      message: parseTermiiError(error),
      error: parseTermiiError(error)
    };
  }
};

/**
 * Verify OTP via Termii
 */
export const verifyOtpViaTermii = async (
  phoneNumber: string,
  otp: string
): Promise<TermiiResponse> => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    cleanupExpiredRequests();

    // Find the most recent valid request
    const request = otpRequests
      .filter(req =>
        (req.phoneNumber === phoneNumber || req.formattedPhone === formattedPhone) &&
        (Date.now() - req.timestamp) < (OTP_EXPIRY_MINUTES * 60 * 1000)
      )
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!request) {
      return {
        success: false,
        verified: false,
        message: 'No active OTP request found. Please request a new OTP.',
        error: 'No active OTP request found'
      };
    }

    // Track attempts
    request.attempts += 1;
    if (request.attempts > 3) {
      removeRequest(request);
      return {
        success: false,
        verified: false,
        message: 'Maximum attempts reached. Please request a new OTP.',
        error: 'Maximum attempts reached'
      };
    }

    // ===== TEST MODE =====
    if (USE_TEST_MODE) {
      if (otp === TEST_OTP) {
        removeRequest(request);
        return {
          success: true,
          verified: true,
          message: 'OTP verified successfully',
          data: { verified: true }
        };
      } else {
        return {
          success: false,
          verified: false,
          message: 'Invalid OTP code',
          error: 'Invalid OTP code'
        };
      }
    }
    // ===== END TEST MODE =====

    const response = await axios.post(
      `${TERMII_BASE_URL}/sms/otp/verify`,
      {
        api_key: TERMII_API_KEY,
        pin_id: request.pinId,
        pin: otp
      },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Check if the OTP was actually verified
    if (response.data.verified === true) {
      // Remove on successful verification
      removeRequest(request);
      return {
        success: true,
        verified: true,
        message: 'OTP verified successfully',
        data: response.data
      };
    } else {
      // OTP verification failed
      return {
        success: false,
        verified: false,
        message: 'Invalid OTP code. Please try again.',
        error: 'Invalid OTP code'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      verified: false,
      message: parseTermiiError(error),
      error: parseTermiiError(error)
    };
  }
};

/**
 * TermiiService class for compatibility with existing code
 */
class TermiiService {
  /**
   * Send OTP to phone number
   */
  async sendOTP(
    phoneNumber: string,
    pinType: 'NUMERIC' | 'ALPHANUMERIC' = 'NUMERIC',
    pinLength: number = 6
  ): Promise<{ success: boolean; pinId?: string; message?: string; error?: string }> {
    return sendOtpViaTermii(phoneNumber, 'dnd');
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    pinId: string,
    otp: string
  ): Promise<{ success: boolean; verified: boolean; message?: string; error?: string }> {
    // Find the request by pinId
    const request = otpRequests.find(req => req.pinId === pinId);

    if (!request) {
      return {
        success: false,
        verified: false,
        message: 'No active OTP request found',
        error: 'No active OTP request found'
      };
    }

    return verifyOtpViaTermii(request.phoneNumber, otp);
  }

  /**
   * Send custom SMS
   */
  async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; message?: string; error?: string }> {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      const response = await axios.post(
        `${TERMII_BASE_URL}/sms/send`,
        {
          to: formattedPhone,
          from: TERMII_SENDER_ID,
          sms: message,
          type: 'plain',
          channel: 'dnd',
          api_key: TERMII_API_KEY
        },
        {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return {
        success: true,
        messageId: response.data.message_id,
        message: 'SMS sent successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: parseTermiiError(error),
        error: parseTermiiError(error)
      };
    }
  }

  /**
   * Check account balance
   */
  async checkBalance(): Promise<{ success: boolean; balance?: number; currency?: string; error?: string }> {
    try {
      const response = await axios.get(
        `${TERMII_BASE_URL}/get-balance?api_key=${TERMII_API_KEY}`,
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return {
        success: true,
        balance: parseFloat(response.data.balance),
        currency: response.data.currency
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch balance'
      };
    }
  }
}

// Export singleton instance
export const termiiService = new TermiiService();

// Export types
export type {
  TermiiResponse
};
