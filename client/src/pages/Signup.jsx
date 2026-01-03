import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Signup successful! Please login.");
      navigate("/");
    }
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .signup-container {
          height: 100vh;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .signup-card {
          background: #ffffff;
          padding: 35px;
          width: 100%;
          max-width: 380px;
          border-radius: 12px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
          text-align: center;
        }

        .signup-card h2 {
          margin-bottom: 5px;
          color: #333;
        }

        .signup-card p {
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .signup-card input {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          border-radius: 8px;
          border: 1px solid #ccc;
          font-size: 14px;
        }

        .signup-card input:focus {
          outline: none;
          border-color: #667eea;
        }

        .signup-card button {
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

        .signup-card button:hover {
          background: #5a67d8;
        }

        .signup-card button:disabled {
          background: #999;
          cursor: not-allowed;
        }

        .login-text {
          margin-top: 15px;
          font-size: 14px;
        }

        .login-text span {
          color: #667eea;
          cursor: pointer;
          font-weight: bold;
        }
      `}</style>

      <div className="signup-container">
        <div className="signup-card">
          <h2>Create Account 🚀</h2>
          <p>Join us and start your journey</p>

          <form onSubmit={handleSignup}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="login-text">
            Already have an account?{" "}
            <span onClick={() => navigate("/")}>Login</span>
          </p>
        </div>
      </div>
    </>
  );
}
