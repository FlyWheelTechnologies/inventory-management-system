import React from "react";
import { formatCurrency } from "../../services/formatters";

export default function ExpenseTable({
  expenses,
  search,
  setSearch,
  itemsToShow,
  setItemsToShow
}) {
  return (
    <div className="table-card">
      <div className="table-card__header">
        <h3 className="table-card__title">Expense Ledger</h3>
        <input
          type="search"
          className="table-search"
          placeholder="Search description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="table-wrapper">
        <table className="stock-table">
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>By</th></tr></thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign:'center', padding:24}}>No expenses found.</td></tr>
            ) : expenses.map(e => (
              <tr key={e.id}>
                <td style={{fontSize:12, color:'#6b7280'}}>{new Date(e.created_at).toLocaleDateString()}</td>
                <td style={{fontWeight:500}}>{e.description}</td>
                <td><span style={{background:'#f3f4f6', padding:'2px 8px', borderRadius:4, fontSize:12}}>{e.category}</span></td>
                <td style={{fontWeight:600}}>GHS {formatCurrency(e.amount)}</td>
                <td>{e.recorded_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expenses.length >= itemsToShow && (
        <div className="see-more-container">
          <button
            onClick={() => setItemsToShow(prev => prev + 25)}
            className="see-more-btn"
          >
            See More Expenses ↓
          </button>
        </div>
      )}
    </div>
  );
}
