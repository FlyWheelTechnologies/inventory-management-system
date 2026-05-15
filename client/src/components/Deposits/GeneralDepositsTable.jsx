import React from "react";
import { formatCurrency } from "../../services/formatters";

export default function GeneralDepositsTable({
  deposits,
  onDownloadReceipt
}) {
  return (
    <div className="table-card">
      <div className="table-card__header">
        <h3 className="table-card__title">Direct Prepayments (Cash/Momo)</h3>
      </div>
      <div className="table-wrapper">
        <table className="stock-table">
          <thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Recorded By</th><th>Actions</th></tr></thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:'center', padding:24}}>No prepayment records found.</td></tr>
            ) : deposits.map(d => (
              <tr key={d.id}>
                <td style={{fontSize:12}}>{new Date(d.created_at).toLocaleDateString()}</td>
                <td style={{fontWeight:600}}>{d.customers?.name || '---'}</td>
                <td style={{color:'#059669', fontWeight:700}}>GHS {formatCurrency(d.amount)}</td>
                <td><span className="status-pill status-pill--ok" style={{fontSize:11}}>{d.payment_method}</span></td>
                <td style={{fontSize:11, color:'#6b7280'}}>{d.recorded_by}</td>
                <td>
                  <button
                    onClick={() => onDownloadReceipt(d)}
                    style={{ background: '#f3f4f6', border: '1px solid #ddd', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >📄 Receipt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
