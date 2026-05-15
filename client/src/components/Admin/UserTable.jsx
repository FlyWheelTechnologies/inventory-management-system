import React from "react";

const ROLE_INFO = {
  admin: { color:'#2563eb', bg:'#dbeafe' },
  storekeeper: { color:'#059669', bg:'#d1fae5' },
  auditor: { color:'#7c3aed', bg:'#ede9fe' },
};

export default function UserTable({ users, currentUser, onEdit, onDelete }) {
  return (
    <div className="table-card">
      <div className="table-card__header"><h3 className="table-card__title">System Users</h3></div>
      <div className="table-wrapper">
        <table className="stock-table">
          <thead><tr><th>Email</th><th>Full Name</th><th>Current Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{fontWeight:600}}>{u.email}</td>
                <td>{u.full_name || '—'}</td>
                <td>
                  <span style={{
                    background: ROLE_INFO[u.role]?.bg || '#f3f4f6',
                    color: ROLE_INFO[u.role]?.color || '#374151',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}>{u.role}</span>
                </td>
                <td style={{ display:'flex', gap:10 }}>
                  <button
                    onClick={() => onEdit(u)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#2563eb', fontWeight:600, fontSize:13 }}
                  >
                    Edit
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => onDelete(u.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontWeight:600, fontSize:13 }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
