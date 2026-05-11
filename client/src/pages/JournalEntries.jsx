import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

export default function JournalEntries() {
  const [report, setReport] = useState(null);
  const [journal, setJournal] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => { fetchReport(); fetchJournal(); }, []);

  const fetchReport = async () => {
    const { data, error } = await supabase.rpc('get_daily_report');
    if (!error && data && data[0]) {
      const r = data[0];
      setReport({ ...r, netCash: r.totalpaid - r.totalexpenses });
    }
  };
  const fetchJournal = async () => {
    const { data } = await supabase.from("journal_entries").select("*").order('created_at', { ascending: false });
    setJournal(data || []);
  };

  if (!report) return <div style={{padding:24}}>Loading accounting data...</div>;

  const filteredJournal = journal.filter(j => 
    j.account_type.toLowerCase().includes(search.toLowerCase()) || 
    j.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalDebits = filteredJournal.reduce((a, j) => a + j.debit, 0);
  const totalCredits = filteredJournal.reduce((a, j) => a + j.credit, 0);

  const totalPages = Math.ceil(filteredJournal.length / itemsPerPage);
  const paginated = filteredJournal.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: 24 }}>
      <h2 className="section-title" style={{ marginBottom:20 }}>Accounting Journal Entries</h2>

      <div className="kpi-row" style={{ marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Daily Sales</span></div>
          <div className="stat-card__value">GHS {report.totalSales.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Cash In</span></div>
          <div className="stat-card__value" style={{color:'#059669'}}>GHS {report.totalPaid.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Expenses</span></div>
          <div className="stat-card__value" style={{color:'#ef4444'}}>GHS {report.totalExpenses.toFixed(2)}</div>
        </div>
        <div className="stat-card" style={{borderLeft:'3px solid #2563eb'}}>
          <div className="stat-card__header"><span className="stat-card__label">Net Balance</span></div>
          <div className="stat-card__value" style={{color: report.netCash >= 0 ? '#059669' : '#ef4444'}}>GHS {report.netCash.toFixed(2)}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card__header">
          <h3 className="table-card__title">General Ledger</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{fontSize:12, display:'flex', gap:10}}>
              <span style={{color:'#059669', fontWeight:700}}>Total Debits: GHS {totalDebits.toFixed(2)}</span>
              <span style={{color:'#ef4444', fontWeight:700}}>Total Credits: GHS {totalCredits.toFixed(2)}</span>
            </div>
            <input 
              type="search" 
              className="table-search" 
              placeholder="Search account or description..." 
              value={search} 
              onChange={e => {setSearch(e.target.value); setCurrentPage(1);}} 
              style={{ width: 250 }}
            />
          </div>
        </div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>Date & Time</th><th>Account</th><th>Debit</th><th>Credit</th><th>Description</th></tr></thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No entries match your search.</td></tr>
              ) : paginated.map(j => (
                <tr key={j.id}>
                  <td style={{fontSize:11, color:'#6b7280'}}>{new Date(j.created_at).toLocaleString()}</td>
                  <td><span style={{background:'#f0f4ff', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, color:'#2563eb'}}>{j.account_type}</span></td>
                  <td style={{fontWeight:600, color: j.debit > 0 ? '#059669' : '#ccc'}}>{j.debit > 0 ? `GHS ${j.debit.toFixed(2)}` : '—'}</td>
                  <td style={{fontWeight:600, color: j.credit > 0 ? '#ef4444' : '#ccc'}}>{j.credit > 0 ? `GHS ${j.credit.toFixed(2)}` : '—'}</td>
                  <td style={{fontSize:13}}>{j.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, padding:16, borderTop:'1px solid #f3f4f6' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={pgBtn}>Previous</button>
            <div style={{ display:'flex', alignItems:'center', fontSize:13, fontWeight:600 }}>Page {currentPage} of {totalPages}</div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={pgBtn}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

const pgBtn = { padding:'6px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, background:'#f9fafb', cursor: 'pointer' };
