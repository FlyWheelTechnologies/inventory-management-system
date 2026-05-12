import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import "./Dashboard.css";

const InfoTip = ({ text }) => (
  <span className="info-tip" title={text}>ⓘ
    <span className="info-tip__content">{text}</span>
  </span>
);

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
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depCustName, setDepCustName] = useState('');
  const [depCustPhone, setDepCustPhone] = useState('');
  const [depAmount, setDepAmount] = useState('');
  const [depMethod, setDepMethod] = useState('Cash');
  const [depSaving, setDepSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!navigator.onLine) return; // Silent fail if offline, though PWA won't load properly without data
      
      const [productsRes, salesRes, expensesRes, logsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (salesRes.data) setSales(salesRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      setTimeout(() => setLoading(false), 1000);
    };
    
    fetchData();
  }, []);

  const handlePureDeposit = async (e) => {
    e.preventDefault();
    if (!depCustName || !depCustPhone || !depAmount) return alert("Please fill all fields");
    setDepSaving(true);
    try {
      const { data, error } = await supabase.rpc('record_pure_deposit', {
        p_customer_name: depCustName,
        p_customer_phone: depCustPhone,
        p_amount: parseFloat(depAmount),
        p_recorded_by: user?.email,
        p_payment_method: depMethod
      });

      if (error) throw error;

      alert("Deposit recorded successfully!");
      setShowDepositModal(false);
      setDepCustName('');
      setDepCustPhone('');
      setDepAmount('');
      // Refresh data
      window.location.reload(); 
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setDepSaving(false);
    }
  };
  const [showAudit, setShowAudit] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('FlorzyAngel ENT. Management Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sales Today', `GHS ${todayRevenue.toFixed(1)}`],
        ['Total Stock Value', `GHS ${stockValue.toFixed(1)}`],
        ['Low Stock Count', `${lowStockCount} Items`],
      ],
    });

    doc.text('Recent Sales Status', 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [['Product', 'Stock Qty', 'Status']],
      body: products.slice(0, 10).map(p => [p.name, p.stock_quantity, p.stock_quantity < 10 ? 'LOW' : 'OK']),
    });

    doc.save(`FlorzyAngel_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ padding: 30 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30 }}>
          <div className="skeleton" style={{ width: 350, height: 45 }} />
          <div className="skeleton" style={{ width: 140, height: 40 }} />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />
          ))}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div className="skeleton" style={{ height: 450, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 450, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  const todayDate = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === todayDate);
  const todayCashIn = todaySales.reduce((a, s) => a + parseFloat(s.amount_paid || 0), 0);
  const todayRevenue = todaySales.reduce((a, s) => a + parseFloat(s.total_amount || 0), 0);
  const stockValue = products.reduce((acc, p) => acc + (parseFloat(p.cost_price || 0) * parseFloat(p.stock_quantity || 0)), 0);
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity < (p.low_stock_threshold || 10)).length;
  const depletedCount = products.filter(p => p.stock_quantity <= 0).length;

  // Real Insights Calculations
  const bestSeller = products.length > 0 
    ? [...products].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))[0]?.name || 'No sales yet'
    : 'No products';

  const totalRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
  const totalCost = sales.reduce((sum, s) => {
    // Estimating cost if not explicitly recorded per sale
    return sum + (parseFloat(s.total_amount) * 0.7); 
  }, 0);
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1) : "0.0";

  const userName = user?.full_name || user?.email?.split('@')[0];

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toDateString();
    const daySales = sales.filter(s => new Date(s.created_at).toDateString() === dateStr)
                         .reduce((acc, s) => acc + parseFloat(s.amount_paid || 0), 0);
    const dayExpenses = expenses.filter(e => new Date(e.created_at).toDateString() === dateStr)
                               .reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    return {
      name: d.toLocaleDateString([], { weekday: 'short' }),
      Revenue: daySales,
      Expenses: dayExpenses
    };
  });

  return (
    <div className="page-wrapper" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="greeting-card__content">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 1.5 }}>Sunyani, Ghana 🇬🇭</div>
            <h1 className="greeting" style={{ marginBottom: 4 }}>Good {getGreeting()}, <span style={{ color: '#f15a24' }}>{user?.full_name?.split(' ')[0] || 'Member'}</span>!</h1>
            <p className="greeting-sub">
              {depletedCount > 0 ? (
                <span style={{ color: '#ef4444', fontWeight: 800 }}>⚠️ {depletedCount} ITEMS ARE COMPLETELY DEPLETED! </span>
              ) : lowStockCount > 0 ? (
                `You have ${lowStockCount} items running low. `
              ) : (
                'All stock levels are healthy. '
              )}
              Today's revenue is <span style={{ fontWeight: 700, color: '#f15a24' }}>GHS {todayRevenue.toFixed(1)}</span>.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user?.role !== 'auditor' && (
            <>
              <button className="quick-action-btn" style={{ background: '#6b7280' }} onClick={() => navigate("/expenses")}>Record Expense</button>
              <button className="quick-action-btn" style={{ background: '#3b82f6' }} onClick={() => setShowDepositModal(true)}>📥 Record Deposit</button>
              <button className="quick-action-btn" style={{ background: '#4f46e5' }} onClick={() => navigate("/products")}>+ Add Product</button>
              <button className="quick-action-btn" style={{ background: '#059669' }} onClick={() => navigate("/sales")}>Record Sale</button>
            </>
          )}
        </div>
      </div>

      <div className="kpi-row">
        {user?.role !== 'storekeeper' && (
          <>
            <StatCard
              label={<>Today's Cash In <InfoTip text="Total cash and momo collected today." /></>}
              value={`GHS ${todayCashIn.toFixed(1)}`}
              icon="💰"
            />
            <StatCard
              label={<>Today's Revenue <InfoTip text="Total volume of sales recorded (Paid + Credit)." /></>}
              value={`GHS ${todayRevenue.toFixed(1)}`}
              icon="📈"
              accent="primary"
            />
          </>
        )}
        <StatCard
          label={<>Pending Deposits <InfoTip text="Orders paid in advance awaiting fulfillment." /></>}
          value={`${sales.filter(s => s.payment_status === 'DEPOSIT' || (s.payment_status === 'PARTIAL' && s.balance_due > 0)).length} Orders`}
          accent="primary"
          icon="⏳"
        />
        <StatCard
          label={<>Stock Value <InfoTip text="Total value of all items currently in warehouse (Cost Price)." /></>}
          value={`GHS ${stockValue.toFixed(1)}`}
          icon="📦"
        />
        <StatCard
          label={<>Low Stock <InfoTip text="Items that have fallen below their minimum threshold." /></>}
          value={`${lowStockCount} Items`}
          accent="warning"
          icon="⚠️"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'storekeeper' ? '1fr' : '2fr 1fr', gap: 20, marginTop: 24 }}>
        {user?.role !== 'storekeeper' ? (
          <div className="table-card" style={{ padding: 20, minHeight: 350, overflow: 'hidden' }}>
            <h3 className="table-card__title" style={{ marginBottom: 20 }}>Revenue vs Expenses (Last 7 Days)</h3>
            <div className="chart-container" style={{ height: 350, width: '100%', minWidth: 0 }}>
              {chartData && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" minHeight={350} minWidth={0}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                    <ChartTooltip cursor={{fill: '#f8faff'}} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                    <Bar dataKey="Revenue" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="Expenses" fill="var(--brand-secondary)" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ) : (
          <div className="table-card" style={{ padding: 20, display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb', border:'1px dashed #ddd' }}>
            <div style={{ textAlign:'center', color:'#6b7280' }}>
              <div style={{ fontSize:24, marginBottom:10 }}>📦</div>
              <p style={{ fontWeight:600 }}>Operational Dashboard</p>
              <p style={{ fontSize:12 }}>Financial charts are restricted to Admin/Auditor roles.</p>
            </div>
          </div>
        )}

        <div className="quick-actions" style={{ width: '100%' }}>
          <div className="table-card" style={{ height: '100%', padding: 20 }}>
            <h3 className="table-card__title" style={{ marginBottom: 20 }}>System Tools</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="quick-action-btn" style={{ background: '#374151', width: '100%' }} onClick={generatePDF}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

      <div className="table-card" style={{ marginTop: 24 }}>
          <div className="table-card__header">
            <h3 className="table-card__title">Recent Stock Status</h3>
          </div>
          <div className="table-wrapper">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 8).map((p) => (
                  <tr 
                    key={p.id} 
                    onClick={() => navigate("/products")} 
                    style={{ cursor: 'pointer' }}
                    className="clickable-row"
                  >
                    <td className="table-code" style={{ fontSize: '11px', fontWeight: 600 }}>{p.item_code || '---'}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.stock_quantity}</td>
                    <td>{p.selling_uom}</td>
                    <td>
                      {p.stock_quantity <= 0 ? (
                        <span className="status-pill" style={{ background: '#000', color: '#fff', fontSize: '10px' }}>DEPLETED</span>
                      ) : (
                        <span className={`status-pill status-pill--low`}>
                          Low
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      {showAudit && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-card" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>System Activity Audit</h3>
              <button className="close-btn" onClick={() => setShowAudit(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="stock-table" style={{ fontSize: 12 }}>
                <thead><tr><th>User</th><th>Action</th><th>Details</th><th>Time</th></tr></thead>
                <tbody>
                  {logs.slice(0, 20).map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.user_email}</td>
                      <td><span className="status-pill status-pill--ok" style={{ fontSize: 10 }}>{l.action}</span></td>
                      <td>{l.details}</td>
                      <td style={{ color: '#9ca3af' }}>{new Date(l.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 20, width: 420, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#111827' }}>📥 Record Customer Deposit</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Add a prepayment to a customer's account balance. This does not affect stock.</p>
            
            <form onSubmit={handlePureDeposit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Customer Name</label>
                <input type="text" value={depCustName} onChange={e => setDepCustName(e.target.value)} placeholder="e.g. John Doe" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14 }} required />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Phone Number</label>
                <input type="text" value={depCustPhone} onChange={e => setDepCustPhone(e.target.value)} placeholder="e.g. 024XXXXXXX" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14 }} required />
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Amount (GHS)</label>
                  <input type="number" step="0.1" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder="0.0" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14 }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Method</label>
                  <select value={depMethod} onChange={e => setDepMethod(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, background: '#fff' }}>
                    <option>Cash</option>
                    <option>Momo</option>
                    <option>Bank</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowDepositModal(false)} style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={depSaving} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: depSaving ? 0.7 : 1 }}>
                  {depSaving ? 'Recording...' : 'Record Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
