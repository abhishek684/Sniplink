import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { sendOtp, signup } = useAuth();
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendOtp(name, email, password);
            setStep(2); // Move to OTP verification
        } catch (err) {
            setError(err.error || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signup(name, email, password, otp);
            navigate('/dashboard');
        } catch (err) {
            setError(err.error || 'Verification failed. Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <Link to="/" className="logo">
                        <span className="logo-icon">⚡</span>
                        <span className="logo-text">Sniplink</span>
                    </Link>
                    <h1>{step === 1 ? 'Create your account' : 'Verify your email'}</h1>
                    <p>{step === 1 ? 'Start shortening links in seconds' : `Enter the 6-digit code sent to ${email}`}</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handleSendOtp} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Min 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? 'Sending OTP...' : 'Continue'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="otp">Verification Code</label>
                            <input
                                id="otp"
                                type="text"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                minLength={6}
                                maxLength={6}
                                style={{ fontSize: '24px', letterSpacing: '10px', textAlign: 'center' }}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading || otp.length < 6}>
                            {loading ? 'Verifying...' : 'Verify & Create Account'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-full"
                            onClick={() => setStep(1)}
                            disabled={loading}
                            style={{ marginTop: '10px' }}
                        >
                            Back
                        </button>
                    </form>
                )}

                {step === 1 && (
                    <p className="auth-footer">
                        Already have an account? <Link to="/login">Log in</Link>
                    </p>
                )}
            </div>
        </div>
    );
}
