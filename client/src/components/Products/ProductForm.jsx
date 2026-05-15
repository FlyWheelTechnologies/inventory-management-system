import React from "react";
import { CATEGORIES } from "../../services/ProductsService";

export default function ProductForm({
  show,
  editingId,
  formData,
  setFormData,
  onSave,
  onCancel,
  saving
}) {
  if (!show) return null;

  return (
    <div className="table-card" style={{ marginBottom: 24 }}>
      <div className="table-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="table-card__title">{editingId ? 'Edit Product' : 'New Product'}</h3>
        <button onClick={onCancel} className="close-btn">✕</button>
      </div>
      <form onSubmit={onSave} style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 30 }}>
          {/* Identity */}
          <div>
            <h4 className="sec-header">General Info</h4>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 100 }}>
                <label className="form-label">Item Code</label>
                <input type="text" className="form-input" value={formData.item_code} onChange={e => setFormData({...formData, item_code: e.target.value})} placeholder="CODE-1" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Product Name</label>
                <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dangote Cement" required />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Category</label>
              <select className="form-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="sec-header">Pricing & Units</h4>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Cost Price (GHS)</label>
                <input type="number" step="0.01" className="form-input" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Selling Price (GHS)</label>
                <input type="number" step="0.01" className="form-input" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: e.target.value})} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">UoM (e.g. Bag, Ton)</label>
                <input type="text" className="form-input" value={formData.selling_uom} onChange={e => setFormData({...formData, selling_uom: e.target.value})} placeholder="Bag" required />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h4 className="sec-header">Inventory Levels</h4>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Stock Quantity</label>
                <input type="number" className="form-input" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Low Alert At</label>
                <input type="number" className="form-input" value={formData.low_stock_threshold} onChange={e => setFormData({...formData, low_stock_threshold: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" className="quick-action-btn" style={{ flex: 2, height: 38 }} disabled={saving}>
                {saving ? 'Saving...' : (editingId ? 'Update Product' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
