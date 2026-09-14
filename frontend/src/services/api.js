// Relative so it resolves against whatever host the page was loaded from
// (localhost, or another device's IP on the LAN) and goes through Vite's dev proxy.
const BASE_URL = '/api';

// Helper function to grab the Vault security token from local storage
const getToken = () => localStorage.getItem('smartcity_auth_token');

export const api = {
  // The core request engine
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // If a token exists, automatically inject it into the Authorization header
    // This is exactly what FastAPI's OAuth2PasswordBearer expects
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // Global Security Catch: If FastAPI returns 401 Unauthorized (expired/invalid token)
      if (response.status === 401) {
        console.warn('Security clearance revoked or expired. Purging session...');
        localStorage.removeItem('smartcity_auth_token');
        window.location.href = '/login'; // Instantly boot the user back to login
        throw new Error('Session Expired');
      }

      // Parse the JSON response from FastAPI
      const data = await response.json();

      // If the response isn't in the 200-299 range, throw an error with the FastAPI detail message
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Transmission failed.');
      }

      return data;
    } catch (error) {
      console.error(`[Vault API Error] at ${endpoint}:`, error);
      throw error;
    }
  },

  // Helper methods to make your component code super clean
  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
};