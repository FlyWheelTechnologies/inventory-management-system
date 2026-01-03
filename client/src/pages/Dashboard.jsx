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
    <div style={{ padding: "20px" }}>
      <h1>Dashboard</h1>

      <p>
        Logged in as: <strong>{user?.email}</strong>
      </p>

      <div style={{ marginTop: "20px" }}>
        <button onClick={() => navigate("/products")}>
          Go to Products
        </button>

        <button onClick={() => navigate("/sales")}>
  Sales & Orders
</button>


        <button
          onClick={handleLogout}
          style={{ marginLeft: "10px" }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
