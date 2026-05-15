import React from "react";

const CATEGORIES = ['Utilities', 'Transport', 'Salary', 'Maintenance', 'Supplies', 'Misc'];

export default function ExpenseForm({
  show,
  form,
  setForm,
  onSave
}) {
  if (!show) return null;

  return (
    <div className="table-card" style={{ marginBottom:24 }}>
      <form onSubmit={onSave} style={{ padding:20, alignItems:'end' }} className="form-grid">
        <div>
          <label className="form-label">Description</label>
          <input className="form-input" value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))} required />
        </div>
        <div>
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={e => setForm(f=>({...f, category:e.target.value}))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Amount (GHS)</label>
          <input className="form-input" type="number" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f, amount:e.target.value}))} required />
        </div>
        <button type="submit" className="quick-action-btn" style={{ height:38 }}>Save</button>
      </form>
    </div>
  );
}
