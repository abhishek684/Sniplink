const express = require('express');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const { supabase } = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

const FREE_LINK_LIMIT = 5;

// GET /api/links/dashboard-stats — overview stats for dashboard chart
router.get('/dashboard-stats', authenticate, async (req, res) => {
    try {
        // Since Supabase JS client doesn't support complex group by with dates natively,
        // we can fetch all clicks for the last 30 days and process them in JS
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch User's Links mapping
        const { data: userLinks } = await supabase.from('links').select('id, title, short_code').eq('user_id', req.user.id);
        const userLinkIds = userLinks ? userLinks.map(l => l.id) : [];

        if (userLinkIds.length === 0) {
            return res.json({ clicksByDay: [], topLinks: [], clicksToday: 0, clicksThisWeek: 0, uniqueReferrers: 0 });
        }

        // Fetch Clicks for those links from last 30 days
        const { data: allClicks, error: clicksError } = await supabase
            .from('clicks')
            .select('link_id, clicked_at, referrer')
            .in('link_id', userLinkIds)
            .gte('clicked_at', thirtyDaysAgo.toISOString());

        if (clicksError) throw clicksError;

        // Process Dashboard Stats
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - 7);

        let clicksToday = 0;
        let clicksThisWeek = 0;
        const referrers = new Set();
        const dailyCount = {};
        const linkClickCounts = {};

        userLinks.forEach(l => linkClickCounts[l.id] = 0);

        (allClicks || []).forEach(click => {
            const clickedAt = new Date(click.clicked_at);
            const dateStr = clickedAt.toISOString().split('T')[0];

            // Daily chart aggregation
            dailyCount[dateStr] = (dailyCount[dateStr] || 0) + 1;

            // Link click counting for Top Links
            if (linkClickCounts[click.link_id] !== undefined) {
                linkClickCounts[click.link_id]++;
            }

            // Timed Metrics
            if (clickedAt >= startOfToday) clicksToday++;
            if (clickedAt >= startOfWeek) clicksThisWeek++;

            // Unique Referrers
            if (click.referrer) referrers.add(click.referrer);
        });

        const clicksByDay = Object.keys(dailyCount).sort().map(date => ({
            date, count: dailyCount[date]
        }));

        const topLinks = userLinks.map(l => ({
            id: l.id, title: l.title, short_code: l.short_code, click_count: linkClickCounts[l.id]
        })).sort((a, b) => b.click_count - a.click_count).slice(0, 5);

        res.json({
            clicksByDay,
            topLinks,
            clicksToday,
            clicksThisWeek,
            uniqueReferrers: referrers.size
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
    }
});

// GET /api/links — list user's links with click counts + last clicked
router.get('/', authenticate, async (req, res) => {
    try {
        const { tag, search } = req.query;

        let query = supabase.from('links').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });

        if (tag) {
            query = query.ilike('tags', `%${tag}%`);
        }
        if (search) {
            query = query.or(`title.ilike.%${search}%,original_url.ilike.%${search}%,short_code.ilike.%${search}%`);
        }

        const { data: links, error } = await query;
        if (error) throw error;

        // Fetch click counts & last clicked
        if (links && links.length > 0) {
            const linkIds = links.map(l => l.id);
            const { data: clicks } = await supabase.from('clicks').select('link_id, clicked_at').in('link_id', linkIds);

            const linkStats = {};
            linkIds.forEach(id => linkStats[id] = { count: 0, last: null });

            (clicks || []).forEach(c => {
                linkStats[c.link_id].count++;
                if (!linkStats[c.link_id].last || new Date(c.clicked_at) > new Date(linkStats[c.link_id].last)) {
                    linkStats[c.link_id].last = c.clicked_at;
                }
            });

            links.forEach(l => {
                l.click_count = linkStats[l.id].count;
                l.last_clicked_at = linkStats[l.id].last;
            });
        }

        res.json({ links: links || [] });
    } catch (err) {
        console.error('Fetch links error:', err);
        res.status(500).json({ error: 'Failed to fetch links.' });
    }
});

// POST /api/links — create a short link
router.post('/', authenticate, async (req, res) => {
    try {
        const { original_url, title, custom_alias, expires_at, tags } = req.body;

        if (!original_url) return res.status(400).json({ error: 'Original URL is required.' });

        try { new URL(original_url); } catch {
            return res.status(400).json({ error: 'Invalid URL format. Include http:// or https://' });
        }

        const { data: user } = await supabase.from('users').select('plan').eq('id', req.user.id).single();

        if (user.plan === 'free') {
            const { count } = await supabase.from('links').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id);
            if (count >= FREE_LINK_LIMIT) {
                return res.status(403).json({
                    error: `Free plan is limited to ${FREE_LINK_LIMIT} links. Upgrade to Premium for unlimited links!`,
                    limit_reached: true
                });
            }
        }

        let short_code;
        if (custom_alias) {
            if (user.plan !== 'premium') return res.status(403).json({ error: 'Custom aliases are a Premium feature.' });
            if (!/^[a-zA-Z0-9_-]{3,30}$/.test(custom_alias)) return res.status(400).json({ error: 'Invalid custom alias.' });

            const { data: existing } = await supabase.from('links').select('id').eq('short_code', custom_alias).maybeSingle();
            if (existing) return res.status(409).json({ error: 'This custom alias is already taken.' });

            short_code = custom_alias;
        } else {
            short_code = nanoid(7);
        }

        let expiryDate = null;
        if (expires_at) {
            if (user.plan !== 'premium') return res.status(403).json({ error: 'Link expiry is a Premium feature.' });
            expiryDate = expires_at;
        }

        const { data: link, error } = await supabase.from('links').insert({
            user_id: req.user.id,
            original_url,
            short_code,
            title: title || '',
            expires_at: expiryDate,
            tags: tags || ''
        }).select().single();

        if (error) throw error;

        res.status(201).json({ link: { ...link, click_count: 0, last_clicked_at: null } });
    } catch (err) {
        console.error('Create link error:', err);
        res.status(500).json({ error: 'Failed to create link.' });
    }
});

// POST /api/links/bulk — create multiple short links at once
router.post('/bulk', authenticate, async (req, res) => {
    try {
        const { urls } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'Provide an array of URLs.' });
        if (urls.length > 20) return res.status(400).json({ error: 'Maximum 20 URLs at once.' });

        const { data: user } = await supabase.from('users').select('plan').eq('id', req.user.id).single();

        if (user.plan === 'free') {
            const { count } = await supabase.from('links').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id);
            const remaining = FREE_LINK_LIMIT - count;
            if (urls.length > remaining) {
                return res.status(403).json({
                    error: `Free plan: only ${remaining} link(s) remaining. Upgrade to Premium!`,
                    limit_reached: true
                });
            }
        }

        const created = [];
        const errors = [];
        const toInsert = [];

        for (let i = 0; i < urls.length; i++) {
            const item = urls[i];
            try {
                new URL(item.url);
                toInsert.push({
                    user_id: req.user.id,
                    original_url: item.url,
                    short_code: nanoid(7),
                    title: item.title || '',
                    tags: ''
                });
            } catch (e) {
                errors.push({ url: item.url, error: 'Invalid URL' });
            }
        }

        if (toInsert.length > 0) {
            const { data: inserted, error } = await supabase.from('links').insert(toInsert).select();
            if (error) throw error;
            inserted.forEach(l => created.push({ ...l, click_count: 0, last_clicked_at: null }));
        }

        res.status(201).json({ created, errors, total: created.length });
    } catch (err) {
        console.error('Bulk create error:', err);
        res.status(500).json({ error: 'Failed to create links.' });
    }
});

// PUT /api/links/:id — edit a link
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { data: link } = await supabase.from('links').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
        if (!link) return res.status(404).json({ error: 'Link not found.' });

        const { data: user } = await supabase.from('users').select('plan').eq('id', req.user.id).single();
        if (user.plan !== 'premium') return res.status(403).json({ error: 'Link editing is a Premium feature.' });

        const { title, original_url, expires_at, is_active, tags } = req.body;
        if (original_url) {
            try { new URL(original_url); } catch { return res.status(400).json({ error: 'Invalid URL format.' }); }
        }

        const updates = {
            title: title !== undefined ? title : link.title,
            original_url: original_url || link.original_url,
            expires_at: expires_at !== undefined ? expires_at : link.expires_at,
            is_active: is_active !== undefined ? is_active : link.is_active,
            tags: tags !== undefined ? tags : (link.tags || ''),
            updated_at: new Date().toISOString()
        };

        const { data: updated, error } = await supabase.from('links').update(updates).eq('id', req.params.id).select().single();
        if (error) throw error;

        const { count } = await supabase.from('clicks').select('*', { count: 'exact', head: true }).eq('link_id', req.params.id);
        const { data: lastClick } = await supabase.from('clicks').select('clicked_at').eq('link_id', req.params.id).order('clicked_at', { ascending: false }).limit(1).maybeSingle();

        res.json({ link: { ...updated, click_count: count || 0, last_clicked_at: lastClick?.clicked_at || null } });
    } catch (err) {
        console.error('Update link error:', err);
        res.status(500).json({ error: 'Failed to update link.' });
    }
});

// DELETE /api/links/:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { data: link } = await supabase.from('links').select('id').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
        if (!link) return res.status(404).json({ error: 'Link not found.' });

        await supabase.from('clicks').delete().eq('link_id', req.params.id);
        await supabase.from('links').delete().eq('id', req.params.id);

        res.json({ message: 'Link deleted successfully.' });
    } catch (err) {
        console.error('Delete link error:', err);
        res.status(500).json({ error: 'Failed to delete link.' });
    }
});

// GET /api/links/:id/stats — click analytics
router.get('/:id/stats', authenticate, async (req, res) => {
    try {
        const { data: link } = await supabase.from('links').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
        if (!link) return res.status(404).json({ error: 'Link not found.' });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: allClicks } = await supabase.from('clicks').select('*').eq('link_id', link.id).gte('clicked_at', thirtyDaysAgo.toISOString());

        // Process aggregates in JS equivalent to SQLite queries
        const clicksByDay30 = {};
        const clicksByDay = {}; // 7 days
        const referrersMap = {};
        const browsersMap = {};
        const hoursMap = {};

        (allClicks || []).forEach(c => {
            const date = new Date(c.clicked_at);
            const dateStr = date.toISOString().split('T')[0];
            const hourStr = date.getHours();

            // 30 days
            clicksByDay30[dateStr] = (clicksByDay30[dateStr] || 0) + 1;

            // 7 days
            if (date >= sevenDaysAgo) {
                clicksByDay[dateStr] = (clicksByDay[dateStr] || 0) + 1;
            }

            // referrers
            let ref = c.referrer || 'Direct';
            referrersMap[ref] = (referrersMap[ref] || 0) + 1;

            // browsers
            let bName = 'Unknown';
            const ua = (c.user_agent || '').toLowerCase();
            if (ua.includes('chrome') && !ua.includes('edg')) bName = 'Chrome';
            else if (ua.includes('firefox')) bName = 'Firefox';
            else if (ua.includes('safari') && !ua.includes('chrome')) bName = 'Safari';
            else if (ua.includes('edg')) bName = 'Edge';
            else if (ua.includes('opera') || ua.includes('opr')) bName = 'Opera';

            browsersMap[bName] = (browsersMap[bName] || 0) + 1;

            // hours
            hoursMap[hourStr] = (hoursMap[hourStr] || 0) + 1;
        });

        const formatData = (map) => Object.keys(map).map(k => ({ label: k, count: map[k] })).sort((a, b) => b.count - a.count);

        // Formatted responses
        const linkWithStats = {
            ...link,
            click_count: allClicks?.length || 0,
            last_clicked_at: allClicks?.length ? allClicks.sort((a, b) => new Date(b.clicked_at) - new Date(a.clicked_at))[0].clicked_at : null
        };

        res.json({
            link: linkWithStats,
            clicksByDay: Object.keys(clicksByDay).sort().map(d => ({ date: d, count: clicksByDay[d] })),
            clicksByDay30: Object.keys(clicksByDay30).sort().map(d => ({ date: d, count: clicksByDay30[d] })),
            referrers: Object.keys(referrersMap).map(k => ({ referrer: k, count: referrersMap[k] })).sort((a, b) => b.count - a.count).slice(0, 10),
            browserStats: Object.keys(browsersMap).map(k => ({ browser: k, count: browsersMap[k] })).sort((a, b) => b.count - a.count).slice(0, 10),
            clicksByHour: Object.keys(hoursMap).sort((a, b) => Number(a) - Number(b)).map(k => ({ hour: Number(k), count: hoursMap[k] })),
            recentClicks: (allClicks || []).sort((a, b) => new Date(b.clicked_at) - new Date(a.clicked_at)).slice(0, 20)
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// GET /api/links/:id/qr — generate QR code
router.get('/:id/qr', authenticate, async (req, res) => {
    try {
        const { data: link } = await supabase.from('links').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
        if (!link) return res.status(404).json({ error: 'Link not found.' });

        const { data: user } = await supabase.from('users').select('plan').eq('id', req.user.id).single();
        if (user.plan !== 'premium') return res.status(403).json({ error: 'QR codes are a Premium feature.' });

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
