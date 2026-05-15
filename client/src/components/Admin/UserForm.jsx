import React, { useState } from "react";

export default function UserForm({
  editingId,
  newUser,
  setNewUser,
  onSave,
  saving
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="table-card" style={{ marginBottom: 24 }}>
      <div className="table-card__header">
        <h3 className="table-card__title">{editingId ? 'Update Staff Account' : 'Create New Staff Account'}</h3>
      </div>
      <form onSubmit={onSave} style={{ padding: 20 }} className="form-grid">
        <div>
          <label className="form-label">Full Name</label>
          <input className="form-input" type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
        </div>
        <div>
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
        </div>
        <div>
          <label className="form-label">{editingId ? 'New Password (leave blank to keep current)' : 'Temporary Password'}</label>
          <div style={{ position:'relative' }}>
            <input
              className="form-input"
              type={showPassword ? "text" : "password"}
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              required={!editingId}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position:'absolute', right:8, top:8, background:'none', border:'none', fontSize:12, cursor:'pointer', color:'#6b7280' }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div>
          <label className="form-label">Role</label>
          <select className="form-select" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
            <option value="storekeeper">Storekeeper</option>
            <option value="auditor">Auditor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="quick-action-btn" style={{ marginTop: 'auto', height: 38 }} disabled={saving}>
          {saving ? 'Processing...' : (editingId ? 'Save Changes' : 'Create User')}
        </button>
      </form>
    </div>
  );
}
