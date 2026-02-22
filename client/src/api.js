const API_BASE = '/api';

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
        throw { status: res.status, ...data };
    }
    return data;
}

export const api = {
    // Auth
    sendOtp: (body) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify(body) }),
    signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    getMe: () => request('/auth/me'),

    // Payment
    createOrder: () => request('/payment/create-order', { method: 'POST' }),
    verifyPayment: (body) => request('/payment/verify', { method: 'POST', body: JSON.stringify(body) }),
    getPaymentStatus: () => request('/payment/status'),

    // Links
    getLinks: (params) => request(`/links${params ? '?' + new URLSearchParams(params) : ''}`),
    getDashboardStats: () => request('/links/dashboard-stats'),
    createLink: (body) => request('/links', { method: 'POST', body: JSON.stringify(body) }),
    bulkCreate: (body) => request('/links/bulk', { method: 'POST', body: JSON.stringify(body) }),
    updateLink: (id, body) => request(`/links/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteLink: (id) => request(`/links/${id}`, { method: 'DELETE' }),
    getLinkStats: (id) => request(`/links/${id}/stats`),
    getLinkQR: (id) => request(`/links/${id}/qr`),
};
