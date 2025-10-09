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
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError("Passwords do not match.");
        }

        setError('');
        setLoading(true);
        try {
            await signUp(email, password, fullName, phone);
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
                        {t('auth.phoneLabel')}
                    </label>
                    <input 
                        type="tel" 
                        id="phone"
                        placeholder="(123) 456-7890"
                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
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
                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-300"
                >
                    {loading ? t('auth.creatingAccount') : t('auth.createAccountButton')}
                </button>
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