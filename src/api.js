// Frontend API wrapper

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("wn_access_token");
}
function setTokens(access, refresh) {
  localStorage.setItem("wn_access_token", access);
  localStorage.setItem("wn_refresh_token", refresh);
}
function clearTokens() {
  localStorage.removeItem("wn_access_token");
  localStorage.removeItem("wn_refresh_token");
}

/**
 * Enhanced fetch that automatically attaches the access token
 * and attempts a single refresh if we get a 401.
 */
async function fetchWithAuth(endpoint, options = {}) {
  let token = getToken();
  
  const makeRequest = async (t) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (t) headers["Authorization"] = `Bearer ${t}`;

    return fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  let res = await makeRequest(token);

  if (res.status === 401) {
    // Try to refresh
    const refresh = localStorage.getItem("wn_refresh_token");
    if (refresh) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        
        if (refreshRes.ok) {
          const { accessToken, refreshToken } = await refreshRes.json();
          setTokens(accessToken, refreshToken);
          // Retry original request with new token
          res = await makeRequest(accessToken);
        } else {
          clearTokens();
          throw new Error("Session expired. Please log in again.");
        }
      } catch (err) {
        clearTokens();
        throw new Error("Session expired. Please log in again.");
      }
    } else {
      clearTokens();
      throw new Error("Unauthorized");
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "An error occurred");
  }

  return data;
}

export const api = {
  login: async (phone, pin) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setTokens(data.accessToken, data.refreshToken);
    return data.user;
  },

  register: async (name, phone, pin) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setTokens(data.accessToken, data.refreshToken);
    return data.user;
  },

  requestReset: async (phone) => {
    const res = await fetch(`${BASE_URL}/auth/request-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to request reset");
    return data;
  },

  resetPin: async (phone, otp, newPin) => {
    const res = await fetch(`${BASE_URL}/auth/reset-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp, newPin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to reset PIN");
    return data;
  },

  logout: async () => {
    const refresh = localStorage.getItem("wn_refresh_token");
    if (refresh) {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      }).catch(console.error); // Best effort
    }
    clearTokens();
  },

  getMe: () => fetchWithAuth("/users/me"),
  
  getTransactions: () => fetchWithAuth("/transactions"),
  
  sendTransaction: (data) => fetchWithAuth("/transactions", {
    method: "POST",
    body: JSON.stringify(data)
  }),

  syncTransactions: (transactionIds) => fetchWithAuth("/transactions/sync", {
    method: "POST",
    body: JSON.stringify({ transactionIds })
  }),

  getLoanScore: () => fetchWithAuth("/loans/score"),
  
  applyForLoan: (amount) => fetchWithAuth("/loans/apply", {
    method: "POST",
    body: JSON.stringify({ amount })
  })
};
