import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import EditLinkModal from '../components/EditLinkModal';

export default function Dashboard() {
    const { user, refreshUser } = useAuth();
    const { theme, setTheme, THEMES } = useTheme();
    const navigate = useNavigate();
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Dashboard stats
    const [dashStats, setDashStats] = useState(null);

    // Create form state
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [tags, setTags] = useState('');
    const [customAlias, setCustomAlias] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [creating, setCreating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Search & filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTag, setFilterTag] = useState('');

    // Modals
    const [editLink, setEditLink] = useState(null);
    const [qrData, setQrData] = useState(null);
    const [showBulk, setShowBulk] = useState(false);
    const [bulkUrls, setBulkUrls] = useState('');
    const [bulkCreating, setBulkCreating] = useState(false);
    const [showThemes, setShowThemes] = useState(false);

    // Payment & Premium Modal
    const [upgrading, setUpgrading] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    const isPremium = user?.plan === 'premium';
    const BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.hostname + ':5000');

    useEffect(() => {
        fetchLinks();
        fetchDashStats();
    }, []);

    const fetchLinks = async (params) => {
        try {
            const data = await api.getLinks(params);
            setLinks(data.links);
        } catch (err) {
            setError('Failed to load links.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDashStats = async () => {
        try {
            const data = await api.getDashboardStats();
            setDashStats(data);
        } catch (err) { /* silent */ }
    };

    const handleSearch = (q) => {
        setSearchQuery(q);
        const params = {};
        if (q) params.search = q;
        if (filterTag) params.tag = filterTag;
        fetchLinks(Object.keys(params).length ? params : undefined);
    };

    const handleTagFilter = (tag) => {
        setFilterTag(tag === filterTag ? '' : tag);
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (tag !== filterTag) params.tag = tag;
        fetchLinks(Object.keys(params).length ? params : undefined);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setCreating(true);
        try {
            const body = { original_url: url, title, tags };
            if (customAlias) body.custom_alias = customAlias;
            if (expiresAt) body.expires_at = expiresAt;
            const data = await api.createLink(body);
            setLinks([data.link, ...links]);
            setUrl(''); setTitle(''); setTags(''); setCustomAlias(''); setExpiresAt('');
            setSuccess('Link created!');
            fetchDashStats();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.error || 'Failed to create link.');
            setTimeout(() => setError(''), 5000);
        } finally {
            setCreating(false);
        }
    };

    const handleBulkCreate = async () => {
        if (!isPremium) {
            setError('Bulk create is a Premium feature. Upgrade to use it!');
            setTimeout(() => setError(''), 4000);
            return;
        }
        setError(''); setSuccess('');
        setBulkCreating(true);
        try {
            const lines = bulkUrls.split('\n').filter(l => l.trim());
            const urls = lines.map(line => {
                const parts = line.split('|').map(p => p.trim());
                return { url: parts[0], title: parts[1] || '' };
            });
            const data = await api.bulkCreate({ urls });
            setLinks([...data.created, ...links]);
            setBulkUrls('');
            setShowBulk(false);
            setSuccess(`${data.total} link(s) created!${data.errors.length ? ` ${data.errors.length} failed.` : ''}`);
            fetchDashStats();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err.error || 'Bulk creation failed.');
            setTimeout(() => setError(''), 5000);
        } finally {
            setBulkCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this link?')) return;
        try {
            await api.deleteLink(id);
            setLinks(links.filter(l => l.id !== id));
            fetchDashStats();
        } catch (err) {
            setError(err.error || 'Failed to delete link.');
        }
    };

    const handleCopy = (shortCode) => {
        navigator.clipboard.writeText(`${BASE_URL}/${shortCode}`);
        setSuccess('Copied to clipboard!');
        setTimeout(() => setSuccess(''), 2000);
    };

    // Instamojo Payment Handler
    const handleUpgrade = async () => {
        setError('');
        setUpgrading(true);
        try {
            // 1. Create payment request on backend
            const orderData = await api.createOrder();

            // 2. Redirect user to Instamojo payment page
            if (orderData.payment_url) {
                window.location.href = orderData.payment_url;
            } else {
                throw { error: 'No payment URL received.' };
            }
        } catch (err) {
            setError(err.error || 'Failed to initiate payment.');
            setTimeout(() => setError(''), 5000);
            setUpgrading(false);
        }
    };

    const handleQR = async (id) => {
        try {
            const data = await api.getLinkQR(id);
            setQrData(data);
        } catch (err) {
            setError(err.error || 'QR generation failed.');
            setTimeout(() => setError(''), 4000);
        }
    };

    const handleEditSave = async (id, body) => {
        try {
            const data = await api.updateLink(id, body);
            setLinks(links.map(l => l.id === id ? data.link : l));
            setEditLink(null);
            setSuccess('Link updated!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.error || 'Failed to update link.');
            setTimeout(() => setError(''), 4000);
        }
    };

    const totalClicks = links.reduce((sum, l) => sum + (l.click_count || 0), 0);
    const activeLinks = links.filter(l => l.is_active).length;
    const allTags = [...new Set(links.flatMap(l => (l.tags || '').split(',').map(t => t.trim()).filter(Boolean)))];
    const chartData = dashStats?.clicksByDay || [];
    const maxChart = Math.max(...chartData.map(d => d.count), 1);

    const timeAgo = (dateStr) => {
        if (!dateStr) return 'Never';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-container">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p className="text-muted">Manage your links and track performance</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => isPremium ? setShowThemes(!showThemes) : setShowPremiumModal(true)}>
                            🎨 Theme
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => isPremium ? setShowBulk(true) : setShowPremiumModal(true)}>
                            📦 Bulk Create
                        </button>
                        {!isPremium && (
                            <button className="btn btn-premium" onClick={() => setShowPremiumModal(true)} disabled={upgrading}>
                                {upgrading ? '⏳ Processing...' : '✨ Upgrade to Premium — ₹9'}
                            </button>
                        )}
                        {isPremium && <span className="plan-badge premium">⭐ Premium</span>}
                    </div>
                </div>

                {/* Theme Picker (Premium only) */}
                {showThemes && isPremium && (
                    <div className="card theme-picker-card">
                        <h2>🎨 Choose Theme</h2>
                        <div className="theme-grid">
                            {Object.entries(THEMES).map(([key, t]) => (
                                <button
                                    key={key}
                                    className={`theme-option ${theme === key ? 'active' : ''}`}
                                    onClick={() => setTheme(key)}
                                >
                                    <span className={`theme-preview ${key}`}></span>
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="stats-grid stats-grid-4">
                    <div className="stat-card">
                        <div className="stat-icon">🔗</div>
                        <div className="stat-info">
                            <span className="stat-value">{links.length}</span>
                            <span className="stat-label">Total Links {!isPremium && <span className="stat-limit">/ 5</span>}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">👆</div>
                        <div className="stat-info">
                            <span className="stat-value">{totalClicks}</span>
                            <span className="stat-label">Total Clicks</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-info">
                            <span className="stat-value">{dashStats?.clicksToday || 0}</span>
                            <span className="stat-label">Clicks Today</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🌐</div>
                        <div className="stat-info">
                            <span className="stat-value">{dashStats?.uniqueReferrers || 0}</span>
                            <span className="stat-label">Unique Sources</span>
                        </div>
                    </div>
                </div>

                {/* Dashboard Chart */}
                {chartData.length > 0 && (
                    <div className="card chart-card">
                        <div className="chart-header">
                            <h2>📊 Clicks — Last 30 Days</h2>
                            <span className="chart-total">{dashStats?.clicksThisWeek || 0} this week</span>
                        </div>
                        <div className="dash-chart-container">
                            {chartData.map(day => (
                                <div key={day.date} className="dash-chart-bar-wrapper" title={`${day.date}: ${day.count} clicks`}>
                                    <div className="dash-chart-bar-value">{day.count}</div>
                                    <div className="dash-chart-bar" style={{ height: `${(day.count / maxChart) * 100}%` }} />
                                    <div className="dash-chart-bar-label">
                                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Performing Links */}
                {dashStats?.topLinks?.length > 0 && (
                    <div className="card">
                        <h2>🏆 Top Performing Links</h2>
                        <div className="top-links-list">
                            {dashStats.topLinks.filter(l => l.click_count > 0).map((link, i) => (
                                <div key={link.id} className="top-link-item">
                                    <span className="top-link-rank">#{i + 1}</span>
                                    <span className="top-link-title">{link.title || link.short_code}</span>
                                    <span className="top-link-clicks">{link.click_count} clicks</span>
                                </div>
                            ))}
                            {dashStats.topLinks.filter(l => l.click_count > 0).length === 0 && (
                                <div className="empty-state"><p>No clicks yet — share your links!</p></div>
                            )}
                        </div>
                    </div>
                )}


                {/* Premium Feature Callout (free users) */}
                {!isPremium && (
                    <div className="card premium-callout-card">
                        <div className="premium-callout-content">
                            <div>
                                <h2>🚀 Unlock Premium Features</h2>
                                <p className="text-muted">Get unlimited links, bulk create, URL editing, detailed analytics, custom themes & more.</p>
                            </div>
                            <button className="btn btn-premium" onClick={() => setShowPremiumModal(true)} disabled={upgrading}>
                                {upgrading ? '⏳ Processing...' : '✨ Upgrade — ₹9'}
                            </button>
                        </div>
                        <div className="premium-features-list">
                            <span>♾️ Unlimited Links</span>
                            <span>📦 Bulk Create</span>
                            <span>✏️ Edit URLs</span>
                            <span>📊 Detailed Analytics</span>
                            <span>🎨 Custom Themes</span>
                            <span>📱 QR Codes</span>
                        </div>
                    </div>
                )}

                {/* Create Link Form */}
                <div className="card create-link-card">
                    <h2>Create Short Link</h2>
                    <form onSubmit={handleCreate}>
                        <div className="create-form-row">
                            <div className="form-group flex-2">
                                <label htmlFor="url">Destination URL</label>
                                <input
                                    id="url" type="url"
                                    placeholder="https://example.com/very-long-url"
                                    value={url} onChange={(e) => setUrl(e.target.value)} required
                                />
                            </div>
                            <div className="form-group flex-1">
                                <label htmlFor="title">Title (optional)</label>
                                <input
                                    id="title" type="text"
                                    placeholder="My awesome link"
                                    value={title} onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="create-form-row">
                            <div className="form-group flex-1">
                                <label htmlFor="tags">Tags (comma separated)</label>
                                <input
                                    id="tags" type="text"
                                    placeholder="marketing, social, blog"
                                    value={tags} onChange={(e) => setTags(e.target.value)}
                                />
                            </div>
                        </div>
                        {isPremium ? (
                            <>
                                <button type="button" className="btn btn-ghost btn-sm toggle-advanced"
                                    onClick={() => setShowAdvanced(!showAdvanced)}>
                                    {showAdvanced ? '▲ Hide' : '▼ Show'} Premium Options
                                </button>
                                {showAdvanced && (
                                    <div className="create-form-row advanced-options">
                                        <div className="form-group flex-1">
                                            <label htmlFor="alias">Custom Alias</label>
                                            <div className="input-with-prefix">
                                                <span className="input-prefix">sniplink.co/</span>
                                                <input id="alias" type="text" placeholder="my-brand"
                                                    value={customAlias} onChange={(e) => setCustomAlias(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="form-group flex-1">
                                            <label htmlFor="expiry">Expires At</label>
                                            <input id="expiry" type="datetime-local"
                                                value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <button type="button" className="btn btn-ghost btn-sm toggle-advanced" onClick={() => setShowPremiumModal(true)}>
                                🔒 Advanced Options (Premium)
                            </button>
                        )}
                        <button type="submit" className="btn btn-primary" disabled={creating}>
                            {creating ? 'Creating...' : '⚡ Shorten Link'}
                        </button>
                        {/* Alerts — shown right below the button */}
                        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
                        {success && <div className="alert alert-success" style={{ marginTop: '1rem' }}>{success}</div>}
                    </form>
                </div>

                {/* Search & Tag Filter */}
                <div className="search-filter-bar">
                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input type="text" className="search-input"
                            placeholder="Search links by title, URL, or code..."
                            value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
                        {searchQuery && (
                            <button className="search-clear" onClick={() => handleSearch('')}>✕</button>
                        )}
                    </div>
                    {allTags.length > 0 && (
                        <div className="tag-filter-row">
                            {allTags.map(tag => (
                                <button key={tag} className={`tag-pill ${filterTag === tag ? 'active' : ''}`}
                                    onClick={() => handleTagFilter(tag)}>{tag}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Links Table */}
                <div className="card links-card">
                    <h2>Your Links {links.length > 0 && <span className="text-muted">({links.length})</span>}</h2>
                    {loading ? (
                        <div className="loading-inline"><div className="spinner" /></div>
                    ) : links.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔗</div>
                            <p>{searchQuery || filterTag ? 'No links match your filter.' : 'No links yet. Create your first short link above!'}</p>
                        </div>
                    ) : (
                        <div className="links-table-wrapper">
                            <table className="links-table">
                                <thead>
                                    <tr>
                                        <th>Title / URL</th>
                                        <th>Short Link</th>
                                        <th>Clicks</th>
                                        <th>Last Visited</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {links.map(link => (
                                        <tr key={link.id}>
                                            <td className="link-info-cell">
                                                <div className="link-title">{link.title || 'Untitled'}</div>
                                                <div className="link-url">{link.original_url}</div>
                                                {link.tags && (
                                                    <div className="link-tags">
                                                        {link.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                                            <span key={tag} className="tag-mini" onClick={() => handleTagFilter(tag)}>{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="short-link" onClick={() => handleCopy(link.short_code)} title="Click to copy">
                                                    {BASE_URL}/{link.short_code}
                                                    <span className="copy-icon">📋</span>
                                                </span>
                                            </td>
                                            <td><span className="click-count">{link.click_count || 0}</span></td>
                                            <td className="last-visited-cell">
                                                <span className={`last-visited ${link.last_clicked_at ? '' : 'never'}`}>
                                                    {timeAgo(link.last_clicked_at)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${link.is_active ? 'active' : 'inactive'}`}>
                                                    {link.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                                {link.expires_at && (
                                                    <div className="expiry-info">⏰ {new Date(link.expires_at).toLocaleDateString()}</div>
                                                )}
                                            </td>
                                            <td className="actions-cell">
                                                <button className="btn-icon" title="Edit URL" onClick={() => isPremium ? setEditLink(link) : setShowPremiumModal(true)}>✏️</button>
                                                <button className="btn-icon" title="QR Code" onClick={() => isPremium ? handleQR(link.id) : setShowPremiumModal(true)}>📱</button>
                                                <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDelete(link.id)}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editLink && <EditLinkModal link={editLink} onSave={handleEditSave} onClose={() => setEditLink(null)} />}

            {/* QR Modal */}
            {qrData && (
                <div className="modal-overlay" onClick={() => setQrData(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>QR Code</h3>
                            <button className="btn-close" onClick={() => setQrData(null)}>✕</button>
                        </div>
                        <div className="qr-content">
                            <img src={qrData.qr} alt="QR Code" className="qr-image" />
                            <p className="qr-url">{qrData.url}</p>
                            <a href={qrData.qr} download="qrcode.png" className="btn btn-primary btn-sm">Download QR</a>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Create Modal */}
            {showBulk && (
                <div className="modal-overlay" onClick={() => setShowBulk(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📦 Bulk URL Shortener</h3>
                            <button className="btn-close" onClick={() => setShowBulk(false)}>✕</button>
                        </div>
                        <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                            Paste one URL per line. Optionally add a title after a pipe character: <code>url | title</code>
                        </p>
                        <textarea className="bulk-textarea" rows={8}
                            placeholder={`https://example.com | Example\nhttps://google.com | Google\nhttps://github.com`}
                            value={bulkUrls} onChange={(e) => setBulkUrls(e.target.value)} />
                        <div className="bulk-info">{bulkUrls.split('\n').filter(l => l.trim()).length} URL(s) • Max 20 at once</div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowBulk(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleBulkCreate}
                                disabled={bulkCreating || !bulkUrls.trim()}>
                                {bulkCreating ? 'Creating...' : '⚡ Shorten All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Features Modal */}
            {showPremiumModal && (
                <div className="modal-overlay" onClick={() => setShowPremiumModal(false)}>
                    <div className="modal premium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🚀 Unlock Sniplink Premium</h3>
                            <button className="btn-close" onClick={() => setShowPremiumModal(false)}>✕</button>
                        </div>
                        <div className="premium-modal-content">
                            <p className="premium-modal-subtitle">Take your links to the next level with our lifetime premium pass.</p>

                            <ul className="premium-benefits-full">
                                <li>
                                    <div className="benefit-icon">♾️</div>
                                    <div className="benefit-text">
                                        <strong>Unlimited Links</strong>
                                        <span>Create as many short links as you need, no limits.</span>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon">🎨</div>
                                    <div className="benefit-text">
                                        <strong>Custom Aliases</strong>
                                        <span>Personalize URLs with your brand name (e.g., sniplink.co/my-brand)</span>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon">📱</div>
                                    <div className="benefit-text">
                                        <strong>QR Code Generator</strong>
                                        <span>Instantly create and download scannable QR codes.</span>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon">✏️</div>
                                    <div className="benefit-text">
                                        <strong>Edit Links Anytime</strong>
                                        <span>Change the destination URL or metadata without breaking the short link.</span>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon">📦</div>
                                    <div className="benefit-text">
                                        <strong>Bulk Creation</strong>
                                        <span>Shorten up to 20 links at once with a single click.</span>
                                    </div>
                                </li>
                                <li>
                                    <div className="benefit-icon">🌈</div>
                                    <div className="benefit-text">
                                        <strong>Custom Dashboard Themes</strong>
                                        <span>Unlock 4 beautiful premium themes for your dashboard.</span>
                                    </div>
                                </li>
                            </ul>

                            <div className="premium-modal-action">
                                <div className="premium-price-tag">
                                    <span className="price-strike">₹499</span>
                                    <span className="price-current">₹9</span>
                                    <span className="price-period">Lifetime Access</span>
                                </div>
                                <button className="btn btn-premium btn-full btn-lg" onClick={() => { setShowPremiumModal(false); handleUpgrade(); }} disabled={upgrading}>
                                    {upgrading ? '⏳ Processing...' : 'Buy Premium Now ⚡'}
                                </button>
                                <p className="secure-payment-note">🔒 Secured by Instamojo</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Footer */}
            <footer className="dashboard-footer" style={{ marginTop: '3rem', padding: '1.5rem 0', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.85rem' }}>
                <a href="/about" className="text-muted">About Us</a>
                <a href="/privacy" className="text-muted">Privacy Policy</a>
                <a href="/terms" className="text-muted">Terms of Service</a>
            </footer>
        </div>
    );
}
