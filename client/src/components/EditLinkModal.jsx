import { useState } from 'react';

export default function EditLinkModal({ link, onSave, onClose }) {
    const [title, setTitle] = useState(link.title || '');
    const [originalUrl, setOriginalUrl] = useState(link.original_url || '');
    const [expiresAt, setExpiresAt] = useState(link.expires_at || '');
    const [isActive, setIsActive] = useState(link.is_active === 1 || link.is_active === true);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(link.id, {
            title,
            original_url: originalUrl,
            expires_at: expiresAt || null,
            is_active: isActive ? 1 : 0,
        });
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Edit Link</h3>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="edit-title">Title</label>
                        <input
                            id="edit-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Link title"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-url">Destination URL</label>
                        <input
                            id="edit-url"
                            type="url"
                            value={originalUrl}
                            onChange={(e) => setOriginalUrl(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-expiry">Expires At</label>
                        <input
                            id="edit-expiry"
                            type="datetime-local"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                        />
                    </div>
                    <div className="form-group form-check">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                            />
                            <span>Link is active</span>
                        </label>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
