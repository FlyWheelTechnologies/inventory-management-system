import React from "react";
import { formatCurrency } from "../../services/formatters";
import { JournalEntriesService } from "../../services/JournalEntriesService";

export default function JournalTable({
  viewMode,
  selectedDate,
  paginated,
  currentData,
  itemsToShow,
  setItemsToShow,
  totalDebits,
  totalCredits,
  onDayClick
}) {
  return (
    <div className="table-card print-section">
      <div className="table-card__header">
        <h3 className="table-card__title">
          {viewMode === 'Daily' ? `Ledger for ${new Date(selectedDate).toDateString()}` : `${viewMode} Financial Summary`}
        </h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 12, display: 'flex', gap: 10 }} className="no-print">
            <span style={{ color: '#059669', fontWeight: 700 }}>Total Debits: GHS {formatCurrency(totalDebits)}</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>Total Credits: GHS {formatCurrency(totalCredits)}</span>
          </div>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="stock-table">
          <thead>
            {viewMode === 'Daily' ? (
              <tr><th>Time</th><th>Account</th><th>Debit (In)</th><th>Credit (Out)</th><th>Description</th></tr>
            ) : (
              <tr><th>Date</th><th>Daily Debit (In)</th><th>Daily Credit (Out)</th><th>Transactions</th><th>Actions</th></tr>
            )}
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24 }}>No records found.</td></tr>
            ) : paginated.map((j, idx) => viewMode === 'Daily' ? (
              <tr key={j.id || idx}>
                <td style={{ fontSize: 11, color: '#6b7280' }}>{new Date(j.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <span style={{
                    background: JournalEntriesService.getAccountColor(j.account_type).bg,
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: JournalEntriesService.getAccountColor(j.account_type).text
                  }}>
                    {j.account_type}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: j.debit > 0 ? '#059669' : '#ccc' }}>{j.debit > 0 ? `GHS ${formatCurrency(j.debit)}` : '—'}</td>
                <td style={{ fontWeight: 600, color: j.credit > 0 ? '#ef4444' : '#ccc' }}>{j.credit > 0 ? `GHS ${formatCurrency(j.credit)}` : '—'}</td>
                <td style={{ fontSize: 13 }}>{j.description}</td>
              </tr>
            ) : (
              <tr key={j.date} style={{ cursor: 'pointer' }} onClick={() => onDayClick(j.date)}>
                <td style={{ fontWeight: 700 }}>{new Date(j.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td style={{ color: '#059669', fontWeight: 600 }}>GHS {formatCurrency(j.debit)}</td>
                <td style={{ color: '#ef4444', fontWeight: 600 }}>GHS {formatCurrency(j.credit)}</td>
                <td style={{ fontSize: 12 }}>{j.count} entries recorded</td>
                <td><button className="action-btn" style={{ fontSize: 10, padding: '4px 8px' }}>View Day</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {currentData.length > itemsToShow && (
        <div className="no-print see-more-container">
          <button
            onClick={() => setItemsToShow(prev => prev + 25)}
            className="see-more-btn"
          >
            See More Transactions ↓
          </button>
        </div>
      )}
    </div>
  );
}
