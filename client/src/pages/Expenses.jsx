import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

const CATEGORIES = ['Utilities', 'Transport', 'Salary', 'Maintenance', 'Supplies', 'Misc'];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description:'', category:'Misc', amount:'' });

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    const { data } = await supabase.from("expenses").select("*");
    setExpenses(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await supabase.from("expenses").insert([form]);
    setForm({ description:'', category:'Misc', amount:'' });
    setShowForm(false);
    fetchExpenses();
  };

  const totalExpenses = expenses.reduce((a, e) => a + parseFloat(e.amount), 0);

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 className="section-title">Expenses</h2>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div className="summary-card" style={{ padding:'10px 20px' }}>
            <span style={{ fontSize:12, color:'#6b7280' }}>Total: </span>
            <span style={{ fontSize:18, fontWeight:700 }}>GHS {totalExpenses.toFixed(2)}</span>
          </div>
          <button className="quick-action-btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Record Expense'}</button>
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
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>By</th></tr></thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No expenses recorded.</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id}>
                  <td style={{fontSize:12, color:'#6b7280'}}>{new Date(e.created_at).toLocaleDateString()}</td>
                  <td style={{fontWeight:500}}>{e.description}</td>
                  <td><span style={{background:'#f3f4f6', padding:'2px 8px', borderRadius:4, fontSize:12}}>{e.category}</span></td>
                  <td style={{fontWeight:600}}>GHS {parseFloat(e.amount).toFixed(2)}</td>
                  <td>{e.recorded_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13 };
