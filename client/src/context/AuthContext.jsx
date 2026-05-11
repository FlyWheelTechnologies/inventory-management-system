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
      const { data: { session } } = await supabase.auth.getSession();
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
      setLoading(false);
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
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
