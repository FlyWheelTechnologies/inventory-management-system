import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser) => {
    if (!sessionUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) {
        console.warn("Profile fetch error, using cached info if available:", error.message);
        return user || { ...sessionUser, role: 'storekeeper' };
      }
      
      const updatedUser = { ...sessionUser, ...data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err) {
      console.warn("Profile fetch failed, staying logged in with cache:", err.message);
      return user || { ...sessionUser, role: 'storekeeper' };
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Fail-safe: if initAuth takes more than 5 seconds, stop loading so user can at least see the login page
      const timer = setTimeout(() => {
        if (isMounted && loading) {
          console.warn("Auth initialization taking too long, forcing load completion.");
          setLoading(false);
        }
      }, 5000);

      try {
        const startTime = Date.now();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && isMounted) {
          const fullUser = await fetchProfile(session.user);
          if (isMounted) setUser(fullUser);
        } else if (isMounted) {
          setUser(null);
          localStorage.removeItem("user");
        }

        // Professional Delay: Ensure splash screen shows for at least 1.2 seconds
        const elapsedTime = Date.now() - startTime;
        const remainingDelay = Math.max(0, 1200 - elapsedTime);
        await new Promise(resolve => setTimeout(resolve, remainingDelay));

      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        clearTimeout(timer);
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && isMounted) {
        // Don't await here to avoid blocking the auth listener
        fetchProfile(session.user).then(fullUser => {
          if (isMounted) setUser(fullUser);
        });
      } else if (isMounted) {
        setUser(null);
        localStorage.removeItem("user");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("auth_token", token);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    }
    
    // Clear state and storage immediately
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("auth_token");
    window.location.href = "/"; // Force reload to login
  };

  const updateUser = (userData) => {
    const updated = { ...user, ...userData };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  // Only show the "Starting System" loader if we are truly loading and have NO cached user.
  // This makes the app feel instant on refresh for logged-in users.
  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#374151', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '5px solid rgba(255,255,255,0.1)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', letterSpacing: '1px' }}>FLORZYANGEL</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px', fontWeight: '500' }}>Initializing Secure Session...</p>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
