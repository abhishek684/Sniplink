import { Link } from 'react-router-dom';

export default function Terms() {
    return (
        <div className="landing-page" style={{ paddingTop: '80px', paddingBottom: '80px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="auth-container" style={{ maxWidth: '800px', margin: '0 auto', flex: 1 }}>
                <Link to="/" className="btn btn-ghost" style={{ marginBottom: '2rem', display: 'inline-flex', padding: '8px 0' }}>
                    ← Back to Home
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ marginTop: '1rem' }}>Terms of Service</h1>
                    <p className="text-muted">Last Updated: February 2026</p>
                </div>

                <div className="card" style={{ padding: '2rem', lineHeight: '1.6' }}>
                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing or using Sniplink, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access our service.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>2. Acceptable Use</h2>
                    <p>You agree not to use the service for any illegal or unauthorized purpose. Specifically, you may not use our short links to redirect to malware, phishing sites, child exploitation material, or copyright-infringing content. We reserve the right to delete links or terminate accounts that violate this policy without notice.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>3. Accounts</h2>
                    <p>You are responsible for maintaining the security of your account and password. Sniplink cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>4. Premium Subscriptions</h2>
                    <p>Premium features are available via a one-time lifetime payment or subscription as offered. All purchases are final and non-refundable unless required by law.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>5. Disclaimer</h2>
                    <p>Our service is provided on an "as is" and "as available" basis. We do not warrant that the service will meet your specific requirements or be uninterrupted, timely, secure, or error-free.</p>
                </div>
            </div>
        </div>
    );
}
