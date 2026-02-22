require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase, supabase } = require('./db');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/links', require('./routes/links'));
app.use('/api/payment', require('./routes/payment'));

// Redirect handler — GET /:shortCode
app.get('/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;

        // Skip if it looks like an API or static file request
        if (shortCode.startsWith('api') || shortCode.includes('.')) {
            return res.status(404).json({ error: 'Not found' });
        }

        const { data: link, error } = await supabase.from('links').select('*').eq('short_code', shortCode).maybeSingle();

        if (error) {
            console.error('Fetch shortlink error:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if (!link) {
            return res.status(404).json({ error: 'Short link not found.' });
        }

        if (!link.is_active) {
            return res.status(410).json({ error: 'This link has been deactivated.' });
        }

        // Check expiry
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return res.status(410).json({ error: 'This link has expired.' });
        }

        // Record click
        try {
            await supabase.from('clicks').insert({
                link_id: link.id,
                referrer: req.headers.referer || '',
                user_agent: req.headers['user-agent'] || '',
                ip_address: req.ip || ''
            });
        } catch (clickErr) {
            console.error('Failed to log click:', clickErr);
            // Don't fail the redirect if logging the click fails
        }

        // Redirect
        res.redirect(302, link.original_url);
    } catch (err) {
        console.error('Redirect error:', err);
        res.status(500).json({ error: 'Server error during redirect.' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// Initialize database then start server
initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 URL Shortener server running on http://0.0.0.0:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
