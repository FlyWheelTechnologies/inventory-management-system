import { useEffect, useState } from "react";
import "./Dashboard.css";

const API_URL = "http://localhost:5000/api";

export default function AdminSettings() {
  const [users, setUsers] = useState([]);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/users`);
    setUsers(await res.json());
  };

  const changeRole = async (userId, newRole) => {
    await fetch(`${API_URL}/users/${userId}/role`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  };

  const ROLE_INFO = {
    admin: { color:'#2563eb', bg:'#dbeafe', desc:'Full access — CRUD, user management, reports, delete records' },
    storekeeper: { color:'#059669', bg:'#d1fae5', desc:'Add stock, record sales, view dashboard. No deletes or financial reports.' },
    auditor: { color:'#7c3aed', bg:'#ede9fe', desc:'Read-only access. Can view all records and export reports.' },
  };

  return (
    <div style={{ padding:24 }}>
      <h2 className="section-title" style={{ marginBottom:8 }}>Admin Settings</h2>
      <p style={{ color:'#6b7280', fontSize:13, marginBottom:24 }}>Manage users and role-based access control</p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:30 }}>
        {Object.entries(ROLE_INFO).map(([role, info]) => (
          <div key={role} className="stat-card" style={{ borderTop:`3px solid ${info.color}` }}>
            <span style={{ fontWeight:700, fontSize:15, textTransform:'capitalize', color:info.color }}>{role}</span>
            <p style={{ fontSize:12, color:'#6b7280', marginTop:6 }}>{info.desc}</p>
          </div>
        ))}
      </div>

      <div className="table-card">
        <div className="table-card__header"><h3 className="table-card__title">System Users</h3></div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>ID</th><th>Email</th><th>Current Role</th><th>Change Role</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="table-code">#{u.id}</td>
                  <td style={{fontWeight:500}}>{u.email}</td>
                  <td>
                    <span style={{ background:ROLE_INFO[u.role]?.bg || '#f3f4f6', color:ROLE_INFO[u.role]?.color || '#374151', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{u.role}</span>
                  </td>
                  <td>
                    <select style={{ padding:6, borderRadius:6, border:'1px solid #ddd', fontSize:13 }} value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
                      <option value="admin">Admin</option>
                      <option value="storekeeper">Storekeeper</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
