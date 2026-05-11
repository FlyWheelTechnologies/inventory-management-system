import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const API_URL = "http://localhost:5000/api";

export default function AdminSettings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'storekeeper', full_name: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setUsers(await res.json());
    }
  };

  const changeRole = async (userId, newRole) => {
    setError('');
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${API_URL}/users/${userId}/role`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole }),
    });
    
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
    } else {
      fetchUsers();
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newUser),
    });

    if (res.ok) {
      setNewUser({ email: '', password: '', role: 'storekeeper', full_name: '' });
      setShowAddUser(false);
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Access Denied</h2>
        <p>Only administrators can access this page.</p>
      </div>
    );
  }

  const ROLE_INFO = {
    admin: { color:'#2563eb', bg:'#dbeafe', desc:'Full access — CRUD, user management, reports, delete records' },
    storekeeper: { color:'#059669', bg:'#d1fae5', desc:'Add stock, record sales, view dashboard. No deletes or financial reports.' },
    auditor: { color:'#7c3aed', bg:'#ede9fe', desc:'Read-only access. Can view all records and export reports.' },
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="section-title">Admin Settings</h2>
          <p style={{ color:'#6b7280', fontSize:13 }}>Manage users and role-based access control</p>
        </div>
        <button className="quick-action-btn" onClick={() => setShowAddUser(!showAddAddUser)}>
          {showAddUser ? 'Cancel' : '+ Add New Staff'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid #fee2e2' }}>
          ⚠️ {error}
        </div>
      )}

      {showAddUser && (
        <div className="table-card" style={{ marginBottom: 24 }}>
          <div className="table-card__header"><h3 className="table-card__title">Create New Staff Account</h3></div>
          <form onSubmit={handleAddUser} style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={lbl}>Full Name</label>
              <input style={inp} type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
            </div>
            <div>
              <label style={lbl}>Email Address</label>
              <input style={inp} type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
            </div>
            <div>
              <label style={lbl}>Temporary Password</label>
              <input style={inp} type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
            </div>
            <div>
              <label style={lbl}>Role</label>
              <select style={inp} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="storekeeper">Storekeeper</option>
                <option value="auditor">Auditor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="quick-action-btn" style={{ marginTop: 'auto', height: 38 }}>Create User</button>
          </form>
        </div>
      )}

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
            <thead><tr><th>Email</th><th>Full Name</th><th>Current Role</th><th>Change Role</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:600}}>{u.email}</td>
                  <td>{u.full_name || '—'}</td>
                  <td>
                    <span style={{ background:ROLE_INFO[u.role]?.bg || '#f3f4f6', color:ROLE_INFO[u.role]?.color || '#374151', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{u.role}</span>
                  </td>
                  <td>
                    <select 
                      style={{ padding:6, borderRadius:6, border:'1px solid #ddd', fontSize:13, cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer' }} 
                      value={u.role} 
                      onChange={e => changeRole(u.id, e.target.value)}
                      disabled={u.id === currentUser?.id}
                      title={u.id === currentUser?.id ? "You cannot change your own role" : ""}
                    >
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

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13 };
