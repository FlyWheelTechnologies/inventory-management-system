import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const NAV_ITEMS = [
  {
    id: "dashboard", label: "Dashboard", path: "/dashboard",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
  {
    id: "sales", label: "Sales",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    children: [
      { id: "sales-list", label: "Sales Records", path: "/sales" },
      { id: "customers-list", label: "Customers", path: "/customers" },
    ],
  },
  {
    id: "stock", label: "Stock",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
    children: [
      { id: "products", label: "Products", path: "/products" },
    ],
  },
  {
    id: "accounting", label: "Accounting",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    children: [
      { id: "daily-report", label: "Entries", path: "/reports/daily", roles: ['admin', 'auditor'] },
      { id: "expenses", label: "Expenses", path: "/expenses", roles: ['admin', 'auditor'] },
      { id: "deposits", label: "Deposits", path: "/deposits" },
    ],
  },
  {
    id: "admin", label: "Admin", roles: ['admin'],
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    children: [
      { id: "logs", label: "System Logs", path: "/logs" },
      { id: "settings", label: "User & Roles", path: "/settings" },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const [openMenus, setOpenMenus] = useState(() => {
    const cached = localStorage.getItem("sidebar_open_menus");
    return cached ? JSON.parse(cached) : { stock: true };
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Save menu state
  useEffect(() => {
    localStorage.setItem("sidebar_open_menus", JSON.stringify(openMenus));
  }, [openMenus]);

  // Smart Auto-expansion: Open parent menu of current active route
  useEffect(() => {
    if (!collapsed) {
      NAV_ITEMS.forEach(item => {
        if (item.children?.some(c => location.pathname === c.path)) {
          setOpenMenus(prev => ({ ...prev, [item.id]: true }));
        }
      });
    }
  }, [location.pathname, collapsed]);

  const toggleMenu = (id) => setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  const isActive = (path) => {
    if (!path) return false;
    // Exact match or sub-route match
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isParentActive = (item) => {
    // Parent is active if any of its children are active
    return item.children?.some(child => isActive(child.path));
  };

  const filteredItems = NAV_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes(user?.role)) return false;
    return true;
  }).map(item => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => !child.roles || child.roles.includes(user?.role))
      };
    }
    return item;
  });

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <button className="sidebar__collapse-btn" onClick={onToggle} title={collapsed ? "Expand" : "Collapse"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {!collapsed && <span>Collapse</span>}
      </button>

      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <img src="/logo.png" alt="Flywheel Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -4 }}>Powered by</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <span className="sidebar__logo-text">Flywheel</span>
              <button 
                onClick={() => window.location.reload()} 
                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                title="Refresh Data"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        {filteredItems.map(item =>
          item.children ? (
            <div key={item.id} className="sidebar__group">
              <button
                className={`sidebar__item sidebar__item--parent ${isParentActive(item) ? "sidebar__item--active" : ""}`}
                onClick={() => !collapsed && toggleMenu(item.id)}
                title={collapsed ? item.label : ""}
                aria-expanded={!collapsed && openMenus[item.id]}
              >
                <span className="sidebar__icon">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="sidebar__label">{item.label}</span>
                    <span className={`sidebar__chevron ${openMenus[item.id] ? "sidebar__chevron--open" : ""}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                  </>
                )}
              </button>
              <div 
                className={`sidebar__children-wrapper ${!collapsed && openMenus[item.id] ? "sidebar__children-wrapper--open" : ""}`}
                aria-hidden={collapsed || !openMenus[item.id]}
              >
                <div className="sidebar__children">
                  {item.children.map(child => (
                    <button key={child.id} className={`sidebar__child ${isActive(child.path) ? "sidebar__child--active" : ""}`} onClick={() => navigate(child.path)}>
                      {child.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <button key={item.id} className={`sidebar__item ${isActive(item.path) ? "sidebar__item--active" : ""}`} onClick={() => navigate(item.path)} title={collapsed ? item.label : ""}>
              <span className="sidebar__icon">{item.icon}</span>
              {!collapsed && <span className="sidebar__label">{item.label}</span>}
            </button>
          )
        )}
      </nav>
    </aside>
  );
}
