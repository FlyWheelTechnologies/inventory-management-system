import React from "react";
import { formatCurrency } from "../../services/formatters";

export default function DepositOrdersTable({
  orders,
  onFulfill,
  onFulfillItems
}) {
  return (
    <div className="table-card" style={{ marginBottom: 32 }}>
      <div className="table-card__header">
        <h3 className="table-card__title">Pending Fulfillment (Items Due)</h3>
      </div>
      <div className="table-wrapper">
        <table className="stock-table">
          <thead><tr><th>Date</th><th>Customer</th><th>Total Value</th><th>Amount Paid</th><th>Credit Balance</th><th>Actions</th></tr></thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:'center', padding:24}}>No pending fulfillments found.</td></tr>
            ) : orders.map(s => (
              <tr key={s.id}>
                <td style={{fontSize:12}}>{new Date(s.created_at).toLocaleDateString()}</td>
                <td style={{fontWeight:600}}>{s.customer_name}</td>
                <td>GHS {formatCurrency(s.total_amount)}</td>
                <td style={{color:'#059669', fontWeight:600}}>GHS {formatCurrency(s.amount_paid)}</td>
                <td style={{color:'#2563eb', fontWeight:700}}>GHS {formatCurrency(Math.abs(s.balance_due))}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onFulfill(s)}
                      style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >Mark Fulfilled</button>
                    <button
                      onClick={() => onFulfillItems(s)}
                      style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >+ Select Items</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
