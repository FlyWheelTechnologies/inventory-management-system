import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const [view, setView] = useState("landing"); // 'landing' or 'login'
  const [email, setEmail] = useState("florzyangel@gmail.com");
  const [password, setPassword] = useState("Admin123");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    // If not first time, skip landing page
    const hasVisited = localStorage.getItem("flywheel_visited");
    if (hasVisited) {
      setView("login");
    }
  }, []);

  const handleStart = () => {
    localStorage.setItem("flywheel_visited", "true");
    setView("login");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Fail-safe timeout for login
    const loginTimer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setErrorMsg("Login request is taking too long. Please check your internet connection.");
      }
    }, 15000);

    try {
      console.log("Attempting login for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Login response received:", { data: !!data, error: error?.message });

      if (error) {
        setErrorMsg(error.message);
      } else {
        console.log("Login successful, navigating...");
        login(data.user, data.session.access_token);
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login crash:", err);
      setErrorMsg("An unexpected error occurred: " + (err.message || "Unknown error"));
    } finally {
      clearTimeout(loginTimer);
      setLoading(false);
    }
  };

  if (view === "landing") {
    return (
      <div className="auth-container landing-bg">
        <div className="landing-card animate-fade-in">
          <h1 className="landing-title">Flywheel</h1>
          <p className="landing-subtitle">Advanced Stock & Accounting Suite</p>
          <div className="landing-features">
            <div className="feature-pill">Multi-Tenant Ready</div>
            <div className="feature-pill">Double-Entry Accounting</div>
            <div className="feature-pill">Real-time Inventory</div>
          </div>
          <button onClick={handleStart} className="auth-btn landing-btn">
            Enter System
          </button>
          <p className="landing-footer">
            Interested in building your own software? <br/>
            <a href="https://bookflywheel.com" target="_blank" rel="noreferrer">bookflywheel.com</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card animate-slide-up">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Login to manage your inventory and accounts  </p>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <a href="mailto:gokronipa@icloud.com">Request Access</a>
        </p>
        
        <div className="login-external-link">
           <p>Interested in building your own software?</p>
           <a href="https://bookflywheel.com" target="_blank" rel="noreferrer">Contact us at bookflywheel.com</a>
        </div>
      </div>
    </div>
  );
}
