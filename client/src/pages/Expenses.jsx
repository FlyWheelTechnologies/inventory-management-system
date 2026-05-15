import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";
import { formatCurrency } from "../services/formatters";
import ExpenseForm from "../components/Expenses/ExpenseForm";
import ExpenseTable from "../components/Expenses/ExpenseTable";
import { ExpensesService } from "../services/ExpensesService";

export default function Expenses() {
  const { user } = useAuth();
  const location = useLocation();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description:'', category:'Misc', amount:'' });
  const [search, setSearch] = useState('');
  const [itemsToShow, setItemsToShow] = useState(25);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.showForm) {
      setShowForm(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description:'', category:'Misc', amount:'' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ExpensesService.saveExpense(form, user?.email);
      setForm({ description:'', category:'Misc', amount:'' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save expense:", err);
    }
  };

  const [search, setSearch] = useState('');
  const [itemsToShow, setItemsToShow] = useState(25);
  const [timeframe, setTimeframe] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const handleExport = () => {
    const csv = "Date,Description,Category,Amount,Recorded By\n"
      + expenses.map(e => `${new Date(e.created_at).toLocaleDateString()},${e.description},${e.category},${e.amount},${e.recorded_by}`).join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = `Expenses_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filtered = expenses
    .filter(e => e.description.toLowerCase().includes(search.toLowerCase()))
    .filter(e => {
      if (timeframe === 'All') return true;
      const date = new Date(e.created_at);
      const today = new Date();
      if (timeframe === 'Today') return date.toDateString() === today.toDateString();
      if (timeframe === 'Week') {
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        return date >= lastWeek;
      }
      if (timeframe === 'Month') return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'amount_high') return parseFloat(b.amount) - parseFloat(a.amount);
      if (sortBy === 'amount_low') return parseFloat(a.amount) - parseFloat(b.amount);
      return 0;
    });

  const paginated = filtered.slice(0, itemsToShow);

  const totalExpenses = filtered.reduce((a, e) => a + parseFloat(e.amount), 0);

  if (loading) {
    return (
      <div className="expenses-container" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 300, height: 40 }} />
          <div style={{ display:'flex', gap:10 }}>
            <div className="skeleton" style={{ width: 150, height: 45 }} />
            <div className="skeleton" style={{ width: 140, height: 40 }} />
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div className="skeleton" style={{ height: 45, marginBottom: 20, width: '100%' }} />
          {[1,2,3,4,5,6,7,8].map(i => (
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
          <h2 className="section-title">Expenses</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Record operational costs like utilities, salaries, and maintenance</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div className="summary-card" style={{ padding:'10px 20px', width: 'auto' }}>
            <span style={{ fontSize:12, color:'#6b7280' }}>Total: </span>
            <span style={{ fontSize:18, fontWeight:700 }}>GHS {formatCurrency(totalExpenses)}</span>
          </div>
          <button className="quick-action-btn" style={{ width: 'auto', background: '#374151' }} onClick={handleExport}>📤 Export</button>
          <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Record Expense'}</button>
        </div>
      </div>

      <ExpenseForm
        show={showForm}
        form={form}
        setForm={setForm}
        onSave={handleSubmit}
      />

      <div className="table-card">
        <div className="table-card__header" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 className="table-card__title" style={{ margin: 0, marginRight: 'auto' }}>Expense Ledger</h3>
          
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
            {['All', 'Today', 'Week', 'Month'].map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: timeframe === t ? '#fff' : 'transparent',
                  color: timeframe === t ? '#f15a24' : '#6b7280',
                  boxShadow: timeframe === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <select 
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', outline: 'none' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_high">Highest Amount</option>
            <option value="amount_low">Lowest Amount</option>
          </select>

          <input 
            type="search" 
            className="table-search" 
            placeholder="Search description..." 
            value={search} 
            onChange={e => {setSearch(e.target.value); setItemsToShow(25);}} 
            style={{ minWidth: 200 }}
          />
        </div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>By</th></tr></thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No expenses found.</td></tr>
              ) : paginated.map(e => (
                <tr key={e.id}>
                  <td style={{fontSize:12, color:'#6b7280'}}>{new Date(e.created_at).toLocaleDateString()}</td>
                  <td style={{fontWeight:500}}>{e.description}</td>
                  <td><span style={{background:'#f3f4f6', padding:'2px 8px', borderRadius:4, fontSize:12}}>{e.category}</span></td>
                  <td style={{fontWeight:600}}>GHS {formatCurrency(e.amount)}</td>
                  <td>{e.recorded_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filtered.length > itemsToShow && (
          <div style={{ padding: 20, textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
            <button 
              onClick={() => setItemsToShow(prev => prev + 25)}
              style={{ width: '100%', padding: '12px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 8, color: '#4b5563', fontWeight: 600, cursor: 'pointer' }}
            >
              See More Expenses ↓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
