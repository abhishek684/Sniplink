const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const { supabase } = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Resend HTTP email client — no SMTP ports needed, works on all cloud hosts
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to generate 6 digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check if user already exists
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Generate OTP and expiration (10 minutes)
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Upsert OTP code
        await supabase.from('otp_codes').upsert({ email, code: otp, expires_at: expiresAt }, { onConflict: 'email' });

        // Send Email via Resend HTTP API (no SMTP port needed)
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'Sniplink <onboarding@resend.dev>',
            to: [email],
            subject: 'Sniplink - Verify your email',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #eaeaea; border-radius: 10px; background-color: #fcfcfc;">
                    <h2 style="color: #6c5ce7; margin-bottom: 20px;">Sniplink</h2>
                    <p style="font-size: 16px;">Hi <b>${name}</b>,</p>
                    <p style="font-size: 16px;">Your one-time password (OTP) for verifying your email is:</p>
                    <h1 style="color: #00cec9; letter-spacing: 5px; font-size: 36px; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; display: inline-block;">${otp}</h1>
                    <p style="color: #888; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
                </div>
            `
        });

        if (emailError) {
            console.error('Resend email error:', emailError);
            return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
        }

        console.log('OTP email sent successfully via Resend:', emailData?.id);
        res.json({ message: 'OTP sent successfully.' });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ error: 'Failed to send OTP email. Please check configuration.' });
    }
});

// POST /api/auth/signup — Direct signup (no OTP needed)
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check if user already exists
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Create user directly
        const password_hash = await bcrypt.hash(password, 12);

        const { data: newUser, error: insertError } = await supabase.from('users').insert({
            name, email, password_hash, plan: 'free'
        }).select().single();

        if (insertError) throw insertError;

        const payload = { id: newUser.id, name: newUser.name, email: newUser.email, plan: newUser.plan };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user: payload });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error during signup.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const payload = { id: user.id, name: user.name, email: user.email, plan: user.plan };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: payload });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    try {
        const { data: user } = await supabase.from('users').select('id, name, email, plan, created_at').eq('id', req.user.id).maybeSingle();
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user });
    } catch (err) {
        console.error('Get me error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/auth/upgrade
router.post('/upgrade', authenticate, async (req, res) => {
    try {
        const { data: user, error } = await supabase.from('users').update({ plan: 'premium' }).eq('id', req.user.id).select('id, name, email, plan, created_at').single();
        if (error) throw error;
        res.json({ user, message: 'Upgraded to Premium!' });
    } catch (err) {
        console.error('Upgrade error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
