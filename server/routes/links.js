const express = require('express');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const { queryOne, queryAll, runSql } = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

const FREE_LINK_LIMIT = 5;

// GET /api/links/dashboard-stats — overview stats for dashboard chart
router.get('/dashboard-stats', authenticate, (req, res) => {
    try {
        // Clicks per day (last 30 days) across all user's links
        const clicksByDay = queryAll(`
      SELECT DATE(c.clicked_at) as date, COUNT(*) as count
      FROM clicks c
      INNER JOIN links l ON l.id = c.link_id
      WHERE l.user_id = ? AND c.clicked_at >= datetime('now', '-30 days')
      GROUP BY DATE(c.clicked_at)
      ORDER BY date ASC
    `, [req.user.id]);

        // Top performing links (by clicks)
        const topLinks = queryAll(`
      SELECT l.id, l.title, l.short_code, COUNT(c.id) as click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.user_id = ?
      GROUP BY l.id
      ORDER BY click_count DESC
      LIMIT 5
    `, [req.user.id]);

        // Clicks today
        const todayRow = queryOne(`
      SELECT COUNT(*) as count
      FROM clicks c
      INNER JOIN links l ON l.id = c.link_id
      WHERE l.user_id = ? AND DATE(c.clicked_at) = DATE('now')
    `, [req.user.id]);

        // Clicks this week
        const weekRow = queryOne(`
      SELECT COUNT(*) as count
      FROM clicks c
      INNER JOIN links l ON l.id = c.link_id
      WHERE l.user_id = ? AND c.clicked_at >= datetime('now', '-7 days')
    `, [req.user.id]);

        // Total unique referrers
        const referrerCount = queryOne(`
      SELECT COUNT(DISTINCT CASE WHEN c.referrer != '' THEN c.referrer END) as count
      FROM clicks c
      INNER JOIN links l ON l.id = c.link_id
      WHERE l.user_id = ?
    `, [req.user.id]);

        res.json({
            clicksByDay,
            topLinks,
            clicksToday: todayRow?.count || 0,
            clicksThisWeek: weekRow?.count || 0,
            uniqueReferrers: referrerCount?.count || 0
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
    }
});

// GET /api/links — list user's links with click counts + last clicked
router.get('/', authenticate, (req, res) => {
    try {
        const { tag, search } = req.query;

        let sql = `
      SELECT l.*, 
        COUNT(c.id) as click_count,
        MAX(c.clicked_at) as last_clicked_at
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.user_id = ?
    `;
        const params = [req.user.id];

        if (tag) {
            sql += ` AND l.tags LIKE ?`;
            params.push(`%${tag}%`);
        }
        if (search) {
            sql += ` AND (l.title LIKE ? OR l.original_url LIKE ? OR l.short_code LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += ` GROUP BY l.id ORDER BY l.created_at DESC`;

        const links = queryAll(sql, params);
        res.json({ links });
    } catch (err) {
        console.error('Fetch links error:', err);
        res.status(500).json({ error: 'Failed to fetch links.' });
    }
});

// POST /api/links — create a short link
router.post('/', authenticate, (req, res) => {
    try {
        const { original_url, title, custom_alias, expires_at, tags } = req.body;

        if (!original_url) {
            return res.status(400).json({ error: 'Original URL is required.' });
        }

        // Validate URL
        try {
            new URL(original_url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format. Include http:// or https://' });
        }

        // Get user's current plan
        const user = queryOne('SELECT plan FROM users WHERE id = ?', [req.user.id]);

        // Check free plan limit
        if (user.plan === 'free') {
            const row = queryOne('SELECT COUNT(*) as count FROM links WHERE user_id = ?', [req.user.id]);
            if (row.count >= FREE_LINK_LIMIT) {
                return res.status(403).json({
                    error: `Free plan is limited to ${FREE_LINK_LIMIT} links. Upgrade to Premium for unlimited links!`,
                    limit_reached: true
                });
            }
        }

        // Handle custom alias (premium only)
        let short_code;
        if (custom_alias) {
            if (user.plan !== 'premium') {
                return res.status(403).json({ error: 'Custom aliases are a Premium feature. Upgrade to use them!' });
            }
            if (!/^[a-zA-Z0-9_-]{3,30}$/.test(custom_alias)) {
                return res.status(400).json({ error: 'Custom alias must be 3-30 characters (letters, numbers, hyphens, underscores).' });
            }
            const existing = queryOne('SELECT id FROM links WHERE short_code = ?', [custom_alias]);
            if (existing) {
                return res.status(409).json({ error: 'This custom alias is already taken.' });
            }
            short_code = custom_alias;
        } else {
            short_code = nanoid(7);
        }

        // Handle expiry (premium only)
        let expiryDate = null;
        if (expires_at) {
            if (user.plan !== 'premium') {
                return res.status(403).json({ error: 'Link expiry is a Premium feature. Upgrade to use it!' });
            }
            expiryDate = expires_at;
        }

        const tagsStr = tags || '';

        const result = runSql(
            'INSERT INTO links (user_id, original_url, short_code, title, expires_at, tags) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, original_url, short_code, title || '', expiryDate, tagsStr]
        );

        const link = queryOne('SELECT * FROM links WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({ link: { ...link, click_count: 0, last_clicked_at: null } });
    } catch (err) {
        console.error('Create link error:', err);
        res.status(500).json({ error: 'Failed to create link.' });
    }
});

// POST /api/links/bulk — create multiple short links at once
router.post('/bulk', authenticate, (req, res) => {
    try {
        const { urls } = req.body; // array of { url, title }

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'Provide an array of URLs.' });
        }

        if (urls.length > 20) {
            return res.status(400).json({ error: 'Maximum 20 URLs at once.' });
        }

        const user = queryOne('SELECT plan FROM users WHERE id = ?', [req.user.id]);

        // Check free plan limit
        if (user.plan === 'free') {
            const row = queryOne('SELECT COUNT(*) as count FROM links WHERE user_id = ?', [req.user.id]);
            const remaining = FREE_LINK_LIMIT - row.count;
            if (urls.length > remaining) {
                return res.status(403).json({
                    error: `Free plan: only ${remaining} link(s) remaining. Upgrade to Premium!`,
                    limit_reached: true
                });
            }
        }

        const created = [];
        const errors = [];

        for (const item of urls) {
            try {
                new URL(item.url);
                const short_code = nanoid(7);
                const result = runSql(
                    'INSERT INTO links (user_id, original_url, short_code, title, tags) VALUES (?, ?, ?, ?, ?)',
                    [req.user.id, item.url, short_code, item.title || '', '']
                );
                const link = queryOne('SELECT * FROM links WHERE id = ?', [result.lastInsertRowid]);
                created.push({ ...link, click_count: 0, last_clicked_at: null });
            } catch (e) {
                errors.push({ url: item.url, error: 'Invalid URL' });
            }
        }

        res.status(201).json({ created, errors, total: created.length });
    } catch (err) {
        console.error('Bulk create error:', err);
        res.status(500).json({ error: 'Failed to create links.' });
    }
});

// PUT /api/links/:id — edit a link
router.put('/:id', authenticate, (req, res) => {
    try {
        const link = queryOne('SELECT * FROM links WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.user.id]);
        if (!link) {
            return res.status(404).json({ error: 'Link not found.' });
        }

        const user = queryOne('SELECT plan FROM users WHERE id = ?', [req.user.id]);
        if (user.plan !== 'premium') {
            return res.status(403).json({ error: 'Link editing is a Premium feature.' });
        }

        const { title, original_url, expires_at, is_active, tags } = req.body;

        if (original_url) {
            try { new URL(original_url); } catch {
                return res.status(400).json({ error: 'Invalid URL format.' });
            }
        }

        const newTitle = title !== undefined ? title : link.title;
        const newUrl = original_url || link.original_url;
        const newExpiry = expires_at !== undefined ? expires_at : link.expires_at;
        const newActive = is_active !== undefined ? is_active : link.is_active;
        const newTags = tags !== undefined ? tags : (link.tags || '');

        runSql(`
      UPDATE links SET 
        title = ?,
        original_url = ?,
        expires_at = ?,
        is_active = ?,
        tags = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [newTitle, newUrl, newExpiry, newActive, newTags, parseInt(req.params.id), req.user.id]);

        const updated = queryOne(`
      SELECT l.*, COUNT(c.id) as click_count, MAX(c.clicked_at) as last_clicked_at
      FROM links l LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.id = ?
      GROUP BY l.id
    `, [parseInt(req.params.id)]);

        res.json({ link: updated });
    } catch (err) {
        console.error('Update link error:', err);
        res.status(500).json({ error: 'Failed to update link.' });
    }
});

// DELETE /api/links/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        const link = queryOne('SELECT * FROM links WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.user.id]);
        if (!link) {
            return res.status(404).json({ error: 'Link not found.' });
        }

        runSql('DELETE FROM clicks WHERE link_id = ?', [parseInt(req.params.id)]);
        runSql('DELETE FROM links WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ message: 'Link deleted successfully.' });
    } catch (err) {
        console.error('Delete link error:', err);
        res.status(500).json({ error: 'Failed to delete link.' });
    }
});

// GET /api/links/:id/stats — click analytics
router.get('/:id/stats', authenticate, (req, res) => {
    try {
        const link = queryOne(`
      SELECT l.*, COUNT(c.id) as click_count, MAX(c.clicked_at) as last_clicked_at
      FROM links l LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.id = ? AND l.user_id = ?
      GROUP BY l.id
    `, [parseInt(req.params.id), req.user.id]);

        if (!link) {
            return res.status(404).json({ error: 'Link not found.' });
        }

        // Clicks over last 7 days
        const clicksByDay = queryAll(`
      SELECT DATE(clicked_at) as date, COUNT(*) as count
      FROM clicks
      WHERE link_id = ? AND clicked_at >= datetime('now', '-7 days')
      GROUP BY DATE(clicked_at)
      ORDER BY date ASC
    `, [parseInt(req.params.id)]);

        // Clicks over last 30 days (for the chart)
        const clicksByDay30 = queryAll(`
      SELECT DATE(clicked_at) as date, COUNT(*) as count
      FROM clicks
      WHERE link_id = ? AND clicked_at >= datetime('now', '-30 days')
      GROUP BY DATE(clicked_at)
      ORDER BY date ASC
    `, [parseInt(req.params.id)]);

        // Top referrers
        const referrers = queryAll(`
      SELECT 
        CASE WHEN referrer = '' THEN 'Direct' ELSE referrer END as referrer, 
        COUNT(*) as count
      FROM clicks
      WHERE link_id = ?
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 10
    `, [parseInt(req.params.id)]);

        // Browser/device breakdown
        const browsers = queryAll(`
      SELECT user_agent, COUNT(*) as count
      FROM clicks
      WHERE link_id = ?
      GROUP BY user_agent
      ORDER BY count DESC
      LIMIT 10
    `, [parseInt(req.params.id)]);

        const browserStats = browsers.map(b => {
            let name = 'Unknown';
            const ua = (b.user_agent || '').toLowerCase();
            if (ua.includes('chrome') && !ua.includes('edg')) name = 'Chrome';
            else if (ua.includes('firefox')) name = 'Firefox';
            else if (ua.includes('safari') && !ua.includes('chrome')) name = 'Safari';
            else if (ua.includes('edg')) name = 'Edge';
            else if (ua.includes('opera') || ua.includes('opr')) name = 'Opera';
            return { browser: name, count: b.count };
        });

        // Clicks by hour of day
        const clicksByHour = queryAll(`
      SELECT CAST(strftime('%H', clicked_at) AS INTEGER) as hour, COUNT(*) as count
      FROM clicks
      WHERE link_id = ?
      GROUP BY hour
      ORDER BY hour ASC
    `, [parseInt(req.params.id)]);

        // Recent clicks
        const recentClicks = queryAll(`
      SELECT * FROM clicks
      WHERE link_id = ?
      ORDER BY clicked_at DESC
      LIMIT 20
    `, [parseInt(req.params.id)]);

        res.json({ link, clicksByDay, clicksByDay30, referrers, browserStats, clicksByHour, recentClicks });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// GET /api/links/:id/qr — generate QR code
router.get('/:id/qr', authenticate, async (req, res) => {
    try {
        const link = queryOne('SELECT * FROM links WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.user.id]);
        if (!link) {
            return res.status(404).json({ error: 'Link not found.' });
        }

        const user = queryOne('SELECT plan FROM users WHERE id = ?', [req.user.id]);
        if (user.plan !== 'premium') {
            return res.status(403).json({ error: 'QR codes are a Premium feature.' });
        }

        const shortUrl = `${process.env.BASE_URL}/${link.short_code}`;
        const qrDataUrl = await QRCode.toDataURL(shortUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#1a1a2e', light: '#ffffff' }
        });

        res.json({ qr: qrDataUrl, url: shortUrl });
    } catch (err) {
        console.error('QR generation error:', err);
        res.status(500).json({ error: 'Failed to generate QR code.' });
    }
});

module.exports = router;
