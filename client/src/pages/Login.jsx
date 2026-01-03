import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .login-container {
          height: 100vh;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-card {
          background: #ffffff;
          padding: 35px;
          width: 100%;
          max-width: 380px;
          border-radius: 12px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
          text-align: center;
        }

        .login-card h2 {
          margin-bottom: 5px;
          color: #333;
        }

        .login-card p {
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .login-card input {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          border-radius: 8px;
          border: 1px solid #ccc;
          font-size: 14px;
        }

        .login-card input:focus {
          outline: none;
          border-color: #667eea;
        }

        .login-card button {
          width: 100%;
          padding: 12px;
          background: #667eea;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        }

        .login-card button:hover {
          background: #5a67d8;
        }

        .login-card button:disabled {
          background: #999;
          cursor: not-allowed;
        }

        .signup-text {
          margin-top: 15px;
          font-size: 14px;
        }

        .signup-text a {
          color: #667eea;
          text-decoration: none;
          font-weight: bold;
        }

        .signup-text a:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="login-container">
        <div className="login-card">
          <h2>Welcome Back 👋</h2>
          <p>Login to continue</p>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="signup-text">
            No account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </>
  );
}
