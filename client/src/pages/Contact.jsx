import { Link } from 'react-router-dom';

export default function Contact() {
    return (
        <div className="landing-page" style={{ paddingTop: '80px', paddingBottom: '80px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="auth-container" style={{ maxWidth: '800px', margin: '0 auto', flex: 1 }}>
                <Link to="/" className="btn btn-ghost" style={{ marginBottom: '2rem', display: 'inline-flex', padding: '8px 0' }}>
                    ← Back to Home
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ marginTop: '1rem' }}>Contact Us</h1>
                    <p className="text-muted">We'd love to hear from you</p>
                </div>

                <div className="card" style={{ padding: '2rem', lineHeight: '1.6' }}>
                    <h2>📬 Get in Touch</h2>
                    <p>Have questions, feedback, or need help? Reach out to us through any of the channels below. We typically respond within 24 hours.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>📧 Email</h2>
                    <p>For general inquiries, feature requests, or support:</p>
                    <p><a href="mailto:support@sniplink.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>support@sniplink.com</a></p>

                    <h2 style={{ marginTop: '1.5rem' }}>💼 Business Inquiries</h2>
                    <p>For partnerships, enterprise plans, or business-related inquiries:</p>
                    <p><a href="mailto:business@sniplink.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>business@sniplink.com</a></p>

                    <h2 style={{ marginTop: '1.5rem' }}>📸 Social Media</h2>
                    <p>Follow us and stay updated on the latest features and updates:</p>
                    <ul>
                        <li>
                            <a href="https://www.instagram.com/st_abhi_/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                Instagram — @st_abhi_
                            </a>
                        </li>
                    </ul>

                    <h2 style={{ marginTop: '1.5rem' }}>🕐 Support Hours</h2>
                    <p>Monday – Saturday: 10:00 AM – 7:00 PM (IST)</p>
                    <p>Sunday: Closed</p>

                    <h2 style={{ marginTop: '1.5rem' }}>📍 Location</h2>
                    <p>India</p>
                </div>
            </div>
        </div>
    );
}
