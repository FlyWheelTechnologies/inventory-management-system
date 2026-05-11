import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

export default function Debtors() {
  const [debtors, setDebtors] = useState([]);
  const [paymentModal, setPaymentModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => { fetchDebtors(); }, []);

  const fetchDebtors = async () => {
    const { data } = await supabase.from("debtors").select("*");
    setDebtors(data || []);
  };

  const totalDebt = debtors.reduce((a, d) => a + d.total_debt, 0);

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 className="section-title">Debtors Ledger</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Track credit customers and outstanding Momo/Cash payments</p>
        </div>
        <div className="summary-card" style={{ padding:'10px 20px', width: 'auto' }}>
          <span style={{ fontSize:12, color:'#6b7280' }}>Total Outstanding: </span>
          <span style={{ fontSize:18, fontWeight:700, color:'#ef4444' }}>GHS {totalDebt.toFixed(2)}</span>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>Type</th><th>Transactions</th><th>Total Debt</th></tr></thead>
            <tbody>
              {debtors.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No outstanding debts. 🎉</td></tr>
              ) : debtors.map(d => (
                <tr key={d.id}>
                  <td style={{fontWeight:500}}>{d.name}</td>
                  <td>{d.phone || '—'}</td>
                  <td><span style={{background: d.is_contractor ? '#dbeafe' : '#f3f4f6', padding:'2px 8px', borderRadius:4, fontSize:12, fontWeight:600}}>{d.is_contractor ? 'Contractor' : 'Customer'}</span></td>
                  <td>{d.transaction_count}</td>
                  <td style={{fontWeight:700, color:'#ef4444'}}>GHS {parseFloat(d.total_debt).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
