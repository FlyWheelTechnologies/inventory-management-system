import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";
import ConfirmationModal from "../components/ConfirmationModal";
import CustomerForm from "../components/Customers/CustomerForm";
import CustomerTable from "../components/Customers/CustomerTable";
import CustomerHistory from "../components/Customers/CustomerHistory";
import { CustomersService } from "../services/CustomersService";

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  // History & Sidebar
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Deletion
  const [showConfirm, setShowConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const emptyForm = { name:'', phone:'', email:'', address:'', is_contractor: false };
  const [form, setForm] = useState(emptyForm);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const data = await CustomersService.fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const customerToSave = { ...form };
      if (editingId) customerToSave.id = editingId;

      await CustomersService.saveCustomer(customerToSave, user.email);
      
      setToast({ message: editingId ? "Customer updated!" : "Customer added!", type: "success" });
      setShowForm(false);
      setEditingId(null);
      setForm({...emptyForm});
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || "Failed to save customer", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await CustomersService.deleteCustomer(customerToDelete.id, customerToDelete.name, user.email);
      setToast({ message: "Customer removed", type: "success" });
      setShowConfirm(false);
      setCustomerToDelete(null);
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || "Error deleting customer", type: "error" });
    }
  };

  const viewHistory = async (c) => {
    setSelectedCustomer(c);
    try {
      const data = await CustomersService.fetchCustomerHistory(c.id);
      setHistory(data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      is_contractor: c.is_contractor
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = useMemo(() => {
    let result = customers.filter(c =>
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search)
    );

    if (sortBy === 'name') result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (sortBy === 'spent') result.sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
    if (sortBy === 'orders') result.sort((a, b) => (b.order_count || 0) - (a.order_count || 0));

    return result;
  }, [customers, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-6"><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="section-title">Customer Directory</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Manage high-value clients and view their purchase history</p>
        </div>
        <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({...emptyForm}); }}>
          {showForm ? 'Cancel' : '+ New Customer'}
        </button>
      </div>

      <CustomerForm
        show={showForm}
        editingId={editingId}
        form={form}
        setForm={setForm}
        onSave={handleSubmit}
        saving={saving}
      />

      {toast && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ 
            position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', 
            background: toast.type === 'error' ? '#991b1b' : '#064e3b', 
            color:'#fff', padding:'16px 24px', borderRadius:'16px', 
            boxShadow:'0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)', 
            zIndex:3000, display:'flex', alignItems:'center', gap:15, 
            animation:'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            minWidth: '300px'
          }}
        >
          <div style={{ fontSize:24 }}>{toast.type === 'error' ? '⚠️' : '✅'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight:700, fontSize: 14 }}>{toast.message}</div>
          </div>
          <button 
            onClick={() => setToast(null)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
          >✕</button>
          <style>{`
            @keyframes slideDown { 
              from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
              to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1.5fr 1fr' : '1fr', gap: 24 }}>
        <CustomerTable
          customers={paginated}
          search={search}
          setSearch={setSearch}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onViewHistory={viewHistory}
          onEdit={startEdit}
          onDelete={(c) => { setCustomerToDelete(c); setShowConfirm(true); }}
          isAdmin={isAdmin}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          selectedId={selectedCustomer?.id}
        />

        <CustomerHistory
          customer={selectedCustomer}
          history={history}
          onClose={() => setSelectedCustomer(null)}
        />
      </div>

      <ConfirmationModal
        show={showConfirm}
        title="Delete Customer"
        message={`Are you sure you want to delete "${customerToDelete?.name}"? All purchase history records will remain in the sales table but will no longer be linked.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        type="danger"
      />
    </div>
  );
}
