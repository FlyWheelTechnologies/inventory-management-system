import { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";
import "../pages/Dashboard.css";

const AVATAR_PRESETS = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png"
];

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const ProfileModal = () => {
    const [name, setName] = useState(user?.full_name || "");
    const [avatar, setAvatar] = useState(user?.avatar_url || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async (e) => {
      e.preventDefault();
      setLoading(true);
      const { error } = await supabase.auth.updateProfile({ full_name: name, avatar_url: avatar });
      setLoading(false);
      if (!error) {
        setShowProfileModal(false);
        window.location.reload(); // Refresh to update context
      } else {
        alert(error.message);
      }
    };

    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-header">
            <h3>Profile Settings</h3>
            <button className="close-btn" onClick={() => setShowProfileModal(false)}>✕</button>
          </div>
          <form onSubmit={handleSave} className="modal-body">
            <div className="form-group">
              <label>Display Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="form-group">
              <label>Select Profile Picture</label>
              <div className="avatar-presets">
                {AVATAR_PRESETS.map((url, i) => (
                  <div 
                    key={i} 
                    className={`preset-item ${avatar === url ? 'preset-item--active' : ''}`}
                    onClick={() => setAvatar(url)}
                  >
                    <img src={url} alt={`Preset ${i}`} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '11px', color: '#6b7280' }}>Or paste custom image URL</label>
                <input 
                  type="text" 
                  value={avatar} 
                  onChange={(e) => setAvatar(e.target.value)} 
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>
            {avatar && (
              <div className="avatar-preview-container">
                <div className="avatar-preview">
                  <img src={avatar} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                </div>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Preview</span>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
      />

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__left">
            <h1 className="topbar__title">FlorzyAngel ENT. Management System</h1>
          </div>

          <div className="topbar__center">
            <div className="topbar__clock">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="topbar__right">
            <div className="topbar__user-container" ref={menuRef}>
              <div className="topbar__user" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} className="topbar__avatar" alt="Avatar" />
                ) : (
                  <div className="topbar__avatar">{user?.full_name?.[0] || user?.email?.[0].toUpperCase()}</div>
                )}
                <div className="topbar__user-info">
                  <span className="topbar__user-name">{user?.full_name || user?.email?.split('@')[0]}</span>
                  <span className="topbar__role">{user?.role || "User"}</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>

              {showProfileMenu && (
                <div className="profile-dropdown">
                  <button onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Edit Profile
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="logout-item" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content" style={{ overflowY: 'auto', display: 'block' }}>
          {children}
        </div>
      </div>

      {showProfileModal && <ProfileModal />}

      <style>{`
        .topbar__user-container {
          position: relative;
        }
        .topbar__user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .topbar__user:hover {
          background: #f3f4f6;
        }
        .topbar__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          background: #2563eb;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }
        .topbar__user-info {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .topbar__title {
          font-size: 17px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
        }
        .topbar__center {
          flex: 1;
          display: flex;
          justify-content: flex-end;
          padding-right: 24px;
        }
        .topbar__clock {
          font-size: 18px;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 6px 16px;
          border-radius: 10px;
          letter-spacing: -0.5px;
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
        }
        .topbar__right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .topbar__user-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
        }
        .topbar__role {
          font-size: 11px;
          color: #6b7280;
          text-transform: capitalize;
        }
        .profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 180px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          padding: 6px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .profile-dropdown button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-size: 13px;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .profile-dropdown button:hover {
          background: #f9fafb;
          color: #111827;
        }
        .dropdown-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 4px 0;
        }
        .logout-item {
          color: #ef4444 !important;
        }
        .logout-item:hover {
          background: #fef2f2 !important;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
        }
        .modal-card {
          background: white;
          width: 100%;
          max-width: 400px;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 { font-size: 18px; font-weight: 700; color: #111827; }
        .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #9ca3af; }
        
        .modal-body { padding: 20px; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; }
        .form-group input:focus { border-color: #2563eb; ring: 2px solid #dbeafe; }
        
        .avatar-presets {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }
        .preset-item {
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
          background: #f9fafb;
        }
        .preset-item:hover { transform: scale(1.05); border-color: #e5e7eb; }
        .preset-item--active { border-color: #2563eb; background: #eff6ff; }
        .preset-item img { width: 100%; height: 100%; object-fit: cover; }

        .avatar-preview-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 16px;
        }
        .avatar-preview { width: 70px; height: 70px; border-radius: 50%; overflow: hidden; margin-bottom: 4px; border: 2px solid #e5e7eb; background: white; }
        .avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
        
        .modal-actions { display: flex; gap: 12px; margin-top: 24px; }
        .modal-actions button { flex: 1; padding: 10px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .btn-secondary:hover { background: #e5e7eb; }
        .btn-primary { background: #2563eb; color: white; border: none; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
