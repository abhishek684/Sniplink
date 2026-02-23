const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dns = require('dns');
const { supabase } = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Resolve SMTP host to IPv4 explicitly — cloud hosts like Render often fail on IPv6
async function createTransporter() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    let host = smtpHost;
    try {
        const addresses = await dns.promises.resolve4(smtpHost);
        if (addresses && addresses.length > 0) {
            host = addresses[0]; // Use the first IPv4 address
            console.log(`Resolved ${smtpHost} to IPv4: ${host}`);
        }
    } catch (err) {
        console.warn(`Could not resolve ${smtpHost} to IPv4, using hostname directly:`, err.message);
    }

    return nodemailer.createTransport({
        host: host,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        family: 4,
        tls: {
            servername: smtpHost, // Required for TLS when connecting to IP instead of hostname
        },
    });
}

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

        // Send Email
        const mailOptions = {
            from: `"Sniplink" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Sniplink - Verify your email',
            text: `Hi ${name},\n\nYour OTP for Sniplink signup is: ${otp}\n\nThis code will expire in 10 minutes.\n\nThanks,\nSniplink Team`,
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #eaeaea; border-radius: 10px; background-color: #fcfcfc;">
                    <h2 style="color: #6c5ce7; margin-bottom: 20px;">Sniplink</h2>
                    <p style="font-size: 16px;">Hi <b>${name}</b>,</p>
                    <p style="font-size: 16px;">Your one-time password (OTP) for verifying your email is:</p>
                    <h1 style="color: #00cec9; letter-spacing: 5px; font-size: 36px; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; display: inline-block;">${otp}</h1>
                    <p style="color: #888; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
                </div>
            `
        };

        const transporter = await createTransporter();
        await transporter.sendMail(mailOptions);

        res.json({ message: 'OTP sent successfully.' });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ error: 'Failed to send OTP email. Please check configuration.' });
    }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;

        if (!name || !email || !password || !otp) {
            return res.status(400).json({ error: 'Name, email, password, and OTP are required.' });
        }

        // Verify OTP
        const { data: otpRecord } = await supabase.from('otp_codes').select('code, expires_at').eq('email', email).maybeSingle();

        if (!otpRecord) {
            return res.status(400).json({ error: 'OTP not requested or expired. Please request a new one.' });
        }

        if (otpRecord.code !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }

        if (new Date(otpRecord.expires_at) < new Date()) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // Check again if user exists to prevent race conditions
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Valid OTP — proceed with signup
        const password_hash = await bcrypt.hash(password, 12);

        const { data: newUser, error: insertError } = await supabase.from('users').insert({
            name, email, password_hash, plan: 'free'
        }).select().single();

        if (insertError) throw insertError;

        // Delete used OTP
        await supabase.from('otp_codes').delete().eq('email', email);

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
