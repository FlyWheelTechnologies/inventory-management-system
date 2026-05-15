import React from "react";
import { formatCurrency } from "../../services/formatters";

export default function CustomerHistory({ customer, history, onClose }) {
  if (!customer) return null;

  return (
    <div className="table-card" style={{ height: 'fit-content' }}>
      <div className="table-card__header">
        <h3 className="table-card__title">Sales History: {customer.name}</h3>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
          Lifetime Spent: GHS {formatCurrency(customer.total_spent)}
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="table-wrapper">
        <table className="stock-table" style={{ fontSize: 12 }}>
          <thead><tr><th>Date</th><th>ID</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>No sales recorded.</td></tr>
            ) : history.map(h => (
              <tr key={h.id}>
                <td>{new Date(h.created_at).toLocaleDateString()}</td>
                <td className="table-code">#INV-{String(h.invoice_no || h.id).slice(-6).padStart(3, '0')}</td>
                <td style={{ fontWeight: 600 }}>GHS {formatCurrency(h.total_amount)}</td>
                <td><span className={`status-pill status-pill--${h.payment_status === 'PAID' ? 'ok' : 'low'}`} style={{ fontSize: 10 }}>{h.payment_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
