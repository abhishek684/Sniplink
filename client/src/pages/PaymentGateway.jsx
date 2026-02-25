import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function PaymentGateway() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('card');
    const [processing, setProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Card fields
    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardFlipped, setCardFlipped] = useState(false);

    // UPI
    const [upiId, setUpiId] = useState('');

    // Net Banking
    const [selectedBank, setSelectedBank] = useState('');

    // Wallet
    const [selectedWallet, setSelectedWallet] = useState('');

    // Coupon
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [couponChecking, setCouponChecking] = useState(false);

    const originalPrice = 9;
    const finalPrice = couponApplied ? 0 : originalPrice;

    const isPremium = user?.plan === 'premium';

    useEffect(() => {
        if (isPremium) navigate('/dashboard');
    }, [isPremium]);

    // Card number formatting
    const formatCardNumber = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    const formatExpiry = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 4);
        if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
        return digits;
    };

    const getCardType = () => {
        const num = cardNumber.replace(/\s/g, '');
        if (num.startsWith('4')) return 'visa';
        if (/^5[1-5]/.test(num)) return 'mastercard';
        if (num.startsWith('6')) return 'rupay';
        return 'generic';
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponError('');
        setCouponChecking(true);
        try {
            // small delay for realistic feel
            await new Promise(r => setTimeout(r, 800));
            if (couponCode.trim().toUpperCase() === 'ABHI') {
                setCouponApplied(true);
                setCouponError('');
            } else {
                setCouponError('Invalid coupon code. Please try again.');
                setCouponApplied(false);
            }
        } finally {
            setCouponChecking(false);
        }
    };

    const removeCoupon = () => {
        setCouponApplied(false);
        setCouponCode('');
        setCouponError('');
    };

    const processingSteps = [
        'Connecting to payment gateway...',
        'Verifying payment details...',
        'Processing transaction...',
        'Confirming payment...',
        'Activating Premium...',
    ];

    const handlePay = async () => {
        setError('');

        // Validate based on payment method
        if (!couponApplied) {
            if (activeTab === 'card') {
                const num = cardNumber.replace(/\s/g, '');
                if (num.length < 16) return setError('Please enter a valid 16-digit card number.');
                if (!cardName.trim()) return setError('Please enter the cardholder name.');
                if (cardExpiry.length < 5) return setError('Please enter a valid expiry date (MM/YY).');
                if (cardCvv.length < 3) return setError('Please enter a valid CVV.');
            } else if (activeTab === 'upi') {
                if (!upiId.includes('@')) return setError('Please enter a valid UPI ID (e.g., name@upi).');
            } else if (activeTab === 'netbanking') {
                if (!selectedBank) return setError('Please select a bank.');
            } else if (activeTab === 'wallet') {
                if (!selectedWallet) return setError('Please select a wallet.');
            }
        }

        setProcessing(true);
        setProcessingStep(0);

        // Animate through processing steps
        for (let i = 0; i < processingSteps.length; i++) {
            setProcessingStep(i);
            await new Promise(r => setTimeout(r, couponApplied ? 400 : 700));
        }

        try {
            if (couponApplied) {
                await api.applyCoupon({ coupon_code: couponCode.trim() });
            } else {
                await api.fakePay({ method: activeTab });
            }
            await refreshUser();
            setSuccess(true);
            setTimeout(() => navigate('/payment-success?payment_request_id=coupon&payment_id=free&payment_status=Credit'), 2000);
        } catch (err) {
            setError(err.error || 'Payment failed. Please try again.');
            setProcessing(false);
        }
    };

    const banks = [
        { id: 'sbi', name: 'State Bank of India', icon: '🏦' },
        { id: 'hdfc', name: 'HDFC Bank', icon: '🏛️' },
        { id: 'icici', name: 'ICICI Bank', icon: '🏛️' },
        { id: 'axis', name: 'Axis Bank', icon: '🏦' },
        { id: 'kotak', name: 'Kotak Mahindra Bank', icon: '🏦' },
        { id: 'bob', name: 'Bank of Baroda', icon: '🏦' },
        { id: 'pnb', name: 'Punjab National Bank', icon: '🏦' },
        { id: 'yes', name: 'Yes Bank', icon: '🏦' },
    ];

    const wallets = [
        { id: 'paytm', name: 'Paytm', icon: '💳' },
        { id: 'phonepe', name: 'PhonePe', icon: '📱' },
        { id: 'amazonpay', name: 'Amazon Pay', icon: '🛒' },
        { id: 'freecharge', name: 'Freecharge', icon: '⚡' },
    ];

    // Success screen
    if (success) {
        return (
            <div className="pg-page">
                <div className="pg-success-screen">
                    <div className="pg-success-icon">
                        <svg viewBox="0 0 52 52" className="pg-checkmark-svg">
                            <circle cx="26" cy="26" r="25" fill="none" className="pg-checkmark-circle" />
                            <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" className="pg-checkmark-check" />
                        </svg>
                    </div>
                    <h2>Payment Successful!</h2>
                    <p className="text-muted">Redirecting to your dashboard...</p>
                </div>
            </div>
        );
    }

    // Processing overlay
    if (processing) {
        return (
            <div className="pg-page">
                <div className="pg-processing-screen">
                    <div className="pg-processing-spinner"></div>
                    <h2>Processing Payment</h2>
                    <p className="pg-processing-step">{processingSteps[processingStep]}</p>
                    <div className="pg-processing-bar">
                        <div className="pg-processing-fill" style={{ width: `${((processingStep + 1) / processingSteps.length) * 100}%` }}></div>
                    </div>
                    <p className="pg-processing-note">Please do not close this window or press back button</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pg-page">
            <div className="pg-container">
                {/* Left — Payment Form */}
                <div className="pg-form-section">
                    {/* Header */}
                    <div className="pg-header">
                        <button className="pg-back-btn" onClick={() => navigate('/dashboard')}>
                            ← Back
                        </button>
                        <div className="pg-brand">
                            <div className="pg-brand-icon">🔐</div>
                            <span>Secure Checkout</span>
                        </div>
                    </div>

                    {/* Card Preview */}
                    {activeTab === 'card' && (
                        <div className={`pg-card-preview ${cardFlipped ? 'flipped' : ''}`}>
                            <div className="pg-card-front">
                                <div className="pg-card-chip"></div>
                                <div className={`pg-card-type ${getCardType()}`}>
                                    {getCardType() === 'visa' && 'VISA'}
                                    {getCardType() === 'mastercard' && 'MC'}
                                    {getCardType() === 'rupay' && 'RuPay'}
                                    {getCardType() === 'generic' && '💳'}
                                </div>
                                <div className="pg-card-number">
                                    {cardNumber || '•••• •••• •••• ••••'}
                                </div>
                                <div className="pg-card-details">
                                    <div>
                                        <span className="pg-card-label">CARD HOLDER</span>
                                        <span className="pg-card-value">{cardName || 'YOUR NAME'}</span>
                                    </div>
                                    <div>
                                        <span className="pg-card-label">EXPIRES</span>
                                        <span className="pg-card-value">{cardExpiry || 'MM/YY'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pg-card-back">
                                <div className="pg-card-stripe"></div>
                                <div className="pg-card-cvv-area">
                                    <span className="pg-card-cvv-label">CVV</span>
                                    <span className="pg-card-cvv-value">{cardCvv || '•••'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Method Tabs */}
                    <div className="pg-tabs">
                        <button className={`pg-tab ${activeTab === 'card' ? 'active' : ''}`} onClick={() => setActiveTab('card')}>
                            <span className="pg-tab-icon">💳</span>
                            <span>Card</span>
                        </button>
                        <button className={`pg-tab ${activeTab === 'upi' ? 'active' : ''}`} onClick={() => setActiveTab('upi')}>
                            <span className="pg-tab-icon">📲</span>
                            <span>UPI</span>
                        </button>
                        <button className={`pg-tab ${activeTab === 'netbanking' ? 'active' : ''}`} onClick={() => setActiveTab('netbanking')}>
                            <span className="pg-tab-icon">🏦</span>
                            <span>Net Banking</span>
                        </button>
                        <button className={`pg-tab ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>
                            <span className="pg-tab-icon">👛</span>
                            <span>Wallet</span>
                        </button>
                    </div>

                    {/* Card Form */}
                    {activeTab === 'card' && (
                        <div className="pg-form">
                            <div className="pg-form-group">
                                <label>Card Number</label>
                                <div className="pg-input-icon-wrapper">
                                    <input
                                        type="text"
                                        placeholder="1234 5678 9012 3456"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        maxLength={19}
                                    />
                                    <span className="pg-input-icon">
                                        {getCardType() === 'visa' && '💳'}
                                        {getCardType() === 'mastercard' && '💳'}
                                        {getCardType() === 'rupay' && '💳'}
                                        {getCardType() === 'generic' && '💳'}
                                    </span>
                                </div>
                            </div>
                            <div className="pg-form-group">
                                <label>Cardholder Name</label>
                                <input
                                    type="text"
                                    placeholder="JOHN DOE"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                />
                            </div>
                            <div className="pg-form-row">
                                <div className="pg-form-group">
                                    <label>Expiry Date</label>
                                    <input
                                        type="text"
                                        placeholder="MM/YY"
                                        value={cardExpiry}
                                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                        maxLength={5}
                                    />
                                </div>
                                <div className="pg-form-group">
                                    <label>CVV</label>
                                    <input
                                        type="password"
                                        placeholder="•••"
                                        value={cardCvv}
                                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4}
                                        onFocus={() => setCardFlipped(true)}
                                        onBlur={() => setCardFlipped(false)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* UPI Form */}
                    {activeTab === 'upi' && (
                        <div className="pg-form">
                            <div className="pg-upi-apps">
                                <div className="pg-upi-app">
                                    <div className="pg-upi-app-icon" style={{ background: 'linear-gradient(135deg, #5f259f, #2b2171)' }}>G</div>
                                    <span>GPay</span>
                                </div>
                                <div className="pg-upi-app">
                                    <div className="pg-upi-app-icon" style={{ background: 'linear-gradient(135deg, #5e2d91, #461e78)' }}>P</div>
                                    <span>PhonePe</span>
                                </div>
                                <div className="pg-upi-app">
                                    <div className="pg-upi-app-icon" style={{ background: 'linear-gradient(135deg, #00baf2, #0077c1)' }}>PT</div>
                                    <span>Paytm</span>
                                </div>
                                <div className="pg-upi-app">
                                    <div className="pg-upi-app-icon" style={{ background: 'linear-gradient(135deg, #f7a600, #ff6600)' }}>AM</div>
                                    <span>Amazon</span>
                                </div>
                            </div>
                            <div className="pg-divider-text">
                                <span>OR ENTER UPI ID</span>
                            </div>
                            <div className="pg-form-group">
                                <label>UPI ID</label>
                                <input
                                    type="text"
                                    placeholder="name@okicici"
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Net Banking Form */}
                    {activeTab === 'netbanking' && (
                        <div className="pg-form">
                            <p className="pg-form-subtitle">Select your bank</p>
                            <div className="pg-bank-grid">
                                {banks.map(bank => (
                                    <button
                                        key={bank.id}
                                        className={`pg-bank-option ${selectedBank === bank.id ? 'active' : ''}`}
                                        onClick={() => setSelectedBank(bank.id)}
                                    >
                                        <span className="pg-bank-icon">{bank.icon}</span>
                                        <span className="pg-bank-name">{bank.name}</span>
                                        {selectedBank === bank.id && <span className="pg-bank-check">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Wallet Form */}
                    {activeTab === 'wallet' && (
                        <div className="pg-form">
                            <p className="pg-form-subtitle">Select a wallet</p>
                            <div className="pg-wallet-grid">
                                {wallets.map(w => (
                                    <button
                                        key={w.id}
                                        className={`pg-wallet-option ${selectedWallet === w.id ? 'active' : ''}`}
                                        onClick={() => setSelectedWallet(w.id)}
                                    >
                                        <span className="pg-wallet-icon">{w.icon}</span>
                                        <span>{w.name}</span>
                                        {selectedWallet === w.id && <span className="pg-wallet-check">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && <div className="pg-error">{error}</div>}
                </div>

                {/* Right — Order Summary */}
                <div className="pg-summary-section">
                    <div className="pg-summary-card">
                        <h3>Order Summary</h3>
                        <div className="pg-summary-item">
                            <div className="pg-summary-plan">
                                <span className="pg-plan-badge">PRO</span>
                                <div>
                                    <strong>Sniplink Premium</strong>
                                    <p>Lifetime Access</p>
                                </div>
                            </div>
                        </div>
                        <div className="pg-summary-divider"></div>

                        <div className="pg-summary-row">
                            <span>Subtotal</span>
                            <span>₹{originalPrice}.00</span>
                        </div>
                        <div className="pg-summary-row">
                            <span>GST (18%)</span>
                            <span>{couponApplied ? '₹0.00' : `₹${(originalPrice * 0.18).toFixed(2)}`}</span>
                        </div>
                        {couponApplied && (
                            <div className="pg-summary-row pg-discount">
                                <span>Coupon Discount</span>
                                <span>- ₹{originalPrice}.00</span>
                            </div>
                        )}
                        <div className="pg-summary-divider"></div>
                        <div className="pg-summary-row pg-total">
                            <span>Total</span>
                            <span>
                                {couponApplied && <s className="pg-strike-price">₹{originalPrice}.00</s>}
                                ₹{finalPrice}.00
                            </span>
                        </div>

                        {/* Coupon Code Section */}
                        <div className="pg-coupon-section">
                            <label>🎟️ Have a coupon code?</label>
                            {couponApplied ? (
                                <div className="pg-coupon-applied">
                                    <div className="pg-coupon-badge">
                                        <span>🎉 "{couponCode.toUpperCase()}" applied</span>
                                        <button onClick={removeCoupon} className="pg-coupon-remove">✕</button>
                                    </div>
                                    <p className="pg-coupon-savings">You save ₹{originalPrice}.00! 🎊</p>
                                </div>
                            ) : (
                                <div className="pg-coupon-input-row">
                                    <input
                                        type="text"
                                        placeholder="Enter coupon code"
                                        value={couponCode}
                                        onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                    />
                                    <button onClick={handleApplyCoupon} disabled={couponChecking || !couponCode.trim()} className="pg-coupon-apply-btn">
                                        {couponChecking ? '...' : 'Apply'}
                                    </button>
                                </div>
                            )}
                            {couponError && <p className="pg-coupon-error">{couponError}</p>}
                        </div>

                        {/* Pay Button */}
                        <button className={`pg-pay-btn ${couponApplied ? 'pg-pay-free' : ''}`} onClick={handlePay}>
                            {couponApplied ? '🎉 Activate Premium (Free)' : `🔒 Pay ₹${finalPrice}.00`}
                        </button>

                        {/* Security Badges */}
                        <div className="pg-security">
                            <div className="pg-security-badges">
                                <span className="pg-badge">🔒 256-bit SSL</span>
                                <span className="pg-badge">🛡️ PCI DSS</span>
                                <span className="pg-badge">🏦 RBI Approved</span>
                            </div>
                            <p className="pg-security-text">
                                Your payment information is encrypted and secure. We never store your card details.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
