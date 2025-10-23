import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from './Icons';

interface SignUpPageProps {
    onSwitchToLogin: () => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onSwitchToLogin }) => {
    const { t } = useTranslation();
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (password !== confirmPassword) {
            return setError("Passwords do not match.");
        }

        if (password.length < 8) {
            return setError("Password must be at least 8 characters long.");
        }

        if (!agreedToTerms) {
            return setError("Please accept the Terms of Service and Privacy Policy.");
        }

        // Validate phone format (Nigerian)
        const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            return setError("Please enter a valid Nigerian phone number (e.g., 08012345678)");
        }

        setError('');
        setLoading(true);
        try {
            await signUp(email, password, fullName, phone, companyName);
            // Navigation is handled by App component's auth state listener
        } catch (err: any) {
            setError(`Failed to create an account. ${err.message}`);
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-md">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
            <form onSubmit={handleSubmit}>
                 <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fullname">
                        {t('auth.fullNameLabel')}
                    </label>
                    <input 
                        type="text" 
                        id="fullname"
                        placeholder="John Doe"
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyname">
                        Company/Organization Name
                    </label>
                    <input
                        type="text"
                        id="companyname"
                        placeholder="Your Company Ltd"
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional - for business and partner accounts</p>
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                        {t('auth.emailLabel')}
                    </label>
                    <input
                        type="email"
                        id="email"
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                 <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                        WhatsApp Phone Number
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        placeholder="08012345678"
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Used for account verification and notifications</p>
                </div>
                <div className="mb-4">
                     <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                        {t('auth.passwordLabel')}
                    </label>
                    <div className="relative">
                        <input 
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 pr-10 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
                <div className="mb-6">
                     <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-password">
                        {t('auth.confirmPasswordLabel')}
                    </label>
                    <div className="relative">
                        <input 
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="confirm-password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 pr-10 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                            aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                        >
                            {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-6">
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">
                            I agree to the{' '}
                            <a href="/terms" target="_blank" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                                Terms of Service
                            </a>
                            {' '}and{' '}
                            <a href="/privacy" target="_blank" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                                Privacy Policy
                            </a>
                        </span>
                    </label>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600">Password strength:</span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        password.length < 8 ? 'w-1/3 bg-red-500' :
                                        password.length < 12 ? 'w-2/3 bg-yellow-500' :
                                        'w-full bg-green-500'
                                    }`}
                                />
                            </div>
                            <span className={`font-semibold ${
                                password.length < 8 ? 'text-red-500' :
                                password.length < 12 ? 'text-yellow-500' :
                                'text-green-500'
                            }`}>
                                {password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong'}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !agreedToTerms}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Account...
                        </span>
                    ) : 'Create Account - Start 10-Day Free Trial'}
                </button>

                {/* Free Trial Notice */}
                <div className="mt-3 text-center">
                    <p className="text-xs text-gray-600">
                        🎉 <span className="font-semibold text-green-600">10-day free trial</span> included - no credit card required
                    </p>
                </div>
            </form>
             <div className="mt-6 text-center">
                 <p className="text-sm text-gray-600">
                    {t('auth.alreadyHaveAccount')}{' '}
                    <button onClick={onSwitchToLogin} className="font-bold text-indigo-500 hover:text-indigo-700">
                        {t('auth.login')}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default SignUpPage;