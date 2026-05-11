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

  const [editUserId, setEditUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem("auth_token");
    const url = editUserId ? `${API_URL}/users/${editUserId}` : `${API_URL}/users`;
    const method = editUserId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newUser),
    });

    if (res.ok) {
      setNewUser({ email: '', password: '', role: 'storekeeper', full_name: '' });
      setShowAddUser(false);
      setEditUserId(null);
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const startEdit = (u) => {
    setEditUserId(u.id);
    setNewUser({ email: u.email, password: '', role: u.role, full_name: u.full_name || '' });
    setShowAddUser(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <button className="quick-action-btn" onClick={() => {
          setShowAddUser(!showAddUser);
          if (showAddUser) { setEditUserId(null); setNewUser({ email: '', password: '', role: 'storekeeper', full_name: '' }); }
        }}>
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
          <div className="table-card__header">
            <h3 className="table-card__title">{editUserId ? 'Update Staff Account' : 'Create New Staff Account'}</h3>
          </div>
          <form onSubmit={handleUserSubmit} style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={lbl}>Full Name</label>
              <input style={inp} type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
            </div>
            <div>
              <label style={lbl}>Email Address</label>
              <input style={inp} type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
            </div>
            <div>
              <label style={lbl}>{editUserId ? 'New Password (leave blank to keep current)' : 'Temporary Password'}</label>
              <div style={{ position:'relative' }}>
                <input 
                  style={inp} 
                  type={showPassword ? "text" : "password"} 
                  value={newUser.password} 
                  onChange={e => setNewUser({...newUser, password: e.target.value})} 
                  required={!editUserId} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position:'absolute', right:8, top:8, background:'none', border:'none', fontSize:12, cursor:'pointer', color:'#6b7280' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label style={lbl}>Role</label>
              <select style={inp} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="storekeeper">Storekeeper</option>
                <option value="auditor">Auditor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="quick-action-btn" style={{ marginTop: 'auto', height: 38 }}>
              {editUserId ? 'Save Changes' : 'Create User'}
            </button>
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
            <thead><tr><th>Email</th><th>Full Name</th><th>Current Role</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:600}}>{u.email}</td>
                  <td>{u.full_name || '—'}</td>
                  <td>
                    <span style={{ background:ROLE_INFO[u.role]?.bg || '#f3f4f6', color:ROLE_INFO[u.role]?.color || '#374151', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{u.role}</span>
                  </td>
                  <td style={{ display:'flex', gap:10 }}>
                    <button 
                      onClick={() => startEdit(u)} 
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#2563eb', fontWeight:600, fontSize:13 }}
                    >
                      Edit
                    </button>
                    {u.id !== currentUser?.id && (
                      <button 
                        onClick={() => deleteUser(u.id)} 
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontWeight:600, fontSize:13 }}
                      >
                        Delete
                      </button>
                    )}
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
