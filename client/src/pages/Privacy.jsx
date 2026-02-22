import { Link } from 'react-router-dom';

export default function Privacy() {
    return (
        <div className="landing-page" style={{ paddingTop: '80px', paddingBottom: '80px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="auth-container" style={{ maxWidth: '800px', margin: '0 auto', flex: 1 }}>
                <Link to="/" className="btn btn-ghost" style={{ marginBottom: '2rem', display: 'inline-flex', padding: '8px 0' }}>
                    ← Back to Home
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ marginTop: '1rem' }}>Privacy Policy</h1>
                    <p className="text-muted">Last Updated: February 2026</p>
                </div>

                <div className="card" style={{ padding: '2rem', lineHeight: '1.6' }}>
                    <h2>1. Information We Collect</h2>
                    <p>We collect information that you provide to us directly, such as when you create an account, update your profile, or contact customer support. This includes your name, email address, and payment information (handled securely via Razorpay).</p>
                    <p>When you use our short links, we collect tracking data such as IP address (anonymized), browser type, referring URL, and timestamp.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>2. How We Use Your Information</h2>
                    <ul>
                        <li>To provide, maintain, and improve our services.</li>
                        <li>To process transactions and send related information.</li>
                        <li>To provide analytics to our users regarding link performance.</li>
                        <li>To communicate with you about products, services, offers, and events.</li>
                    </ul>

                    <h2 style={{ marginTop: '1.5rem' }}>3. Data Sharing</h2>
                    <p>We do not share your personal information with third parties except as necessary to provide our services (e.g., payment processors), comply with the law, or protect our rights.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>4. Security</h2>
                    <p>We use reasonable security measures to protect your information. Your passwords are one-way hashed and never stored in plain text.</p>
                </div>
            </div>
        </div>
    );
}
