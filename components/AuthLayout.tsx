

import React from 'react';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
    const { t } = useTranslation();
    
    return (
        <div className="min-h-screen flex font-sans">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center p-12 text-white relative overflow-hidden">
                <div className="z-10">
                    <h1 className="text-5xl font-bold mb-4">{t('auth.heroTitle')}</h1>
                    <p className="text-xl max-w-md">{t('auth.heroSubtitle')}</p>
                </div>
                 {/* Decorative shapes */}
                <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/10 rounded-full"></div>
                <div className="absolute -bottom-24 -right-10 w-72 h-72 bg-white/10 rounded-full"></div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-100 p-8">
                <div className="max-w-md w-full">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <img src="https://i.postimg.cc/nXNBx2N8/Glyde-I.png" alt="Glyde-I" className="w-16 h-16" />
                    </div>
                    
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
                        <p className="text-gray-500 mt-2">{subtitle}</p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;