import { Link } from 'react-router-dom';

export default function RefundPolicy() {
    return (
        <div className="landing-page" style={{ paddingTop: '80px', paddingBottom: '80px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="auth-container" style={{ maxWidth: '800px', margin: '0 auto', flex: 1 }}>
                <Link to="/" className="btn btn-ghost" style={{ marginBottom: '2rem', display: 'inline-flex', padding: '8px 0' }}>
                    ← Back to Home
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ marginTop: '1rem' }}>Refund & Cancellation Policy</h1>
                    <p className="text-muted">Last Updated: February 2026</p>
                </div>

                <div className="card" style={{ padding: '2rem', lineHeight: '1.6' }}>
                    <h2>1. Overview</h2>
                    <p>Thank you for purchasing Sniplink Premium. We want you to be completely satisfied with your purchase. This policy outlines our refund and cancellation procedures.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>2. Premium Plan — One-Time Purchase</h2>
                    <p>Sniplink Premium is a <strong>one-time lifetime payment</strong>. There are no recurring subscriptions or auto-renewals. Once purchased, you get lifetime access to all premium features.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>3. Refund Policy</h2>
                    <p>We offer a <strong>7-day refund policy</strong> from the date of purchase. If you are not satisfied with the premium features, you may request a full refund within 7 days of your purchase date.</p>
                    <p>To request a refund, please contact us at <a href="mailto:support@sniplink.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>support@sniplink.com</a> with the following details:</p>
                    <ul>
                        <li>Your registered email address</li>
                        <li>Payment transaction ID or receipt</li>
                        <li>Reason for the refund request</li>
                    </ul>

                    <h2 style={{ marginTop: '1.5rem' }}>4. Refund Processing</h2>
                    <p>Once your refund request is approved:</p>
                    <ul>
                        <li>The refund will be processed within <strong>5–7 business days</strong>.</li>
                        <li>The amount will be credited back to your original payment method.</li>
                        <li>Your account will be downgraded to the Free plan upon refund.</li>
                    </ul>

                    <h2 style={{ marginTop: '1.5rem' }}>5. Cancellation</h2>
                    <p>Since Sniplink Premium is a one-time purchase (not a subscription), there is no recurring payment to cancel. Your premium access remains active for life after purchase.</p>
                    <p>If you wish to <strong>delete your account</strong>, please contact us at <a href="mailto:support@sniplink.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>support@sniplink.com</a>. Please note that account deletion is permanent and all data including links and analytics will be permanently removed.</p>

                    <h2 style={{ marginTop: '1.5rem' }}>6. Non-Refundable Cases</h2>
                    <p>Refunds will <strong>not</strong> be provided in the following cases:</p>
                    <ul>
                        <li>Refund requested after the 7-day window.</li>
                        <li>Account terminated due to violation of our <Link to="/terms" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Terms of Service</Link>.</li>
                        <li>Duplicate purchases — please contact us and we will resolve it.</li>
                    </ul>

                    <h2 style={{ marginTop: '1.5rem' }}>7. Contact Information</h2>
                    <p>For any questions regarding this policy, please reach out to:</p>
                    <p><strong>Email:</strong> <a href="mailto:support@sniplink.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>support@sniplink.com</a></p>
                </div>
            </div>
        </div>
    );
}
