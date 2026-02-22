const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { queryOne, runSql } = require('../db');
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
        const user = queryOne('SELECT plan FROM users WHERE id = ?', [req.user.id]);
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
        runSql(
            `INSERT INTO payments (user_id, razorpay_order_id, amount, currency, status)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, order.id, amount, 'INR', 'created']
        );

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
            runSql(
                `UPDATE payments SET status = ?, razorpay_payment_id = ? WHERE razorpay_order_id = ?`,
                ['failed', razorpay_payment_id, razorpay_order_id]
            );
            return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
        }

        // Payment verified — update payment record
        runSql(
            `UPDATE payments SET 
                status = ?, 
                razorpay_payment_id = ?, 
                razorpay_signature = ?,
                paid_at = CURRENT_TIMESTAMP
             WHERE razorpay_order_id = ?`,
            ['paid', razorpay_payment_id, razorpay_signature, razorpay_order_id]
        );

        // Upgrade user to premium
        runSql('UPDATE users SET plan = ? WHERE id = ?', ['premium', req.user.id]);

        const user = queryOne('SELECT id, name, email, plan, created_at FROM users WHERE id = ?', [req.user.id]);

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
router.get('/status', authenticate, (req, res) => {
    try {
        const payment = queryOne(
            `SELECT * FROM payments WHERE user_id = ? AND status = 'paid' ORDER BY paid_at DESC`,
            [req.user.id]
        );
        res.json({ isPremium: !!payment, payment });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payment status.' });
    }
});

module.exports = router;
