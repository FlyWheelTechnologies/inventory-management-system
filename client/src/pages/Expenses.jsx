import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";
import { formatCurrency } from "../services/formatters";
import ExpenseForm from "../components/Expenses/ExpenseForm";
import ExpenseTable from "../components/Expenses/ExpenseTable";
import { ExpensesService } from "../services/ExpensesService";

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description:'', category:'Misc', amount:'' });
  const [search, setSearch] = useState('');
  const [itemsToShow, setItemsToShow] = useState(25);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const data = await ExpensesService.fetchExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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

  const filtered = expenses
    .filter(e => e.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const paginated = filtered.slice(0, itemsToShow);
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
            <span style={{ fontSize:18, fontWeight:700 }}>GHS {formatCurrency(totalExpenses)}</span>
          </div>
          <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Record Expense'}</button>
        </div>
      </div>

      <ExpenseForm
        show={showForm}
        form={form}
        setForm={setForm}
        onSave={handleSubmit}
      />

      <ExpenseTable
        expenses={paginated}
        search={search}
        setSearch={setSearch}
        itemsToShow={itemsToShow}
        setItemsToShow={setItemsToShow}
      />
    </div>
  );
}
