const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { queryOne, queryAll, runSql } = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

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
        const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Generate OTP and expiration (10 minutes)
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Upsert OTP code
        const existingOtp = queryOne('SELECT email FROM otp_codes WHERE email = ?', [email]);
        if (existingOtp) {
            runSql('UPDATE otp_codes SET code = ?, expires_at = ? WHERE email = ?', [otp, expiresAt, email]);
        } else {
            runSql('INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt]);
        }

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
        const otpRecord = queryOne('SELECT code, expires_at FROM otp_codes WHERE email = ?', [email]);
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
        const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Valid OTP — proceed with signup
        const password_hash = await bcrypt.hash(password, 12);

        const result = runSql(
            'INSERT INTO users (name, email, password_hash, plan) VALUES (?, ?, ?, ?)',
            [name, email, password_hash, 'free']
        );

        // Delete used OTP
        runSql('DELETE FROM otp_codes WHERE email = ?', [email]);

        const user = { id: result.lastInsertRowid, name, email, plan: 'free' };
        const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user });
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

        const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
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
router.get('/me', authenticate, (req, res) => {
    const user = queryOne('SELECT id, name, email, plan, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
});

// POST /api/auth/upgrade
router.post('/upgrade', authenticate, (req, res) => {
    runSql('UPDATE users SET plan = ? WHERE id = ?', ['premium', req.user.id]);
    const user = queryOne('SELECT id, name, email, plan, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json({ user, message: 'Upgraded to Premium!' });
});

module.exports = router;
