import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

/* ─── Mini Sparkline Chart ─────────────────────── */
function Sparkline({ dataIn, dataOut }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const pad = 6;
    ctx.clearRect(0, 0, W, H);
    const drawLine = (data, color) => {
      const max = Math.max(...[...dataIn, ...dataOut], 1);
      const pts = data.map((v, i) => ({
        x: pad + (i / (data.length - 1)) * (W - pad * 2),
        y: H - pad - (v / max) * (H - pad * 2),
      }));
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();
    };
    drawLine(dataIn, "#22c55e");
    drawLine(dataOut, "#ef4444");
  }, [dataIn, dataOut]);
  return <canvas ref={canvasRef} width={180} height={40} className="sparkline-canvas" />;
}

/* ─── Stat Card ────────────────────────────────── */
function StatCard({ icon, label, value, trend, accent, children }) {
  return (
    <div className={`stat-card ${accent ? `stat-card--${accent}` : ""}`}>
      <div className="stat-card__header">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon">{icon}</span>
      </div>
      <div className="stat-card__value">{value}</div>
      {children}
    </div>
  );
}

/* ─── MAIN DASHBOARD ───────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    const { data: pData } = await supabase.from("products").select("*");
    const { data: sData } = await supabase.from("sales").select("*");
    setProducts(pData || []);
    setSales(sData || []);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const totalStockValue = products.reduce((acc, p) => acc + (parseFloat(p.selling_price || 0) * parseFloat(p.stock_quantity || 0)), 0);
  const lowStockCount = products.filter(p => p.stock_quantity < 10).length;
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
                          .reduce((acc, s) => acc + parseFloat(s.amount_paid || 0), 0);

  const userName = user?.full_name || user?.email?.split('@')[0];

  return (
    <div className="page-wrapper" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 className="section-title">
          {getGreeting()}, <span style={{ color: '#2563eb' }}>{userName}</span>
        </h2>
        <p style={{ color: '#6b7280', fontSize: '13px' }}>
          It is currently {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="kpi-row">
        <StatCard
          label="Total Stock Value"
          value={`GHS ${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockCount}
          accent="warning"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
        />
        <StatCard
          label="Today's Cash"
          value={`GHS ${todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
        >
          <div className="sparkline-wrapper" style={{ marginTop: 10 }}>
            <Sparkline dataIn={[40, 65, 50, 80, 55, 90]} dataOut={[30, 45, 60, 40, 70, 50]} />
          </div>
        </StatCard>
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
        <div className="table-card" style={{ flex: 1 }}>
          <div className="table-card__header">
            <h3 className="table-card__title">Recent Stock Status</h3>
          </div>
          <div className="table-wrapper">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Qty</th>
                  <th>UOM</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.stock_quantity}</td>
                    <td>{p.selling_uom}</td>
                    <td>
                      <span className={`status-pill status-pill--${p.stock_quantity < 10 ? 'low' : 'ok'}`}>
                        {p.stock_quantity < 10 ? 'Low' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="table-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 15 }}>Quick Actions</h3>
            <button onClick={() => navigate("/products")} className="quick-action-btn" style={{ marginBottom: 10 }}>Add Stock</button>
            <button onClick={() => navigate("/sales")} className="quick-action-btn">Record Sale</button>
          </div>
          
          <div className="summary-card">
            <p className="summary-card__label">Total Transactions</p>
            <p className="summary-card__value">{sales.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
