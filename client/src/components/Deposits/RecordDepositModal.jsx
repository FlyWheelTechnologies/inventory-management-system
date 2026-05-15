import React from "react";
import { formatPhone } from "../../services/formatters";

export default function RecordDepositModal({
  show,
  onClose,
  custName,
  setCustName,
  custPhone,
  setCustPhone,
  amount,
  setAmount,
  method,
  setMethod,
  onSave,
  saving
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 450 }}>
        <div className="modal-header">
          <h2>💰 Record New Deposit</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Customer Name</label>
            <input className="form-input" value={custName} onChange={e => setCustName(e.target.value)} placeholder="Enter name..." />
          </div>
          <div>
            <label className="form-label">Customer Phone (Optional)</label>
            <input
              className="form-input"
              value={custPhone}
              onChange={e => setCustPhone(formatPhone(e.target.value))}
              placeholder="+233XXXXXXXXX"
            />
          </div>
          <div>
            <label className="form-label">Amount (GHS)</label>
            <input className="form-input" style={{ fontSize: 18, fontWeight: 700 }} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="Momo">Momo</option>
              <option value="Bank">Bank Transfer</option>
            </select>
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            style={{ marginTop: 10, padding: '14px', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : 'Record Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
}
