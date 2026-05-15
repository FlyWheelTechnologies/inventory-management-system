import React from "react";
import { formatCurrency } from "../../services/formatters";

export default function CustomerTable({
  customers,
  search,
  setSearch,
  sortBy,
  setSortBy,
  onViewHistory,
  onEdit,
  onDelete,
  isAdmin,
  currentPage,
  totalPages,
  setCurrentPage,
  selectedId
}) {
  return (
    <div className="table-card">
      <div className="table-card__header">
        <h3 className="table-card__title">All Customers</h3>
        <div className="table-card__actions">
          <select style={miniInp} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">Sort by Name</option>
            <option value="spent">High Value (Spent)</option>
            <option value="orders">Most Orders</option>
          </select>
          <input type="search" className="table-search" placeholder="Search..." value={search} onChange={e => {setSearch(e.target.value); setCurrentPage(1);}} />
        </div>
      </div>
      <div className="table-wrapper">
        <table className="stock-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Category</th><th>Last Seen</th><th>Lifetime Spent</th><th>Actions</th></tr></thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} style={{ background: selectedId === c.id ? '#eff6ff' : '' }}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>
                  <div style={{ fontSize: 12 }}>{c.phone}</div>
                </td>
                <td><span style={{ background: c.is_contractor ? '#dbeafe' : '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{c.is_contractor ? 'Contractor' : 'Regular'}</span></td>
                <td style={{ fontSize: 11, color: '#6b7280' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</td>
                <td style={{ fontWeight: 600 }}>
                  GHS {formatCurrency(c.total_spent || 0)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="quick-action-btn" style={{ padding: '4px 8px', fontSize: 11, width: 'auto' }} onClick={() => onViewHistory(c)}>History</button>
                    <button onClick={() => onEdit(c)} style={{ background:'none', border:'none', cursor:'pointer' }} title="Edit">✏️</button>
                    {isAdmin && (
                      <button onClick={() => onDelete(c)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444' }} title="Delete">🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:8, padding:16, borderTop:'1px solid #f3f4f6' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={miniInp}>Previous</button>
          <div style={{ display:'flex', alignItems:'center', fontSize:13, fontWeight:600 }}>Page {currentPage} of {totalPages}</div>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={miniInp}>Next</button>
        </div>
      )}
    </div>
  );
}

const miniInp = { padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, background:'#f9fafb', outline: 'none' };
