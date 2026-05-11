import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

export default function Debtors() {
  const [deposits, setDeposits] = useState([]);

  useEffect(() => { fetchDeposits(); }, []);

  const fetchDeposits = async () => {
    const { data } = await supabase.from("debtors").select("*");
    setDeposits(data || []);
  };

  const totalDeposits = deposits.reduce((a, d) => a + d.total_debt, 0);

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 className="section-title">Advance Deposits</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Track customer prepayments and orders awaiting fulfillment</p>
        </div>
        <div className="summary-card" style={{ padding:'10px 20px', width: 'auto', background: '#ecfdf5', borderColor: '#10b981' }}>
          <span style={{ fontSize:12, color:'#065f46' }}>Total Held in Deposit: </span>
          <span style={{ fontSize:18, fontWeight:700, color:'#059669' }}>GHS {totalDeposits.toFixed(2)}</span>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>Customer Name</th><th>Phone</th><th>Pending Count</th><th>Last Payment</th><th>Balance Due / Held</th></tr></thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No pending deposits. 📦</td></tr>
              ) : deposits.map(d => (
                <tr key={d.customer_id}>
                  <td style={{fontWeight:600}}>{d.customer_name}</td>
                  <td>{d.phone || '—'}</td>
                  <td><span style={{background: '#eff6ff', padding:'2px 8px', borderRadius:4, fontSize:12}}>{d.pending_sales_count} Orders</span></td>
                  <td style={{fontSize:12, color:'#6b7280'}}>{new Date(d.last_sale_date).toLocaleDateString()}</td>
                  <td style={{fontWeight:700, color: d.total_debt > 0 ? '#ef4444' : '#059669'}}>
                    GHS {parseFloat(Math.abs(d.total_debt)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
