import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
    const { theme, setTheme } = useTheme();
    return (
        <div className="landing-page">
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="logo">
                        <span className="logo-icon">⚡</span>
                        <span className="logo-text">Sniplink</span>
                    </div>
                    <div className="landing-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            className="theme-toggle-btn"
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            title="Toggle Light/Dark Mode"
                            style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '5px' }}
                        >
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                        <Link to="/login" className="btn btn-ghost">Log in</Link>
                        <Link to="/signup" className="btn btn-primary">Get Started Free</Link>
                    </div>
                </div>
            </nav>

            <section className="hero">
                <div className="hero-badge">🚀 The modern URL shortener</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <img
                        src="/profile.jpg"
                        alt="Profile"
                        style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '4px solid rgba(108, 92, 231, 0.3)',
                            boxShadow: '0 0 20px rgba(108, 92, 231, 0.4)'
                        }}
                    />
                </div>
                <h1 className="hero-title">
                    Shorten Links.<br />
                    <span className="gradient-text">Track Everything.</span>
                </h1>
                <p className="hero-subtitle">
                    Create short, branded links in seconds. Monitor clicks, analyze traffic,
                    and grow your brand — all from one powerful dashboard.
                </p>
                <div className="hero-actions">
                    <Link to="/signup" className="btn btn-primary btn-lg">Start for Free →</Link>
                    <Link to="/login" className="btn btn-outline btn-lg">Log In</Link>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🔗</div>
                        <h3>Instant Short Links</h3>
                        <p>Create clean, shareable short URLs in one click</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Click Analytics</h3>
                        <p>Track clicks, referrers, and browsers in real-time</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🎨</div>
                        <h3>Custom Aliases</h3>
                        <p>Personalize your short links with custom slugs</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📱</div>
                        <h3>QR Codes</h3>
                        <p>Generate scannable QR codes for any link</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">⏰</div>
                        <h3>Link Expiry</h3>
                        <p>Set expiration dates on any link</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">✏️</div>
                        <h3>Link Editor</h3>
                        <p>Edit your links anytime — update URL, title, or settings</p>
                    </div>
                </div>

                <div className="pricing-section">
                    <h2 className="section-title">Simple, Transparent Pricing</h2>
                    <div className="pricing-cards">
                        <div className="pricing-card">
                            <div className="pricing-badge">Free</div>
                            <div className="pricing-price">₹0<span>/forever</span></div>
                            <ul className="pricing-features">
                                <li>✓ Up to 5 short links</li>
                                <li>✓ Click tracking</li>
                                <li>✓ Analytics dashboard</li>
                                <li className="disabled">✗ Custom aliases</li>
                                <li className="disabled">✗ QR code generation</li>
                                <li className="disabled">✗ Link expiry</li>
                                <li className="disabled">✗ Link editor</li>
                            </ul>
                            <Link to="/signup" className="btn btn-outline btn-full">Get Started</Link>
                        </div>
                        <div className="pricing-card pricing-card-premium">
                            <div className="pricing-badge pricing-badge-premium">Premium ✨</div>
                            <div className="pricing-price">₹9<span>/one-time</span></div>
                            <ul className="pricing-features">
                                <li>✓ Unlimited short links</li>
                                <li>✓ Click tracking</li>
                                <li>✓ Analytics dashboard</li>
                                <li>✓ Custom aliases</li>
                                <li>✓ QR code generation</li>
                                <li>✓ Link expiry</li>
                                <li>✓ Link editor</li>
                            </ul>
                            <Link to="/signup" className="btn btn-primary btn-full">Start Premium</Link>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="landing-footer" style={{ padding: '3rem 0', borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '4rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                        <Link to="/about" className="text-muted" style={{ textDecoration: 'none' }}>About Us</Link>
                        <Link to="/privacy" className="text-muted" style={{ textDecoration: 'none' }}>Privacy Policy</Link>
                        <Link to="/terms" className="text-muted" style={{ textDecoration: 'none' }}>Terms of Service</Link>
                    </div>
                    <p style={{ margin: 0 }}>© 2026 Sniplink. Built with ⚡</p>
                    <div style={{ marginTop: '5px' }}>
                        <a
                            href="https://www.instagram.com/st_abhi_/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted"
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                        >
                            📸 Follow on Instagram
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
