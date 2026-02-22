import { Link } from 'react-router-dom';

export default function About() {
    return (
        <div className="landing-page" style={{ paddingTop: '80px', paddingBottom: '80px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="auth-container" style={{ maxWidth: '800px', margin: '0 auto', flex: 1 }}>
                <Link to="/" className="btn btn-ghost" style={{ marginBottom: '2rem', display: 'inline-flex', padding: '8px 0' }}>
                    ← Back to Home
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span className="logo-icon" style={{ fontSize: '3rem' }}>⚡</span>
                    <h1 style={{ marginTop: '1rem' }}>About Sniplink</h1>
                </div>

                <div className="card" style={{ padding: '2rem', lineHeight: '1.6' }}>
                    <h2>Our Mission</h2>
                    <p>Sniplink was built with a simple goal: to make link management effortless, beautiful, and powerful. We believe that every link you share is an opportunity to learn about your audience and grow your brand.</p>

                    <h2 style={{ marginTop: '2rem' }}>Who We Are</h2>
                    <p>We are a passionate team of developers and designers dedicated to building the best tools for creators, marketers, and businesses.</p>

                    <h2 style={{ marginTop: '2rem' }}>Contact Us</h2>
                    <p>Got questions or feedback? We'd love to hear from you!</p>
                    <p>Email: <strong>support@sniplink.com</strong></p>
                </div>
            </div>
        </div>
    );
}
