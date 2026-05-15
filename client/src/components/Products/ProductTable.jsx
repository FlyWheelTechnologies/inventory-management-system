import React from "react";
import { formatCurrency } from "../../services/formatters";
import { CATEGORIES } from "../../services/ProductsService";

export default function ProductTable({
  products,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  onEdit,
  onDelete,
  isAuditor,
  userRole,
  itemsToShow,
  setItemsToShow,
  setCurrentPage
}) {
  return (
    <div className="table-card">
      <div className="table-card__header">
        <h3 className="table-card__title">Current Stock</h3>
        <div className="table-card__actions">
          <div style={{ position: 'relative' }}>
            <select className="form-select" style={{ paddingLeft: 30, width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </div>

          <div style={{ position: 'relative' }}>
            <select className="form-select" style={{ paddingLeft: 30, width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Sort by Name</option>
              <option value="newest">Newest Added</option>
              <option value="margin">Best Margin</option>
              <option value="stock_low">Low Stock First</option>
              <option value="stock_high">High Stock First</option>
              <option value="price_high">Price: High to Low</option>
              <option value="price_low">Price: Low to High</option>
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <path d="M3 6h18M6 12h12m-9 6h6"/>
            </svg>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="search"
              className="table-search"
              placeholder="Search..."
              value={search}
              onChange={e => {setSearch(e.target.value); setCurrentPage(1);}}
              style={{ paddingLeft: 34, height: 32 }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="3" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="stock-table">
          <thead><tr>
            <th>Code</th><th>Name</th><th>Category</th><th>Stock</th><th>Sell Unit</th><th>Cost</th><th>Price</th><th>Margin</th><th>Status</th>{!isAuditor && <th>Actions</th>}
          </tr></thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={isAuditor ? "9" : "10"} style={{textAlign:'center', padding:24}}>No products found.</td></tr>
            ) : products.map(p => (
              <tr key={p.id}>
                <td className="table-code">{p.item_code || '---'}</td>
                <td style={{fontWeight:500}}>{p.name}</td>
                <td><span style={{background:'#f3f4f6', padding:'2px 8px', borderRadius:4, fontSize:12}}>{p.category}</span></td>
                <td style={{fontWeight:600}}>{p.stock_quantity} {p.selling_uom}s</td>
                <td>{p.selling_uom}</td>
                <td>GHS {formatCurrency(p.cost_price)}</td>
                <td style={{fontWeight:600}}>GHS {formatCurrency(p.selling_price)}</td>
                <td style={{color: (p.selling_price - p.cost_price) / p.selling_price > 0.2 ? '#059669' : '#f59e0b', fontWeight: 600}}>
                  {p.selling_price > 0 ? (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(1) : 0}%
                </td>
                <td>
                  {p.stock_quantity <= 0 ? (
                    <span className="status-pill" style={{ background: '#000', color: '#fff' }}>DEPLETED</span>
                  ) : (
                    <span className={`status-pill status-pill--${p.stock_quantity < (p.low_stock_threshold || 10) ? 'low' : 'ok'}`}>
                      {p.stock_quantity < (p.low_stock_threshold || 10) ? 'Low Stock' : 'OK'}
                    </span>
                  )}
                </td>
                {!isAuditor && (
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => onEdit(p)}
                        className="action-icon-btn"
                        onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                        onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                        title="Edit Product"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => onDelete(p)}
                          className="action-icon-btn"
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                          title="Delete Product"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {products.length >= itemsToShow && (
        <div className="see-more-container">
          <button
            onClick={() => setItemsToShow(prev => prev + 25)}
            className="see-more-btn"
          >
            See More Products ↓
          </button>
        </div>
      )}
    </div>
  );
}
