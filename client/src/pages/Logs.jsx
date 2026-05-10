import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from("logs").select("*");
    setLogs(data || []);
    setLoading(false);
  };

  const getActionColor = (action) => {
    if (action.includes('SALE')) return '#22c55e';
    if (action.includes('PRODUCT')) return '#2563eb';
    if (action.includes('LOGIN')) return '#6b7280';
    return '#111827';
  };

  return (
    <div className="page-wrapper" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="section-title">System Audit Logs</h2>
        <button className="quick-action-btn" onClick={fetchLogs}>Refresh Logs</button>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>No logs found.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>{log.user_email}</td>
                    <td>
                      <span style={{ 
                        fontWeight: 700, 
                        fontSize: '11px', 
                        color: getActionColor(log.action),
                        border: `1px solid ${getActionColor(log.action)}`,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
