import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const CATEGORIES = ['Utilities', 'Transport', 'Salary', 'Maintenance', 'Supplies', 'Misc'];

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);

  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (data) setExpenses(data);
    setTimeout(() => setLoading(false), 1000);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description:'', category:'Misc', amount:'' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      recorded_by: user?.email || 'System',
      created_at: new Date().toISOString()
    };
    await supabase.from('expenses').insert([payload]);
    setForm({ description:'', category:'Misc', amount:'' });
    setShowForm(false);
    fetchExpenses();
  };

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = expenses
    .filter(e => e.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalExpenses = expenses.reduce((a, e) => a + parseFloat(e.amount), 0);

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
            <span style={{ fontSize:18, fontWeight:700 }}>GHS {totalExpenses.toFixed(1)}</span>
          </div>
          <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Record Expense'}</button>
        </div>
      </div>

      {showForm && (
        <div className="table-card" style={{ marginBottom:24 }}>
          <form onSubmit={handleSubmit} style={{ padding:20, display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:14, alignItems:'end' }}>
            <div><label style={lbl}>Description</label><input style={inp} value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))} required /></div>
            <div><label style={lbl}>Category</label>
              <select style={inp} value={form.category} onChange={e => setForm(f=>({...f, category:e.target.value}))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Amount (GHS)</label><input style={inp} type="number" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f, amount:e.target.value}))} required /></div>
            <button type="submit" className="quick-action-btn" style={{ height:38 }}>Save</button>
          </form>
        </div>
      )}

      <div className="table-card">
        <div className="table-card__header">
          <h3 className="table-card__title">Expense Ledger</h3>
          <input 
            type="search" 
            className="table-search" 
            placeholder="Search description..." 
            value={search} 
            onChange={e => {setSearch(e.target.value); setCurrentPage(1);}} 
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
                  <td style={{fontWeight:600}}>GHS {parseFloat(e.amount).toFixed(1)}</td>
                  <td>{e.recorded_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, padding:16, borderTop:'1px solid #f3f4f6' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={miniInp}>Previous</button>
            <div style={{ display:'flex', alignItems:'center', fontSize:13, fontWeight:600 }}>Page {currentPage} of {totalPages}</div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={miniInp}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13 };
