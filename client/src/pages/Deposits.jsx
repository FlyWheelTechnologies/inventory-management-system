import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

export default function Deposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => { fetchDeposits(); }, []);

  const fetchDeposits = async () => {
    const { data, error } = await supabase.from("deposits").select("*");
    if (error) console.error("Error fetching deposits:", error.message);
    setDeposits(data || []);
    setTimeout(() => setLoading(false), 1000);
  };

  const toggleOrders = async (cid) => {
    if (expandedCustomerId === cid) {
      setExpandedCustomerId(null);
      setCustomerOrders([]);
      return;
    }
    setExpandedCustomerId(cid);
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('customer_id', cid)
      .or('payment_status.eq.DEPOSIT,notes.ilike.%Pure Deposit%,total_amount.eq.0')
      .not('notes', 'ilike', '%(Fulfilled)%') // Hide already fulfilled pure deposits
      .order('created_at', { ascending: false });
    setCustomerOrders(data || []);
  };

  const handleFulfill = async (saleId) => {
    if (!window.confirm("Mark this order as fulfilled? This confirms items have been delivered.")) return;
    setFulfilling(true);
    const { error } = await supabase.rpc('fulfill_sale', { p_sale_id: saleId });
    if (error) {
      alert("Error fulfilling sale: " + error.message);
    } else {
      // Refresh
      const updatedOrders = customerOrders.filter(o => o.id !== saleId);
      setCustomerOrders(updatedOrders);
      fetchDeposits();
    }
    setFulfilling(false);
  };

  const totalHeld = deposits.reduce((a, d) => a + ((d.total_balance || 0) < 0 ? Math.abs(d.total_balance || 0) : 0), 0);
  const totalOwed = deposits.reduce((a, d) => a + ((d.total_balance || 0) > 0 ? (d.total_balance || 0) : 0), 0);

  if (loading) {
    return (
      <div className="deposits-container" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 300, height: 40 }} />
          <div className="skeleton" style={{ width: 250, height: 45 }} />
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton" style={{ height: 50, marginBottom: 12, width: '100%' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 className="section-title">Advance Deposits & Credit</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Track customer prepayments (Credit) and outstanding balances (Debt)</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="summary-card" style={{ padding:'10px 20px', width: 'auto', background: '#ecfdf5', borderColor: '#10b981' }}>
            <span style={{ fontSize:10, color:'#065f46', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Customer Credit:</span>
            <span style={{ fontSize:18, fontWeight:700, color:'#059669' }}>GHS {totalHeld.toFixed(1)}</span>
          </div>
          <div className="summary-card" style={{ padding:'10px 20px', width: 'auto', background: '#fef2f2', borderColor: '#ef4444' }}>
            <span style={{ fontSize:10, color:'#991b1b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Amount Owed:</span>
            <span style={{ fontSize:18, fontWeight:700, color:'#b91c1c' }}>GHS {totalOwed.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>Customer Name</th><th>Phone</th><th>Status</th><th>Last Action</th><th>Balance</th></tr></thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No pending balances. 📦</td></tr>
              ) : deposits.map(d => (
                <React.Fragment key={d.customer_id}>
                  <tr 
                    onClick={() => toggleOrders(d.customer_id)}
                    style={{ cursor: 'pointer', background: expandedCustomerId === d.customer_id ? '#f9fafb' : 'transparent' }}
                  >
                    <td style={{fontWeight:600}}>
                      <span style={{ marginRight: 8 }}>{expandedCustomerId === d.customer_id ? '▼' : '▶'}</span>
                      {d.customer_name}
                    </td>
                    <td>{d.phone || '—'}</td>
                    <td>
                      {d.pending_sales_count > 0 ? (
                        <span style={{background: '#eff6ff', color: '#2563eb', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight: 700}}>
                          {d.pending_sales_count} PENDING ORDERS
                        </span>
                      ) : (
                        <span style={{color: '#6b7280', fontSize: 11}}>No Pending Items</span>
                      )}
                    </td>
                    <td style={{fontSize:12, color:'#6b7280'}}>{d.last_sale_date ? new Date(d.last_sale_date).toLocaleDateString() : '—'}</td>
                    <td style={{fontWeight:700, color: (d.total_balance || 0) < 0 ? '#059669' : '#b91c1c'}}>
                      {(d.total_balance || 0) < 0 ? (
                        <span title="Customer has credit">GHS {Math.abs(d.total_balance || 0).toFixed(1)} (Credit)</span>
                      ) : (
                        <span title="Customer owes balance">GHS {(d.total_balance || 0).toFixed(1)} (Due)</span>
                      )}
                    </td>
                  </tr>
                  {expandedCustomerId === d.customer_id && (
                    <tr>
                      <td colSpan="5" style={{ padding: '0 24px 24px', background: '#f9fafb' }}>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)' }}>
                          <h5 style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            📋 Pending Orders for {d.customer_name}
                          </h5>
                          {customerOrders.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#6b7280' }}>No items awaiting fulfillment for this customer.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {customerOrders.map(order => (
                                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{order.total_amount === 0 ? '💰 Pure Prepayment' : `Order #INV-${String(order.invoice_no || order.id).slice(-6)}`}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                                      {new Date(order.created_at).toLocaleString()} • GHS {(parseFloat(order.total_amount === 0 ? order.amount_paid : order.total_amount) || 0).toFixed(1)}
                                      {order.total_amount === 0 && <span style={{ marginLeft: 8, color: '#059669', fontWeight: 700 }}>(Credit Added)</span>}
                                    </div>
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleFulfill(order.id); }}
                                    disabled={fulfilling}
                                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.target.style.background = '#059669'}
                                    onMouseLeave={e => e.target.style.background = '#10b981'}
                                  >
                                    ✓ Mark as Fulfilled
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
