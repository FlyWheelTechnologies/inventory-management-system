import React from "react";
import { formatPhone } from "../../services/formatters";

export default function DepositModal({
  show,
  onClose,
  onSave,
  custName,
  setCustName,
  custPhone,
  setCustPhone,
  amount,
  setAmount,
  method,
  setMethod,
  saving
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 420 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#111827' }}>📥 Record Customer Deposit</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Add a prepayment to a customer's account balance. This does not affect stock.</p>

        <form onSubmit={onSave}>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Customer Name</label>
            <input type="text" className="form-input" value={custName} onChange={e => setCustName(e.target.value)} placeholder="e.g. John Doe" required />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              className="form-input"
              value={custPhone}
              onChange={e => setCustPhone(formatPhone(e.target.value))}
              placeholder="+233XXXXXXXXX"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Amount (GHS)</label>
              <input type="number" step="0.1" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Method</label>
              <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
                <option>Cash</option>
                <option>Momo</option>
                <option>Bank</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Recording...' : 'Record Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
