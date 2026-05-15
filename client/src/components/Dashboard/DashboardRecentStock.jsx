import React from "react";

export default function DashboardRecentStock({ products, onNavigate }) {
  return (
    <div className="table-card" style={{ marginTop: 24 }}>
      <div className="table-card__header">
        <h3 className="table-card__title">Recent Stock Status</h3>
      </div>
      <div className="table-wrapper">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Item Name</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 8).map((p) => (
              <tr
                key={p.id}
                onClick={onNavigate}
                style={{ cursor: 'pointer' }}
                className="clickable-row"
              >
                <td className="table-code" style={{ fontSize: '11px', fontWeight: 600 }}>{p.item_code || '---'}</td>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td>{p.stock_quantity}</td>
                <td>{p.selling_uom}</td>
                <td>
                  {p.stock_quantity <= 0 ? (
                    <span className="status-pill" style={{ background: '#000', color: '#fff', fontSize: '10px' }}>DEPLETED</span>
                  ) : (
                    <span className={`status-pill status-pill--low`}>
                      Low
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
