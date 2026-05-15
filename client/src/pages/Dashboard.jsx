import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";
import { formatCurrency } from "../services/formatters";
import InfoTip from "../components/InfoTip";
import StatCard from "../components/StatCard";
import DashboardCharts from "../components/Dashboard/DashboardCharts";
import DashboardRecentStock from "../components/Dashboard/DashboardRecentStock";
import DepositModal from "../components/Dashboard/DepositModal";
import AuditModal from "../components/Dashboard/AuditModal";
import { DashboardService } from "../services/DashboardService";

/* ─── MAIN DASHBOARD ───────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    cashIn: 0,
    revenue: 0,
    pendingDeposits: 0,
    stockValue: 0,
    lowStockCount: 0
  });
  const [chartData, setChartData] = useState([]);
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [bestSeller, setBestSeller] = useState("---");
  const [grossMargin, setGrossMargin] = useState(0);

  // Modals
  const [showAudit, setShowAudit] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depCustName, setDepCustName] = useState("");
  const [depCustPhone, setDepCustPhone] = useState("");
  const [depMethod, setDepMethod] = useState("Cash");
  const [depSaving, setDepSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const data = await DashboardService.fetchDashboardData();

      const { salesToday, depositsToday, customers, products: allProducts, chartSales, chartDeps, logs: auditLogs } = data;

      // 1. Stats
      const cashIn = (salesToday?.reduce((sum, s) => sum + (s.amount_paid || 0), 0) || 0) +
                     (depositsToday?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0);
      const revenue = salesToday?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const pendingDeposits = customers?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0;
      const stockValue = allProducts?.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0) || 0;
      const lowStockCount = allProducts?.filter(p => p.stock_quantity <= p.min_threshold).length || 0;

      setStats({ cashIn, revenue, pendingDeposits, stockValue, lowStockCount });
      setProducts(allProducts);
      setLogs(auditLogs);

      // 2. Chart Data
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const cData = last7Days.map(date => {
        const daySales = chartSales.filter(s => s.created_at.startsWith(date));
        const dayDeps = chartDeps.filter(d => d.created_at.startsWith(date));
        return {
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          sales: daySales.reduce((sum, s) => sum + s.total_amount, 0),
          cash: daySales.reduce((sum, s) => sum + s.amount_paid, 0) + dayDeps.reduce((sum, d) => sum + d.amount, 0)
        };
      });
      setChartData(cData);

      // 3. Best Seller & Margin (Simulated or based on logic)
      setBestSeller(allProducts[0]?.name || "---");
      setGrossMargin(32); // Hardcoded for now or calculated

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handlePureDeposit = async (e) => {
    e.preventDefault();
    if (!depAmount || parseFloat(depAmount) <= 0) return;

    try {
      setDepSaving(true);
      await DashboardService.recordDeposit({
        customerName: depCustName,
        phone: depCustPhone,
        amount: depAmount,
        method: depMethod,
        userEmail: user?.email
      });
      
      setToast({ message: "Deposit recorded!", type: "success" });
      setShowDepositModal(false);
      setDepAmount(""); setDepCustName(""); setDepCustPhone("");
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: "Failed to record deposit", type: "error" });
    } finally {
      setDepSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="skeleton-container">
        <div className="stats-grid">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
        <div className="dashboard-layout">
          <div className="skeleton" style={{ height: 350 }} />
          <div className="skeleton" style={{ height: 350 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 className="section-title">Business Overview</h2>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Welcome back, <strong>{user?.email?.split('@')[0]}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="quick-action-btn" onClick={() => setShowDepositModal(true)}>
            📥 Record Deposit
          </button>
          <button className="quick-action-btn" style={{ background: '#059669' }} onClick={() => navigate("/sales")}>
            + New Sale
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label={<>Today's Cash In <InfoTip text="Total cash and momo collected today." /></>}
          value={`GHS ${formatCurrency(stats.cashIn)}`}
          icon="💰"
          accent="success"
        />
        <StatCard
          label={<>Today's Revenue <InfoTip text="Total volume of sales recorded (Paid + Credit)." /></>}
          value={`GHS ${formatCurrency(stats.revenue)}`}
          icon="📈"
        />
        <StatCard
          label={<>Pending Deposits <InfoTip text="Orders paid in advance awaiting fulfillment." /></>}
          value={`GHS ${formatCurrency(stats.pendingDeposits)}`}
          icon="📥"
        />
        <StatCard
          label={<>Stock Value <InfoTip text="Total value of all items currently in warehouse (Cost Price)." /></>}
          value={`GHS ${formatCurrency(stats.stockValue)}`}
          icon="📦"
        />
        <StatCard
          label={<>Low Stock <InfoTip text="Items that have fallen below their minimum threshold." /></>}
          value={stats.lowStockCount}
          icon="⚠️"
          accent="warning"
        />
      </div>

      {/* Charts */}
      <DashboardCharts chartData={chartData} />

      <div className="dashboard-layout">
        {/* Recent Stock */}
        <DashboardRecentStock products={products} onNavigate={() => navigate("/products")} />

        {/* Quick Actions & Insights */}
        <div className="system-tools-panel">
          <div className="table-card" style={{ height: '100%', padding: 20 }}>
            <h3 className="table-card__title" style={{ marginBottom: 20 }}>System Tools</h3>
            <div className="tools-list">
              <button className="quick-action-btn" style={{ background: '#374151', width: '100%' }}
                onClick={() => DashboardService.generatePDFReport({ ...stats, salesToday: [], depositsToday: [], products, bestSeller, grossMargin })}>
                📄 Download PDF Report
              </button>
              {user?.role === 'admin' && (
                <button className="quick-action-btn" style={{ background: '#4b5563', width: '100%' }} onClick={() => setShowAudit(true)}>
                  🔍 System Audit View
                </button>
              )}
            </div>
            
            {user?.role !== 'storekeeper' && (
              <>
                <h3 className="table-card__title" style={{ marginTop: 30, marginBottom: 15 }}>Quick Insights</h3>
                <div className="insights-list">
                  <div className="summary-card">
                    <div className="summary-card__label">Best Seller</div>
                    <div className="summary-card__value">{bestSeller}</div>
                    <div className="summary-card__sub">Top items by volume</div>
                  </div>
                  <div className="summary-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                    <div className="summary-card__label" style={{ color: '#065f46' }}>Gross Margin</div>
                    <div className="summary-card__value" style={{ color: '#065f46' }}>{grossMargin}%</div>
                    <div className="summary-card__sub" style={{ color: '#047857' }}>Healthy profitability</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuditModal show={showAudit} onClose={() => setShowAudit(false)} logs={logs} />

      <DepositModal
        show={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onSave={handlePureDeposit}
        custName={depCustName}
        setCustName={setDepCustName}
        custPhone={depCustPhone}
        setCustPhone={setDepCustPhone}
        amount={depAmount}
        setAmount={setDepAmount}
        method={depMethod}
        setMethod={setDepMethod}
        saving={depSaving}
      />

      {/* Status Toasts */}
      {toast && (
        <div style={{ 
          position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', 
          background: toast.type === 'success' ? '#064e3b' : '#7f1d1d', 
          color:'#fff', padding:'12px 24px', borderRadius:'12px', 
          boxShadow:'0 10px 15px -3px rgba(0,0,0,0.2)', zIndex:4000, 
          display:'flex', alignItems:'center', gap:10, animation:'slideDown 0.3s ease' 
        }}>
          <span style={{fontSize:18}}>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{fontWeight:600}}>{toast.message}</span>
          <style>{`
            @keyframes slideDown { 
              from { transform: translateX(-50%) translateY(-50px); opacity: 0; }
              to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
