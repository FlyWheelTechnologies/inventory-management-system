import React from "react";
import { formatCurrency } from "../../services/formatters";

export default function FulfillItemsModal({
  show,
  onClose,
  selectedSale,
  items,
  setItems,
  products,
  onFulfill,
  fulfilling
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>📦 Fulfill Prepayment Items</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
            💰 Total Paid: GHS {formatCurrency(parseFloat(selectedSale?.amount_paid || 0))}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
            🏦 Remaining Credit: GHS {formatCurrency(Math.abs(selectedSale?.balance_due || 0))}
          </span>
        </div>

        <table className="stock-table" style={{ marginBottom: 20 }}>
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ position: 'relative' }}>
                  <select
                    className="form-select"
                    value={item.product_id}
                    onChange={(e) => {
                      const p = products.find(prod => prod.id === e.target.value || prod.id === parseInt(e.target.value));
                      const newItems = [...items];
                      newItems[idx] = { ...newItems[idx], product_id: p.id, product_name: p.name, unit_price: p.selling_price };
                      setItems(newItems);
                    }}
                  >
                    <option value="">Select Product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity} in stock)</option>)}
                  </select>
                </td>
                <td><input type="number" className="form-input" style={{ width: 60 }} value={item.quantity} onChange={e => {
                  const newItems = [...items];
                  newItems[idx].quantity = e.target.value;
                  setItems(newItems);
                }} /></td>
                <td><input type="number" className="form-input" style={{ width: 100 }} value={item.unit_price} onChange={e => {
                  const newItems = [...items];
                  newItems[idx].unit_price = e.target.value;
                  setItems(newItems);
                }} /></td>
                <td style={{ fontWeight: 600 }}>GHS {formatCurrency(item.quantity * item.unit_price)}</td>
                <td><button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }])} style={{ background: '#f3f4f6', padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Row</button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Total Items: GHS {formatCurrency(items.reduce((a, i) => a + (i.quantity * i.unit_price), 0))}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: (items.reduce((a, i) => a + (i.quantity * i.unit_price), 0) - (selectedSale?.amount_paid || 0)) > 0 ? '#ef4444' : '#059669' }}>
              Balance Due: GHS {formatCurrency(Math.max(0, items.reduce((a, i) => a + (i.quantity * i.unit_price), 0) - (selectedSale?.amount_paid || 0)))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={onFulfill}
            disabled={fulfilling}
            style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: fulfilling ? 0.7 : 1 }}
          >
            {fulfilling ? 'Processing...' : 'Complete Fulfillment'}
          </button>
        </div>
      </div>
    </div>
  );
}
