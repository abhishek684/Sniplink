import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [status, setStatus] = useState('verifying'); // verifying | success | failed
    const [message, setMessage] = useState('Verifying your payment...');

    useEffect(() => {
        const paymentRequestId = searchParams.get('payment_request_id');
        const paymentId = searchParams.get('payment_id');
        const paymentStatus = searchParams.get('payment_status');

        if (!paymentRequestId || !paymentId) {
            setStatus('failed');
            setMessage('Invalid payment response. No payment details found.');
            return;
        }

        if (paymentStatus === 'Failed') {
            setStatus('failed');
            setMessage('Payment was not completed. Please try again.');
            return;
        }

        // Verify payment on backend
        api.verifyPayment({ payment_request_id: paymentRequestId, payment_id: paymentId })
            .then(data => {
                if (data.success) {
                    setStatus('success');
                    setMessage(data.message || '🎉 Payment successful! You are now a Premium member.');
                    refreshUser();
                } else {
                    setStatus('failed');
                    setMessage('Payment verification failed. Please contact support.');
                }
            })
            .catch(err => {
                setStatus('failed');
                setMessage(err.error || 'Payment verification failed. Please contact support.');
            });
    }, []);

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ textAlign: 'center', maxWidth: '500px' }}>
                {status === 'verifying' && (
                    <>
                        <div className="spinner" style={{ margin: '0 auto 1.5rem' }} />
                        <h2>Verifying Payment...</h2>
                        <p className="text-muted">Please wait while we confirm your payment.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ color: 'var(--primary)' }}>Welcome to Premium!</h2>
                        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{message}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>You now have access to:</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                                <span className="tag-pill">♾️ Unlimited Links</span>
                                <span className="tag-pill">🎨 Custom Aliases</span>
                                <span className="tag-pill">📱 QR Codes</span>
                                <span className="tag-pill">✏️ Edit Links</span>
                                <span className="tag-pill">📦 Bulk Create</span>
                                <span className="tag-pill">🌈 Themes</span>
                            </div>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '2rem', width: '100%' }}
                            onClick={() => navigate('/dashboard')}
                        >
                            Go to Dashboard →
                        </button>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
                        <h2 style={{ color: '#e74c3c' }}>Payment Failed</h2>
                        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{message}</p>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={() => navigate('/dashboard')}
                        >
                            Back to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
