import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from './Icons';

interface LoginPageProps {
    onSwitchToSignUp: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignUp }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { logIn } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await logIn(email, password);
            // Navigation will be handled by the App component based on auth state
        } catch (err) {
            setError('Failed to log in. Please check your credentials.');
            console.error(err);
        }
        setLoading(false);
    };
    
    return (
        <div className="bg-white p-8 rounded-xl shadow-md">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
            <form onSubmit={handleSubmit}>
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
                <div className="mb-6">
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
                            {showPassword ? (
                                <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                                <EyeIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                     <a href="#" className="text-xs text-indigo-500 hover:text-indigo-700 float-right mt-2">{t('auth.forgotPassword')}</a>
                </div>
                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-indigo-300"
                >
                    {loading ? t('auth.loggingIn') : t('auth.loginButton')}
                </button>
            </form>
            <div className="mt-6 text-center">
                 <p className="text-sm text-gray-600">
                    {t('auth.dontHaveAccount')}{' '}
                    <button onClick={onSwitchToSignUp} className="font-bold text-indigo-500 hover:text-indigo-700">
                        {t('auth.signUp')}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;