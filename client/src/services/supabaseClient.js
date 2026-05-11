// Local API proxy — mimics supabase.from() for local Express+SQLite backend.
// When migrating to Supabase, swap this file with the real createClient().

const API_URL = "http://localhost:5000/api";

export const supabase = {
  auth: {
    getSession: async () => {
      const token = localStorage.getItem("auth_token");
      const user = JSON.parse(localStorage.getItem("auth_user") || "null");
      if (token && user) return { data: { session: { user, access_token: token } }, error: null };
      return { data: { session: null }, error: null };
    },
    signInWithPassword: async ({ email, password }) => {
      try {
        const res = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_user", JSON.stringify(data.user));
        return { data: { session: { user: data.user } }, error: null };
      } catch (err) { return { data: { session: null }, error: err }; }
    },
    signUp: async ({ email, password }) => {
      try {
        const res = await fetch(`${API_URL}/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signup failed");
        return { data: { user: { email } }, error: null };
      } catch (err) { return { data: null, error: err }; }
    },
    signOut: async () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      return { error: null };
    },
    updateProfile: async ({ full_name, avatar_url }) => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`${API_URL}/auth/profile`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ full_name, avatar_url })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Profile update failed");
        
        // Update local storage
        const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
        const newUser = { ...user, full_name, avatar_url };
        localStorage.setItem("auth_user", JSON.stringify(newUser));
        
        return { data: newUser, error: null };
      } catch (err) { return { data: null, error: err }; }
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },

  from: (table) => {
    const cacheKey = `cache_${table}`;
    const cacheTimeKey = `cache_${table}_time`;
    const CACHE_DURATION = 60 * 1000; // 1 minute

    return {
      select: async () => {
        try {
          // Check cache
          const cachedData = localStorage.getItem(cacheKey);
          const cachedTime = localStorage.getItem(cacheTimeKey);
          if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
            return { data: JSON.parse(cachedData), error: null, fromCache: true };
          }

          const res = await fetch(`${API_URL}/${table}`);
          const data = await res.json();
          
          // Update cache
          localStorage.setItem(cacheKey, JSON.stringify(data));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
          
          return { data, error: null };
        } catch (err) { 
          return { data: [], error: supabase.getErrorMessage(err) }; 
        }
      },
      insert: async (rows) => {
        try {
          const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
          const row = Array.isArray(rows) ? rows[0] : rows;
          const res = await fetch(`${API_URL}/${table}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...row, user_email: user?.email }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          // Clear cache on mutation
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(cacheTimeKey);

          return { data, error: null };
        } catch (err) { 
          return { data: null, error: supabase.getErrorMessage(err) }; 
        }
      },
    };
  },

  getErrorMessage: (err) => {
    const msg = err.message || "";
    if (msg.includes("Failed to fetch")) return "Network error: Please check your internet connection or server status.";
    if (msg.includes("401")) return "Session expired: Please log in again.";
    if (msg.includes("403")) return "Access denied: You don't have permission for this action.";
    return msg || "An unexpected error occurred. Please try again.";
  },
};
