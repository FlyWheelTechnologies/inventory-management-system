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

  const [viewMode, setViewMode] = useState("Daily"); // Daily, Monthly, AllTime
  const [itemsToShow, setItemsToShow] = useState(20);

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
  
  // Filter data based on selected date/mode
  const filteredSales = sales.filter(s => {
    if (viewMode === 'Daily') return s.created_at.startsWith(selectedDate);
    if (viewMode === 'Monthly') return s.created_at.startsWith(selectedDate.substring(0, 7));
    return true; // All Time
  });

  const filteredExpenses = expenses.filter(e => {
    if (viewMode === 'Daily') return e.created_at.startsWith(selectedDate);
    if (viewMode === 'Monthly') return e.created_at.startsWith(selectedDate.substring(0, 7));
    return true;
  });

  // Calculate totals for the summary cards
  const report = {
    totalsales: filteredSales.reduce((a, s) => a + parseFloat(s.total_amount || 0), 0),
    totalpaid: filteredSales.reduce((a, s) => a + parseFloat(s.amount_paid || 0), 0),
    totalexpenses: filteredExpenses.reduce((a, e) => a + parseFloat(e.amount || 0), 0),
    totaltax: filteredSales.reduce((a, s) => a + parseFloat(s.tax_amount || 0), 0),
    netcash: filteredSales.reduce((a, s) => a + parseFloat(s.amount_paid || 0), 0) - filteredExpenses.reduce((a, e) => a + parseFloat(e.amount || 0), 0)
  };

  // Grouping logic for Monthly and All Time
  const getAggregatedData = () => {
    const grouped = {};
    const source = journal.filter(j => {
      if (viewMode === 'Monthly') return j.created_at.startsWith(selectedDate.substring(0, 7));
      if (viewMode === 'AllTime') return true;
      return j.created_at.startsWith(selectedDate);
    });

    if (viewMode === 'Daily') return source;

    source.forEach(j => {
      const date = j.created_at.split('T')[0];
      if (!grouped[date]) grouped[date] = { date, debit: 0, credit: 0, count: 0, entries: [] };
      grouped[date].debit += j.debit || 0;
      grouped[date].credit += j.credit || 0;
      grouped[date].count += 1;
      grouped[date].entries.push(j);
    });

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  };

  const currentData = getAggregatedData();
  const paginated = currentData.slice(0, itemsToShow);

  const totalDebits = currentData.reduce((a, j) => a + (j.debit || 0), 0);
  const totalCredits = currentData.reduce((a, j) => a + (j.credit || 0), 0);

  const handleExportCSV = () => {
    const headers = ["Date", "Debit", "Credit", "Description/Count"];
    const rows = currentData.map(j => [
      viewMode === 'Daily' ? new Date(j.created_at).toLocaleString() : j.date,
      j.debit?.toFixed(2),
      j.credit?.toFixed(2),
      viewMode === 'Daily' ? j.description : `${j.count} entries`
    ]);
    
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.body.appendChild(document.createElement("a"));
    link.href = URL.createObjectURL(blob);
    link.download = `Accounting_${viewMode}_${selectedDate}.csv`;
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: 24 }} className="journal-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="section-title">Accounting Ledger</h2>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }} className="no-print">
            {['Daily', 'Monthly', 'AllTime'].map(m => (
              <button 
                key={m}
                onClick={() => { setViewMode(m); setItemsToShow(20); }}
                style={{ 
                  padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  background: viewMode === m ? 'var(--brand-primary)' : '#e5e7eb',
                  color: viewMode === m ? '#fff' : '#4b5563'
                }}
              >
                {m === 'AllTime' ? 'See All' : m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {viewMode !== 'AllTime' && (
            <input 
              type={viewMode === 'Daily' ? "date" : "month"} 
              className="table-search" 
              value={viewMode === 'Daily' ? selectedDate : selectedDate.substring(0, 7)} 
              onChange={e => setSelectedDate(e.target.value)} 
              style={{ width: 160 }}
            />
          )}
          <button onClick={handleExportCSV} className="action-btn" style={{ background: '#059669', color: '#fff' }}>
            Audit Export
          </button>
          <button onClick={() => window.print()} className="action-btn" style={{ background: '#333', color: '#fff' }}>
            Print PDF
          </button>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Expected Revenue</span></div>
          <div className="stat-card__value">GHS {report.totalsales.toFixed(2)}</div>
          <div style={{fontSize:11, color:'#6b7280', marginTop:4}}>Includes GHS {report.totaltax.toFixed(2)} Tax</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Actual Cash In</span></div>
          <div className="stat-card__value" style={{color:'#059669'}}>GHS {report.totalpaid.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__header"><span className="stat-card__label">Total Expenses</span></div>
          <div className="stat-card__value" style={{color:'#ef4444'}}>GHS {report.totalexpenses.toFixed(2)}</div>
        </div>
        <div className="stat-card" style={{borderLeft:'3px solid var(--brand-primary)'}}>
          <div className="stat-card__header"><span className="stat-card__label">Net Cash Balance</span></div>
          <div className="stat-card__value" style={{color: report.netcash >= 0 ? '#059669' : '#ef4444'}}>GHS {report.netcash.toFixed(2)}</div>
        </div>
      </div>

      <div className="table-card print-section">
        <div className="table-card__header">
          <h3 className="table-card__title">
            {viewMode === 'Daily' ? `Ledger for ${new Date(selectedDate).toDateString()}` : `${viewMode} Financial Summary`}
          </h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{fontSize:12, display:'flex', gap:10}} className="no-print">
              <span style={{color:'#059669', fontWeight:700}}>Total Debits: GHS {totalDebits.toFixed(2)}</span>
              <span style={{color:'#ef4444', fontWeight:700}}>Total Credits: GHS {totalCredits.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead>
              {viewMode === 'Daily' ? (
                <tr><th>Time</th><th>Account</th><th>Debit (In)</th><th>Credit (Out)</th><th>Description</th></tr>
              ) : (
                <tr><th>Date</th><th>Daily Debit (In)</th><th>Daily Credit (Out)</th><th>Transactions</th><th>Actions</th></tr>
              )}
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No records found.</td></tr>
              ) : paginated.map((j, idx) => viewMode === 'Daily' ? (
                <tr key={j.id}>
                  <td style={{fontSize:11, color:'#6b7280'}}>{new Date(j.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td><span style={{background:'#f0f4ff', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, color:'#2563eb'}}>{j.account_type}</span></td>
                  <td style={{fontWeight:600, color: j.debit > 0 ? '#059669' : '#ccc'}}>{j.debit > 0 ? `GHS ${j.debit.toFixed(2)}` : '—'}</td>
                  <td style={{fontWeight:600, color: j.credit > 0 ? '#ef4444' : '#ccc'}}>{j.credit > 0 ? `GHS ${j.credit.toFixed(2)}` : '—'}</td>
                  <td style={{fontSize:13}}>{j.description}</td>
                </tr>
              ) : (
                <tr key={j.date} style={{ cursor: 'pointer' }} onClick={() => { setSelectedDate(j.date); setViewMode('Daily'); }}>
                  <td style={{ fontWeight: 700 }}>{new Date(j.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>GHS {j.debit.toFixed(2)}</td>
                  <td style={{ color: '#ef4444', fontWeight: 600 }}>GHS {j.credit.toFixed(2)}</td>
                  <td style={{ fontSize: 12 }}>{j.count} entries recorded</td>
                  <td><button className="action-btn" style={{ fontSize: 10, padding: '4px 8px' }}>View Day</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentData.length > itemsToShow && (
          <div className="no-print" style={{ padding: 20, textAlign: 'center' }}>
            <button 
              onClick={() => setItemsToShow(prev => prev + 20)}
              style={{ width: '100%', padding: '12px', background: '#f3f4f6', border: '1px dashed #d1d5db', borderRadius: 8, color: '#4b5563', fontWeight: 600, cursor: 'pointer' }}
            >
              See More Transactions ↓
            </button>
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
      `}</style>
    </div>
  );
}
