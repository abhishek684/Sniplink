import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.getMe()
                .then(data => setUser(data.user))
                .catch(() => { localStorage.removeItem('token'); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const data = await api.login({ email, password });
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return data;
    };

    const sendOtp = async (name, email, password) => {
        return await api.sendOtp({ name, email, password });
    };

    const signup = async (name, email, password, otp) => {
        const data = await api.signup({ name, email, password, otp });
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const refreshUser = async () => {
        const data = await api.getMe();
        setUser(data.user);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, sendOtp, signup, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
