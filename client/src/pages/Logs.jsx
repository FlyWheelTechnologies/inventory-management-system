import { useEffect, useState } from "react";
import "./Dashboard.css";
import LogsTable from "../components/Logs/LogsTable";
import { LogsService } from "../services/LogsService";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchLogs();
    
    const subscription = LogsService.subscribeToLogs((newLog) => {
      setLogs(prev => [newLog, ...prev]);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await LogsService.fetchLogs(100);
      setLogs(data);
    } catch (err) {
      console.error("Error fetching logs:", err.message);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.user_email || "").toLowerCase().includes(search.toLowerCase()) ||
                          (log.details || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || (log.action || "").startsWith(filter);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="logs-container" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 300, height: 40 }} />
          <div style={{ display:'flex', gap:10 }}>
            <div className="skeleton" style={{ width: 120, height: 38 }} />
            <div className="skeleton" style={{ width: 160, height: 38 }} />
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
            <div key={i} className="skeleton" style={{ height: 45, marginBottom: 12, width: '100%' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="section-title">System Audit Logs</h2>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Tamper-proof trail of all system actions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select 
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            <option value="SALE">Sales</option>
            <option value="PRODUCT">Products</option>
            <option value="STOCK">Stock Adjustments</option>
            <option value="USER">User Management</option>
          </select>
          <input 
            type="search" 
            placeholder="Search logs..." 
            className="table-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <LogsTable
        logs={logs}
        loading={loading}
        filteredLogs={filteredLogs}
      />
    </div>
  );
}
