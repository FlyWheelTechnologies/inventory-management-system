import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";
import UserForm from "../components/Admin/UserForm";
import UserTable from "../components/Admin/UserTable";
import StatCard from "../components/StatCard";
import { AdminService } from "../services/AdminService";

export default function AdminSettings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'storekeeper', full_name: '' });
  const [error, setError] = useState('');

  const [editUserId, setEditUserId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const data = await AdminService.fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Permission denied or connection issue: " + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      await AdminService.deleteUser(userId, currentUser.email);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');

    try {
      await AdminService.saveUser(newUser, editUserId, currentUser.email);
      setNewUser({ email: '', password: '', role: 'storekeeper', full_name: '' });
      setShowAddUser(false);
      setEditUserId(null);
      fetchUsers();
    } catch (err) {
      console.error("User submit error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
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
    admin: { color:'#2563eb', desc:'Full access — CRUD, user management, reports, delete records' },
    storekeeper: { color:'#059669', desc:'Add stock, record sales, view dashboard. No deletes or financial reports.' },
    auditor: { color:'#7c3aed', desc:'Read-only access. Can view all records and export reports.' },
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

      <UserForm
        editingId={editUserId}
        newUser={newUser}
        setNewUser={setNewUser}
        onSave={handleUserSubmit}
        saving={saving}
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:30 }}>
        {Object.entries(ROLE_INFO).map(([role, info]) => (
          <StatCard
            key={role}
            label={role.charAt(0).toUpperCase() + role.slice(1)}
            value=""
            style={{ borderTop:`3px solid ${info.color}` }}
            children={<p style={{ fontSize:12, color:'#6b7280', marginTop:6 }}>{info.desc}</p>}
          />
        ))}
      </div>

      <UserTable
        users={users}
        currentUser={currentUser}
        onEdit={startEdit}
        onDelete={handleDeleteUser}
      />
    </div>
  );
}
