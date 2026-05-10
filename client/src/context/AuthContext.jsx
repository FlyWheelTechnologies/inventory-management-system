import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

// Create context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session when app loads
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(data?.session?.user ?? null);
      } catch (err) {
        console.error("Auth initialization failed:", err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? <p>Loading...</p> : children}
    </AuthContext.Provider>
  );
}

// Custom hook
export function useAuth() {
  return useContext(AuthContext);
}
