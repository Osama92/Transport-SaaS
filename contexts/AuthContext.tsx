import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as AppUser, Organization } from '../types';

interface AuthContextType {
    currentUser: AppUser | null;
    userRole: string | null;
    organizationId: string | null;
    organization: Organization | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
    logIn: (email: string, password: string) => Promise<void>;
    logOut: () => Promise<void>;
    updateUserRole: (role: string) => Promise<void>;
    updateDisplayName: (newName: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    updateProfilePicture: (file: File) => Promise<void>;
    updateNotificationPreferences: (prefs: { phone: string; whatsappOptIn: boolean }) => Promise<void>;
    setOrganization: (org: Organization) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Helper to get session from localStorage
const getSession = (): { user: AppUser; role: string | null; organizationId?: string; organization?: Organization } | null => {
    try {
        const sessionStr = localStorage.getItem('userSession');
        if (sessionStr) {
            return JSON.parse(sessionStr);
        }
        return null;
    } catch (error) {
        console.error("Could not parse user session from localStorage", error);
        return null;
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [organization, setOrganizationState] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const session = getSession();
        if (session) {
            setCurrentUser(session.user);
            setUserRole(session.role);
            setOrganizationId(session.organizationId || null);
            setOrganizationState(session.organization || null);
        }
        setLoading(false);
    }, []);

    const signUp = async (email: string, password: string, fullName: string, phone: string) => {
        const newUser: AppUser = {
            uid: `mock-${Date.now()}`,
            email,
            displayName: fullName,
            phone,
            photoURL: 'https://picsum.photos/seed/newuser/40/40',
            whatsappOptIn: false,
        };
        const session = { user: newUser, role: null };
        localStorage.setItem('userSession', JSON.stringify(session));
        setCurrentUser(newUser);
        setUserRole(null);
    };

    const logIn = async (email: string, password: string) => {
        if (password !== 'password123') {
            throw new Error('Invalid credentials. Please use password "password123".');
        }
        // If a user session already exists for this email, load it. Otherwise, create a new mock user.
        const existingSession = getSession();
        if (existingSession && existingSession.user.email === email) {
            setCurrentUser(existingSession.user);
            setUserRole(existingSession.role);
            return;
        }

        const mockUser: AppUser = {
            uid: `mock-${Date.now()}`,
            email,
            displayName: 'John Doe',
            photoURL: 'https://picsum.photos/seed/placeholder/40/40',
            phone: '(123) 456-7890',
            whatsappOptIn: false,
        };
        const session = { user: mockUser, role: null };
        localStorage.setItem('userSession', JSON.stringify(session));
        setCurrentUser(mockUser);
        setUserRole(null);
    };

    const logOut = async () => {
        localStorage.removeItem('userSession');
        setCurrentUser(null);
        setUserRole(null);
    };

    const updateUserRole = async (role: string) => {
        const session = getSession();
        if (session) {
            // Create a mock organization when role is selected
            const mockOrgId = `org-${Date.now()}`;
            const mockOrganization: Organization = {
                id: mockOrgId,
                name: `${session.user.displayName}'s ${role} Organization`,
                type: role as Organization['type'],
                ownerId: session.user.uid,
                members: [
                    {
                        userId: session.user.uid,
                        role: 'owner',
                        permissions: ['*'],
                        addedAt: new Date().toISOString(),
                    }
                ],
                settings: {
                    currency: 'NGN',
                    timezone: 'Africa/Lagos',
                    language: 'en',
                },
                subscription: {
                    plan: 'trial',
                    status: 'trial',
                    startDate: new Date().toISOString(),
                },
                companyDetails: {
                    address: '',
                    email: session.user.email,
                    phone: session.user.phone || '',
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: session.user.uid,
            };

            const updatedSession = {
                ...session,
                role,
                organizationId: mockOrgId,
                organization: mockOrganization,
            };
            localStorage.setItem('userSession', JSON.stringify(updatedSession));
            setUserRole(role);
            setOrganizationId(mockOrgId);
            setOrganizationState(mockOrganization);
        } else {
            throw new Error("No user is currently signed in.");
        }
    };
    
    const updateDisplayName = async (newName: string) => {
        const session = getSession();
        if (session && session.user) {
            const updatedUser = { ...session.user, displayName: newName };
            const updatedSession = { ...session, user: updatedUser };
            localStorage.setItem('userSession', JSON.stringify(updatedSession));
            setCurrentUser(updatedUser);
        } else {
             throw new Error("No user is currently signed in.");
        }
    };

    const updatePassword = async (newPassword: string) => {
        console.log("Mock password update successful.");
        // In a real app, this would involve more complex logic. For mock, we do nothing.
    };

    const updateProfilePicture = async (file: File) => {
        const session = getSession();
         if (session && session.user) {
            // Simulate upload and get a URL
            const photoURL = URL.createObjectURL(file);
            const updatedUser = { ...session.user, photoURL };
            const updatedSession = { ...session, user: updatedUser };
            localStorage.setItem('userSession', JSON.stringify(updatedSession));
            setCurrentUser(updatedUser);
        } else {
            throw new Error("No user is currently signed in.");
        }
    };

    const updateNotificationPreferences = async (prefs: { phone: string; whatsappOptIn: boolean }) => {
        const session = getSession();
        if (session && session.user) {
            const updatedUser = { ...session.user, ...prefs };
            const updatedSession = { ...session, user: updatedUser };
            localStorage.setItem('userSession', JSON.stringify(updatedSession));
            setCurrentUser(updatedUser);
        } else {
             throw new Error("No user is currently signed in.");
        }
    };

    const setOrganization = (org: Organization) => {
        setOrganizationState(org);
        setOrganizationId(org.id);

        const session = getSession();
        if (session) {
            const updatedSession = {
                ...session,
                organizationId: org.id,
                organization: org,
            };
            localStorage.setItem('userSession', JSON.stringify(updatedSession));
        }
    };

    const value = {
        currentUser,
        userRole,
        organizationId,
        organization,
        loading,
        signUp,
        logIn,
        logOut,
        updateUserRole,
        updateDisplayName,
        updatePassword,
        updateProfilePicture,
        updateNotificationPreferences,
        setOrganization,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
