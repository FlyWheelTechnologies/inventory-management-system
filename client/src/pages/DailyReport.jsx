import { useEffect, useState } from "react";
import "./Dashboard.css";

const API_URL = "http://localhost:5000/api";

export default function DailyReport() {
  const [report, setReport] = useState(null);
  const [journal, setJournal] = useState([]);

  useEffect(() => { fetchReport(); fetchJournal(); }, []);

  const fetchReport = async () => {
    const res = await fetch(`${API_URL}/reports/daily`);
    setReport(await res.json());
  };
  const fetchJournal = async () => {
    const res = await fetch(`${API_URL}/journal`);
    setJournal(await res.json());
  };

  if (!report) return <div style={{padding:24}}>Loading report...</div>;

  const todayJournal = journal.filter(j => new Date(j.created_at).toDateString() === new Date().toDateString());
  const totalDebits = todayJournal.reduce((a, j) => a + j.debit, 0);
  const totalCredits = todayJournal.reduce((a, j) => a + j.credit, 0);

  return (
    <div style={{ padding:24 }}>
      <h2 className="section-title" style={{ marginBottom:20 }}>Daily Report — {report.date}</h2>

      <div className="kpi-row" style={{ marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Total Sales</span></div>
          <div className="stat-card__value">GHS {report.totalSales.toFixed(2)}</div>
          <p style={{fontSize:12, color:'#6b7280'}}>{report.salesCount} transactions</p>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Cash Received</span></div>
          <div className="stat-card__value" style={{color:'#059669'}}>GHS {report.totalPaid.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Credit Given</span></div>
          <div className="stat-card__value" style={{color:'#ef4444'}}>GHS {report.totalCredit.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Expenses</span></div>
          <div className="stat-card__value">GHS {report.totalExpenses.toFixed(2)}</div>
        </div>
        <div className="stat-card" style={{borderLeft:'3px solid #2563eb'}}>
          <div className="stat-card__header"><span className="stat-card__label">Net Cash Position</span></div>
          <div className="stat-card__value" style={{color: report.netCash >= 0 ? '#059669' : '#ef4444'}}>GHS {report.netCash.toFixed(2)}</div>
        </div>
      </div>

      {report.topProducts.length > 0 && (
        <div className="table-card" style={{ marginBottom:24 }}>
          <div className="table-card__header"><h3 className="table-card__title">Top Selling Products Today</h3></div>
          <div className="table-wrapper">
            <table className="stock-table">
              <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {report.topProducts.map((p,i) => (
                  <tr key={i}><td style={{fontWeight:500}}>{p.product_name}</td><td>{p.total_qty}</td><td style={{fontWeight:600}}>GHS {parseFloat(p.total_revenue).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-card__header">
          <h3 className="table-card__title">Journal Entries (Double-Entry Ledger)</h3>
          <div style={{fontSize:12}}>
            <span style={{color:'#059669', fontWeight:700}}>Debits: GHS {totalDebits.toFixed(2)}</span>
            {' | '}
            <span style={{color:'#ef4444', fontWeight:700}}>Credits: GHS {totalCredits.toFixed(2)}</span>
            {' | '}
            <span style={{fontWeight:700, color: Math.abs(totalDebits - totalCredits) < 0.01 ? '#059669' : '#ef4444'}}>
              {Math.abs(totalDebits - totalCredits) < 0.01 ? '✓ Balanced' : '⚠ Imbalanced'}
            </span>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>Time</th><th>Account</th><th>Debit</th><th>Credit</th><th>Description</th></tr></thead>
            <tbody>
              {todayJournal.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No entries today.</td></tr>
              ) : todayJournal.map(j => (
                <tr key={j.id}>
                  <td style={{fontSize:11, color:'#6b7280'}}>{new Date(j.created_at).toLocaleTimeString()}</td>
                  <td><span style={{background:'#f0f4ff', padding:'2px 8px', borderRadius:4, fontSize:12, fontWeight:600, color:'#2563eb'}}>{j.account_type}</span></td>
                  <td style={{fontWeight:600, color: j.debit > 0 ? '#059669' : '#ccc'}}>{j.debit > 0 ? `GHS ${j.debit.toFixed(2)}` : '—'}</td>
                  <td style={{fontWeight:600, color: j.credit > 0 ? '#ef4444' : '#ccc'}}>{j.credit > 0 ? `GHS ${j.credit.toFixed(2)}` : '—'}</td>
                  <td>{j.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
