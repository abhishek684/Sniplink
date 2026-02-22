import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/dashboard" className="logo">
                    <span className="logo-icon">⚡</span>
                    <span className="logo-text">Sniplink</span>
                </Link>

                <div className="navbar-right">
                    <button className="theme-toggle-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle Light/Dark Mode" style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '5px' }}>
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>

                    <span className={`plan-badge ${user?.plan === 'premium' ? 'premium' : 'free'}`}>
                        {user?.plan === 'premium' ? '⭐ Premium' : '🆓 Free'}
                    </span>

                    <div className="user-menu">
                        <button className="user-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
                            <div className="avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                            <span className="user-name">{user?.name}</span>
                            <span className="chevron">▾</span>
                        </button>
                        {menuOpen && (
                            <>
                                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                                <div className="dropdown-menu">
                                    <div className="dropdown-header">
                                        <div className="dropdown-name">{user?.name}</div>
                                        <div className="dropdown-email">{user?.email}</div>
                                    </div>
                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item" onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}>
                                        📊 Dashboard
                                    </button>
                                    <button className="dropdown-item logout" onClick={handleLogout}>
                                        🚪 Log Out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
