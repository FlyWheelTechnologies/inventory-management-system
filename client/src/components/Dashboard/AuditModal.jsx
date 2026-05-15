import React from "react";

export default function AuditModal({ show, onClose, logs }) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3>System Activity Audit</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table className="stock-table" style={{ fontSize: 12 }}>
            <thead><tr><th>User</th><th>Action</th><th>Details</th><th>Time</th></tr></thead>
            <tbody>
              {logs.slice(0, 20).map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.user_email}</td>
                  <td><span className="status-pill status-pill--ok" style={{ fontSize: 10 }}>{l.action}</span></td>
                  <td>{l.details}</td>
                  <td style={{ color: '#9ca3af' }}>{new Date(l.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
