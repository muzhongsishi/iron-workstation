import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../lib/api';

interface User {
    id: number;
    name: string;
    grade: string;
    email: string | null;
}

interface AuthContextType {
    user: User | null;
    login: (name: string, pin: string) => Promise<void>;
    setup: (name: string, pin: string, email: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check local storage for persisted session (mock)
        const stored = localStorage.getItem('iron_user');
        if (stored) {
            setUser(JSON.parse(stored));
        }
        setIsLoading(false);
    }, []);

    const login = async (name: string, pin: string) => {
        const res = await api.post('/auth/login', { name, pin });
        if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('iron_user', JSON.stringify(res.data.user));
        } else {
            throw new Error(res.data.message);
        }
    };

    const setup = async (name: string, pin: string, email: string) => {
        const res = await api.post('/auth/setup', { name, pin, email });
        if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('iron_user', JSON.stringify(res.data.user));
        } else {
            throw new Error(res.data.message);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('iron_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, setup, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
