import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { SyncService } from "../services/SyncService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser) => {
    if (!sessionUser) return null;
    
    // Fetch role and other info from our 'profiles' table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (!error && data) {
      return { ...sessionUser, ...data };
    }
    
    // Default if no profile found (safe fallback)
    return { ...sessionUser, role: 'storekeeper' };
  };

  useEffect(() => {
    // Check active session on mount
    const checkSession = async () => {
      console.log("Checking session...");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Session found, fetching profile...");
          const fullUser = await fetchProfile(session.user);
          setUser(fullUser);
          localStorage.setItem("user", JSON.stringify(fullUser));
          if (navigator.onLine) {
            SyncService.syncAllTables();
          }
        } else {
          console.log("No session found.");
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        console.log("Auth loading complete.");
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const fullUser = await fetchProfile(session.user);
        setUser(fullUser);
        localStorage.setItem("user", JSON.stringify(fullUser));
        if (navigator.onLine) {
          SyncService.syncAllTables();
        }
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (userData, token) => {
    // User state is handled by onAuthStateChange above,
    // but we can set it here for immediate feedback if needed.
    localStorage.setItem("auth_token", token);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  const updateUser = (userData) => {
    const updated = { ...user, ...userData };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {loading ? (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #f15a24', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
            <h2 style={{ color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>Starting System...</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>Initializing secure connection</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
