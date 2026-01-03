import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .dashboard-container {
          min-height: 100vh;
          background: #f4f6fb;
          padding: 30px;
        }

        .dashboard-card {
          background: #ffffff;
          max-width: 800px;
          margin: auto;
          padding: 30px;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .dashboard-header h1 {
          color: #333;
          margin: 0;
        }

        .user-email {
          color: #666;
          font-size: 14px;
        }

        .dashboard-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 15px;
          margin-top: 25px;
        }

        .dashboard-actions button {
          padding: 15px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          background: #667eea;
          color: #fff;
          transition: all 0.3s;
        }

        .dashboard-actions button:hover {
          background: #5a67d8;
          transform: translateY(-2px);
        }

        .logout-btn {
          background: #e53e3e !important;
        }

        .logout-btn:hover {
          background: #c53030 !important;
        }

        .welcome-box {
          background: linear-gradient(135deg, #667eea, #764ba2);
          padding: 20px;
          border-radius: 12px;
          color: #fff;
          margin-bottom: 20px;
        }
      `}</style>

      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1>Dashboard</h1>
            <p className="user-email">
              Logged in as <strong>{user?.email}</strong>
            </p>
          </div>

          <div className="welcome-box">
            <h2>Welcome 👋</h2>
            <p>Manage your products, sales, and orders from here.</p>
          </div>

          <div className="dashboard-actions">
            <button onClick={() => navigate("/products")}>
              📦 Products
            </button>

            <button onClick={() => navigate("/sales")}>
              💰 Sales & Orders
            </button>

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
