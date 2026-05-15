import React from "react";

export default function CustomerForm({
  show,
  editingId,
  form,
  setForm,
  onSave,
  saving
}) {
  if (!show) return null;

  return (
    <div className="table-card" style={{ marginBottom: 24 }}>
      <div className="table-card__header">
        <h3 className="table-card__title">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
      </div>
      <form onSubmit={onSave} style={{ padding: 20 }} className="form-grid">
        <div>
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} required />
        </div>
        <div>
          <label className="form-label">Phone Number</label>
          <input className="form-input" value={form.phone || ''} onChange={e => {
            let val = e.target.value;
            if (val.startsWith('0')) val = '+233' + val.substring(1);
            setForm({...form, phone: val});
          }} placeholder="+233XXXXXXXXX" />
        </div>
        <div>
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
        </div>
        <div>
          <label className="form-label">Address / Location</label>
          <input className="form-input" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'center', marginTop: 10 }}>
          <input type="checkbox" id="contractor" checked={form.is_contractor} onChange={e => setForm({...form, is_contractor: e.target.checked})} />
          <label htmlFor="contractor" style={{ fontSize: 13, fontWeight: 600 }}>Is Contractor / Large Buyer?</label>
        </div>
        <button type="submit" className="quick-action-btn" style={{ marginTop: 'auto', height: 38 }} disabled={saving}>
          {saving ? 'Saving...' : (editingId ? 'Update Customer' : 'Save Customer')}
        </button>
      </form>
    </div>
  );
}
