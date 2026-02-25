const express = require('express');
const { supabase } = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Instamojo REST API helper
const INSTAMOJO_BASE = process.env.INSTAMOJO_BASE_URL || 'https://test.instamojo.com';
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY;
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;

async function instamojoRequest(endpoint, options = {}) {
    const url = `${INSTAMOJO_BASE}/api/1.1/${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'X-Api-Key': INSTAMOJO_API_KEY,
            'X-Auth-Token': INSTAMOJO_AUTH_TOKEN,
            ...(options.headers || {}),
        },
    });
    return res.json();
}

// POST /api/payment/create-order — create an Instamojo payment request
router.post('/create-order', authenticate, async (req, res) => {
    try {
        // Check if already premium
        const { data: user } = await supabase.from('users').select('plan, name, email').eq('id', req.user.id).single();
        if (user && user.plan === 'premium') {
            return res.status(400).json({ error: 'You are already a Premium member!' });
        }

        const amountInRupees = Math.max(9, (parseInt(process.env.PREMIUM_PRICE) || 49900) / 100); // Instamojo minimum ₹9
        const amount = amountInRupees.toFixed(2);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const redirectUrl = `${clientUrl}/payment-success`;

        // Create Instamojo payment request
        const params = new URLSearchParams();
        params.append('amount', amount);
        params.append('purpose', 'Sniplink Premium - Lifetime');
        params.append('buyer_name', user.name || 'User');
        params.append('email', user.email);
        params.append('phone', '9999999999'); // placeholder — Instamojo requires phone
        params.append('redirect_url', redirectUrl);
        params.append('send_email', 'false');
        params.append('send_sms', 'false');
        params.append('allow_repeated_payments', 'false');

        console.log('Instamojo request URL:', `${INSTAMOJO_BASE}/api/1.1/payment-requests/`);
        console.log('Instamojo params:', { amount, purpose: 'Sniplink Premium - Lifetime', buyer_name: user.name, email: user.email, redirect_url: redirectUrl });

        const data = await instamojoRequest('payment-requests/', {
            method: 'POST',
            body: params,
        });

        console.log('Instamojo response:', JSON.stringify(data));

        if (!data.success) {
            console.error('Instamojo create error:', JSON.stringify(data));
            const detail = data.message ? JSON.stringify(data.message) : JSON.stringify(data);
            return res.status(500).json({ error: `Payment failed: ${detail}` });
        }

        const paymentRequest = data.payment_request;

        // Save order to DB
        await supabase.from('payments').insert({
            user_id: req.user.id,
            razorpay_order_id: paymentRequest.id, // reusing column for instamojo payment_request_id
            amount: parseInt(process.env.PREMIUM_PRICE) || 49900,
            currency: 'INR',
            status: 'created'
        });

        res.json({
            payment_url: paymentRequest.longurl,
            payment_request_id: paymentRequest.id,
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
});

// POST /api/payment/verify — verify Instamojo payment and upgrade user
router.post('/verify', authenticate, async (req, res) => {
    try {
        const { payment_request_id, payment_id } = req.body;

        if (!payment_request_id || !payment_id) {
            return res.status(400).json({ error: 'Missing payment details.' });
        }

        // Fetch payment request details from Instamojo
        const data = await instamojoRequest(`payment-requests/${payment_request_id}/${payment_id}/`);

        if (!data.success) {
            console.error('Instamojo verify error:', data);
            await supabase.from('payments').update({
                status: 'failed',
                razorpay_payment_id: payment_id
            }).eq('razorpay_order_id', payment_request_id);

            return res.status(400).json({ error: 'Payment verification failed.' });
        }

        const payment = data.payment_request;
        const paymentStatus = payment.payment?.status;

        if (paymentStatus !== 'Credit') {
            await supabase.from('payments').update({
                status: 'failed',
                razorpay_payment_id: payment_id
            }).eq('razorpay_order_id', payment_request_id);

            return res.status(400).json({ error: 'Payment was not successful.' });
        }

        // Payment verified — update payment record
        await supabase.from('payments').update({
            status: 'paid',
            razorpay_payment_id: payment_id,
            paid_at: new Date().toISOString()
        }).eq('razorpay_order_id', payment_request_id);

        // Upgrade user to premium
        await supabase.from('users').update({ plan: 'premium' }).eq('id', req.user.id);

        const { data: updatedUser } = await supabase.from('users').select('id, name, email, plan, created_at').eq('id', req.user.id).single();

        res.json({
            success: true,
            message: '🎉 Payment successful! You are now a Premium member.',
            user: updatedUser,
        });
    } catch (err) {
        console.error('Verify payment error:', err);
        res.status(500).json({ error: 'Payment verification failed.' });
    }
});

// GET /api/payment/status — check payment history
router.get('/status', authenticate, async (req, res) => {
    try {
        const { data: payment } = await supabase.from('payments')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        res.json({ isPremium: !!payment, payment });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payment status.' });
    }
});
// POST /api/payment/apply-coupon — validate coupon code and upgrade user
router.post('/apply-coupon', authenticate, async (req, res) => {
    try {
        const { coupon_code } = req.body;

        if (!coupon_code) {
            return res.status(400).json({ error: 'Coupon code is required.' });
        }

        // Check if already premium
        const { data: user } = await supabase.from('users').select('plan').eq('id', req.user.id).single();
        if (user && user.plan === 'premium') {
            return res.status(400).json({ error: 'You are already a Premium member!' });
        }

        // Validate coupon code (case-insensitive)
        if (coupon_code.trim().toUpperCase() !== 'ABHI') {
            return res.status(400).json({ error: 'Invalid coupon code.' });
        }

        // Save payment record
        await supabase.from('payments').insert({
            user_id: req.user.id,
            razorpay_order_id: `COUPON_${Date.now()}`,
            razorpay_payment_id: `FREE_${coupon_code.toUpperCase()}_${Date.now()}`,
            amount: 0,
            currency: 'INR',
            status: 'paid',
            paid_at: new Date().toISOString()
        });

        // Upgrade user to premium
        await supabase.from('users').update({ plan: 'premium' }).eq('id', req.user.id);

        const { data: updatedUser } = await supabase.from('users').select('id, name, email, plan, created_at').eq('id', req.user.id).single();

        res.json({
            success: true,
            message: '🎉 Coupon applied! You are now a Premium member.',
            user: updatedUser,
        });
    } catch (err) {
        console.error('Apply coupon error:', err);
        res.status(500).json({ error: 'Failed to apply coupon code.' });
    }
});

// POST /api/payment/fake-pay — simulate payment and upgrade user
router.post('/fake-pay', authenticate, async (req, res) => {
    try {
        const { method } = req.body;

        // Check if already premium
        const { data: user } = await supabase.from('users').select('plan').eq('id', req.user.id).single();
        if (user && user.plan === 'premium') {
            return res.status(400).json({ error: 'You are already a Premium member!' });
        }

        // Save payment record
        await supabase.from('payments').insert({
            user_id: req.user.id,
            razorpay_order_id: `PAY_${Date.now()}`,
            razorpay_payment_id: `TXN_${method || 'card'}_${Date.now()}`,
            amount: 900, // ₹9 in paise
            currency: 'INR',
            status: 'paid',
            paid_at: new Date().toISOString()
        });

        // Upgrade user to premium
        await supabase.from('users').update({ plan: 'premium' }).eq('id', req.user.id);

        const { data: updatedUser } = await supabase.from('users').select('id, name, email, plan, created_at').eq('id', req.user.id).single();

        res.json({
            success: true,
            message: '🎉 Payment successful! You are now a Premium member.',
            user: updatedUser,
        });
    } catch (err) {
        console.error('Fake pay error:', err);
        res.status(500).json({ error: 'Payment processing failed.' });
    }
});

module.exports = router;
