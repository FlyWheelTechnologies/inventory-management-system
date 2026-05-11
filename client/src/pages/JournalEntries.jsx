import { useState, useRef, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

export default function JournalEntries() {
  const [search, setSearch] = useState("");
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const printRef = useRef();

  const [journal, setJournal] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const fetchData = async () => {
    const [journalRes, salesRes, expensesRes] = await Promise.all([
      supabase.from('journal_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*')
    ]);
    if (journalRes.data) setJournal(journalRes.data);
    if (salesRes.data) setSales(salesRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  // Filter data based on selected date
  const filteredSales = sales.filter(s => s.created_at.startsWith(selectedDate));
  const filteredExpenses = expenses.filter(e => e.created_at.startsWith(selectedDate));
  
  const report = {
    totalsales: filteredSales.reduce((a, s) => a + parseFloat(s.total_amount || 0), 0),
    totalpaid: filteredSales.reduce((a, s) => a + parseFloat(s.amount_paid || 0), 0),
    totalexpenses: filteredExpenses.reduce((a, e) => a + parseFloat(e.amount || 0), 0),
    netcash: filteredSales.reduce((a, s) => a + parseFloat(s.amount_paid || 0), 0) - filteredExpenses.reduce((a, e) => a + parseFloat(e.amount || 0), 0)
  };

  const filteredJournal = journal.filter(j => 
    (j.account_type?.toLowerCase().includes(search.toLowerCase()) || 
     j.description?.toLowerCase().includes(search.toLowerCase())) &&
    j.created_at.startsWith(selectedDate)
  );

  const totalDebits = filteredJournal.reduce((a, j) => a + (j.debit || 0), 0);
  const totalCredits = filteredJournal.reduce((a, j) => a + (j.credit || 0), 0);

  const totalPages = Math.ceil(filteredJournal.length / itemsPerPage);
  const paginated = filteredJournal.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Account", "Debit", "Credit", "Description"];
    const rows = filteredJournal.map(j => [
      new Date(j.created_at).toLocaleString(),
      j.account_type,
      j.debit.toFixed(2),
      j.credit.toFixed(2),
      j.description
    ]);
    
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Flywheel_Ledger_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: 24 }} className="journal-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="section-title">Daily Financial Report</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <input 
            type="date" 
            className="table-search" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
            style={{ width: 160 }}
          />
          <button onClick={handleExportCSV} className="action-btn" style={{ background: '#059669', color: '#fff' }}>
            Export CSV
          </button>
          <button onClick={handlePrint} className="action-btn" style={{ background: '#333', color: '#fff' }}>
            Print Ledger
          </button>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Expected Revenue</span></div>
          <div className="stat-card__value">GHS {report.totalsales.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Actual Cash In</span></div>
          <div className="stat-card__value" style={{color:'#059669'}}>GHS {report.totalpaid.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Daily Expenses</span></div>
          <div className="stat-card__value" style={{color:'#ef4444'}}>GHS {report.totalexpenses.toFixed(2)}</div>
        </div>
        <div className="stat-card" style={{borderLeft:'3px solid var(--brand-primary)'}}>
          <div className="stat-card__header"><span className="stat-card__label">Net Daily Balance</span></div>
          <div className="stat-card__value" style={{color: report.netcash >= 0 ? '#059669' : '#ef4444'}}>GHS {report.netcash.toFixed(2)}</div>
        </div>
      </div>

      <div className="table-card print-section">
        <div className="table-card__header">
          <h3 className="table-card__title">General Ledger — {new Date(selectedDate).toDateString()}</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{fontSize:12, display:'flex', gap:10}} className="no-print">
              <span style={{color:'#059669', fontWeight:700}}>Debits: GHS {totalDebits.toFixed(2)}</span>
              <span style={{color:'#ef4444', fontWeight:700}}>Credits: GHS {totalCredits.toFixed(2)}</span>
            </div>
            <input 
              type="search" 
              className="table-search no-print" 
              placeholder="Search account..." 
              value={search} 
              onChange={e => {setSearch(e.target.value); setCurrentPage(1);}} 
              style={{ width: 200 }}
            />
          </div>
        </div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>Time</th><th>Account</th><th>Debit (In)</th><th>Credit (Out)</th><th>Description</th></tr></thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No entries for this date.</td></tr>
              ) : paginated.map(j => (
                <tr key={j.id}>
                  <td style={{fontSize:11, color:'#6b7280'}}>{new Date(j.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td><span style={{background:'#f0f4ff', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, color:'#2563eb'}}>{j.account_type}</span></td>
                  <td style={{fontWeight:600, color: j.debit > 0 ? '#059669' : '#ccc'}}>{j.debit > 0 ? `GHS ${j.debit.toFixed(2)}` : '—'}</td>
                  <td style={{fontWeight:600, color: j.credit > 0 ? '#ef4444' : '#ccc'}}>{j.credit > 0 ? `GHS ${j.credit.toFixed(2)}` : '—'}</td>
                  <td style={{fontSize:13}}>{j.description}</td>
                </tr>
              ))}
            </tbody>
            {paginated.length > 0 && (
              <tfoot style={{ background: '#f9fafb', fontWeight: 700 }}>
                <tr>
                  <td colSpan="2" style={{ textAlign: 'right' }}>Daily Totals:</td>
                  <td style={{ color: '#059669' }}>GHS {totalDebits.toFixed(2)}</td>
                  <td style={{ color: '#ef4444' }}>GHS {totalCredits.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {totalPages > 1 && (
          <div className="no-print" style={{ display:'flex', justifyContent:'center', gap:8, padding:16, borderTop:'1px solid #f3f4f6' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="pg-btn">Previous</button>
            <div style={{ display:'flex', alignItems:'center', fontSize:13, fontWeight:600 }}>Page {currentPage} of {totalPages}</div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="pg-btn">Next</button>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print, .sidebar, .top-nav { display: none !important; }
          .app-shell { display: block !important; }
          .main-content { margin-left: 0 !important; padding: 0 !important; }
          .table-card { box-shadow: none !important; border: none !important; }
          .print-section { width: 100% !important; }
          body { background: white !important; }
        }
        .pg-btn { padding: 6px 12px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 12px; background: #fff; cursor: pointer; }
        .pg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
