import React from "react";
import { LogsService } from "../../services/LogsService";

export default function LogsTable({ logs, loading, filteredLogs }) {
  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table className="stock-table">
          <thead>
            <tr>
              <th style={{ width: 180 }}>Time</th>
              <th>User / Role</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40 }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: 10, color: '#6b7280' }}>Loading audit trail...</p>
              </td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>No logs matching your criteria.</td></tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '12px', color: '#6b7280' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{log.user_email}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{log.user_role}</div>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '10px',
                      color: LogsService.getActionColor(log.action),
                      backgroundColor: `${LogsService.getActionColor(log.action)}15`,
                      border: `1px solid ${LogsService.getActionColor(log.action)}30`,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: '#374151' }}>{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
