// ============================================================
// api.js — Backend API wrappers
// ProReady
// ============================================================

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

const API = {
  // --- Auth ---
  async getGoogleAuthUrl() {
    const res = await fetch(`${API_BASE}/auth/google`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url;
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async register(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  // --- Player ---
  async analyzePrep(inputs, history) {
    const res = await fetch(`${API_BASE}/player/generate-plan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ inputs, history })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async savePlan(plan) {
    const res = await fetch(`${API_BASE}/player/plans`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(plan)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async syncCalendar(planId) {
    const res = await fetch(`${API_BASE}/player/sync-calendar/${planId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getPlans() {
    const res = await fetch(`${API_BASE}/player/plans`, { headers: getAuthHeaders() });
    return await res.json();
  },

  async saveReport(report) {
    const res = await fetch(`${API_BASE}/player/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(report)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getReports() {
    const res = await fetch(`${API_BASE}/player/reports`, { headers: getAuthHeaders() });
    return await res.json();
  },

  async uploadVideo(formData) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/player/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Do not set Content-Type, let browser set it with boundary for FormData
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getPlayerVideos() {
    const res = await fetch(`${API_BASE}/player/videos`, { headers: getAuthHeaders() });
    return await res.json();
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_BASE}/player/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  // --- Coach ---
  async getNetwork() {
    const res = await fetch(`${API_BASE}/coach/network`, { headers: getAuthHeaders() });
    return await res.json();
  },

  async getPlayerDetails(playerId) {
    const res = await fetch(`${API_BASE}/coach/player/${playerId}`, { headers: getAuthHeaders() });
    return await res.json();
  }
};
