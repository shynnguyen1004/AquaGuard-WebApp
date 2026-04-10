/**
 * Centralized API client for AquaGuard.
 * Provides a single point for API calls with automatic auth headers and error handling.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

/**
 * Get the current auth token from storage.
 * Checks sessionStorage first (phone auth), then localStorage (Google auth).
 */
function getToken() {
  return sessionStorage.getItem("aquaguard_token") || localStorage.getItem("aquaguard_token") || null;
}

/**
 * Build authorization headers.
 */
function getAuthHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Generic fetch wrapper with auth and error handling.
 * @param {string} endpoint - API endpoint (e.g., "/sos/all")
 * @param {RequestInit} [options] - fetch options
 * @returns {Promise<any>} - parsed JSON data
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Shorthand methods.
 */
export const api = {
  get: (endpoint) => apiFetch(endpoint),

  post: (endpoint, body) =>
    apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint, body) =>
    apiFetch(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (endpoint) =>
    apiFetch(endpoint, { method: "DELETE" }),

  /**
   * For multipart/form-data uploads (e.g., SOS images).
   * Does NOT set Content-Type — browser sets it with boundary.
   */
  upload: (endpoint, formData) => {
    const token = getToken();
    return fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.message || `Upload failed (${res.status})`);
        error.status = res.status;
        throw error;
      }
      return data;
    });
  },
};

export { API_BASE, getToken, getAuthHeaders };
