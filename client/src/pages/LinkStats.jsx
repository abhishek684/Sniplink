import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function LinkStats() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const BASE_URL = window.location.protocol + '//' + window.location.hostname + ':5000';

    useEffect(() => {
        api.getLinkStats(id)
            .then(d => setData(d))
            .catch(err => setError(err.error || 'Failed to load stats'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (error) return (
        <div className="dashboard-page">
            <div className="dashboard-container">
                <div className="alert alert-error">{error}</div>
                <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
            </div>
        </div>
    );

    const { link, clicksByDay, referrers, browserStats, recentClicks } = data;
    const maxClicks = Math.max(...clicksByDay.map(d => d.count), 1);

    return (
        <div className="dashboard-page">
            <div className="dashboard-container">
                <button className="btn btn-ghost back-btn" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>

                {/* Link Header */}
                <div className="stats-header">
                    <h1>{link.title || 'Untitled Link'}</h1>
                    <p className="text-muted stats-url">{link.original_url}</p>
                    <div className="stats-short-link">
                        <span className="short-link">{BASE_URL}/{link.short_code}</span>
                        <span className={`status-badge ${link.is_active ? 'active' : 'inactive'}`}>
                            {link.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                {/* Total Clicks */}
                <div className="stats-grid">
                    <div className="stat-card stat-card-lg">
                        <div className="stat-icon">👆</div>
                        <div className="stat-info">
                            <span className="stat-value">{link.click_count || 0}</span>
                            <span className="stat-label">Total Clicks</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📅</div>
                        <div className="stat-info">
                            <span className="stat-value">{new Date(link.created_at).toLocaleDateString()}</span>
                            <span className="stat-label">Created</span>
                        </div>
                    </div>
                    {link.expires_at && (
                        <div className="stat-card">
                            <div className="stat-icon">⏰</div>
                            <div className="stat-info">
                                <span className="stat-value">{new Date(link.expires_at).toLocaleDateString()}</span>
                                <span className="stat-label">Expires</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Clicks Chart */}
                <div className="card">
                    <h2>Clicks — Last 7 Days</h2>
                    {clicksByDay.length === 0 ? (
                        <div className="empty-state"><p>No clicks recorded yet</p></div>
                    ) : (
                        <div className="chart-container">
                            {clicksByDay.map(day => (
                                <div key={day.date} className="chart-bar-wrapper">
                                    <div className="chart-bar-value">{day.count}</div>
                                    <div
                                        className="chart-bar"
                                        style={{ height: `${(day.count / maxClicks) * 100}%` }}
                                    />
                                    <div className="chart-bar-label">
                                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="stats-detail-grid">
                    {/* Referrers */}
                    <div className="card">
                        <h2>Top Referrers</h2>
                        {referrers.length === 0 ? (
                            <div className="empty-state"><p>No referrer data yet</p></div>
                        ) : (
                            <div className="breakdown-list">
                                {referrers.map((r, i) => (
                                    <div key={i} className="breakdown-item">
                                        <span className="breakdown-name">{r.referrer}</span>
                                        <span className="breakdown-count">{r.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Browsers */}
                    <div className="card">
                        <h2>Browsers</h2>
                        {browserStats.length === 0 ? (
                            <div className="empty-state"><p>No browser data yet</p></div>
                        ) : (
                            <div className="breakdown-list">
                                {browserStats.map((b, i) => (
                                    <div key={i} className="breakdown-item">
                                        <span className="breakdown-name">{b.browser}</span>
                                        <span className="breakdown-count">{b.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Clicks */}
                <div className="card">
                    <h2>Recent Clicks</h2>
                    {recentClicks.length === 0 ? (
                        <div className="empty-state"><p>No clicks yet</p></div>
                    ) : (
                        <div className="links-table-wrapper">
                            <table className="links-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Referrer</th>
                                        <th>Browser</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentClicks.map(click => {
                                        let browser = 'Unknown';
                                        const ua = (click.user_agent || '').toLowerCase();
                                        if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
                                        else if (ua.includes('firefox')) browser = 'Firefox';
                                        else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
                                        else if (ua.includes('edg')) browser = 'Edge';
                                        return (
                                            <tr key={click.id}>
                                                <td>{new Date(click.clicked_at).toLocaleString()}</td>
                                                <td>{click.referrer || 'Direct'}</td>
                                                <td>{browser}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
