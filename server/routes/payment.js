const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { supabase } = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payment/create-order — create a Razorpay order
router.post('/create-order', authenticate, async (req, res) => {
    try {
        // Check if already premium
        const { data: user } = await supabase.from('users').select('plan').eq('id', req.user.id).single();
        if (user && user.plan === 'premium') {
            return res.status(400).json({ error: 'You are already a Premium member!' });
        }

        const amount = parseInt(process.env.PREMIUM_PRICE) || 49900; // ₹499 in paise

        const order = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt: `premium_${req.user.id}_${Date.now()}`,
            notes: {
                user_id: String(req.user.id),
                plan: 'premium',
            },
        });

        // Save order to DB
        await supabase.from('payments').insert({
            user_id: req.user.id,
            razorpay_order_id: order.id,
            amount: amount,
            currency: 'INR',
            status: 'created'
        });

        res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
});

// POST /api/payment/verify — verify Razorpay payment signature and upgrade user
router.post('/verify', authenticate, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment details.' });
        }

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            // Update payment status to failed
            await supabase.from('payments').update({
                status: 'failed',
                razorpay_payment_id
            }).eq('razorpay_order_id', razorpay_order_id);

            return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
        }

        // Payment verified — update payment record
        await supabase.from('payments').update({
            status: 'paid',
            razorpay_payment_id,
            razorpay_signature,
            paid_at: new Date().toISOString()
        }).eq('razorpay_order_id', razorpay_order_id);

        // Upgrade user to premium
        await supabase.from('users').update({ plan: 'premium' }).eq('id', req.user.id);

        const { data: user } = await supabase.from('users').select('id, name, email, plan, created_at').eq('id', req.user.id).single();

        res.json({
            success: true,
            message: '🎉 Payment successful! You are now a Premium member.',
            user,
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

module.exports = router;
