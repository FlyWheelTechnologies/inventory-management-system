import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import ConfirmationModal from "../components/ConfirmationModal";
import "./Dashboard.css";

const emptyForm = { name: '', phone: '', email: '', address: '', is_contractor: false };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("*");
    setCustomers(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("customers").insert([form]);
    if (!error) {
      setForm({ ...emptyForm });
      setShowForm(false);
      fetchCustomers();
    }
  };

  const viewHistory = async (customer) => {
    setSelectedCustomer(customer);
    const res = await fetch(`http://localhost:5000/api/customers/${customer.id}/sales`);
    setHistory(await res.json());
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = customers
    .filter(c => 
      c.name?.toLowerCase().includes(search.toLowerCase()) || 
      c.phone?.includes(search)
    )
    .sort((a, b) => {
      if (sortBy === 'spent') return (b.total_spent || 0) - (a.total_spent || 0);
      if (sortBy === 'orders') return (b.transaction_count || 0) - (a.transaction_count || 0);
      return (a.name || "").localeCompare(b.name || "");
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="section-title">Customer Directory</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Manage high-value clients and view their purchase history</p>
        </div>
        <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Customer'}
        </button>
      </div>

      {showForm && (
        <div className="table-card" style={{ marginBottom: 24 }}>
          <div className="table-card__header"><h3 className="table-card__title">Add New Customer</h3></div>
          <form onSubmit={handleSubmit} style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div><label style={lbl}>Full Name *</label><input style={inp} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div><label style={lbl}>Phone Number</label><input style={inp} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="024XXXXXXX" /></div>
            <div><label style={lbl}>Email Address</label><input style={inp} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><label style={lbl}>Address / Location</label><input style={inp} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="contractor" checked={form.is_contractor} onChange={e => setForm({...form, is_contractor: e.target.checked})} />
              <label htmlFor="contractor" style={{ fontSize: 13, fontWeight: 600 }}>Is Contractor / Large Buyer?</label>
            </div>
            <button type="submit" className="quick-action-btn" style={{ marginTop: 'auto', height: 38 }}>Save Customer</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1.5fr 1fr' : '1fr', gap: 24 }}>
        <div className="table-card">
          <div className="table-card__header">
            <h3 className="table-card__title">All Customers</h3>
            <div className="table-card__actions">
              <select style={miniInp} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="name">Sort by Name</option>
                <option value="spent">High Value (Spent)</option>
                <option value="orders">Most Orders</option>
              </select>
              <input type="search" className="table-search" placeholder="Search..." value={search} onChange={e => {setSearch(e.target.value); setCurrentPage(1);}} />
            </div>
          </div>
          <div className="table-wrapper">
            <table className="stock-table">
              <thead><tr><th>Name</th><th>Contact</th><th>Type</th><th>Orders</th><th>Total Spent</th><th>Action</th></tr></thead>
              <tbody>
                {paginated.map(c => (
                  <tr key={c.id} style={{ background: selectedCustomer?.id === c.id ? '#eff6ff' : '' }}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <div style={{ fontSize: 12 }}>{c.phone}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{c.email}</div>
                    </td>
                    <td><span style={{ background: c.is_contractor ? '#dbeafe' : '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{c.is_contractor ? 'Contractor' : 'Regular'}</span></td>
                    <td>{c.transaction_count || 0}</td>
                    <td style={{ fontWeight: 600 }}>GHS {(c.total_spent || 0).toFixed(2)}</td>
                    <td>
                      <button className="quick-action-btn" style={{ padding: '4px 10px', fontSize: 11, width: 'auto' }} onClick={() => viewHistory(c)}>History</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:8, padding:16, borderTop:'1px solid #f3f4f6' }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={miniInp}>Previous</button>
              <div style={{ display:'flex', alignItems:'center', fontSize:13, fontWeight:600 }}>Page {currentPage} of {totalPages}</div>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={miniInp}>Next</button>
            </div>
          )}
        </div>

        {selectedCustomer && (
          <div className="table-card" style={{ height: 'fit-content' }}>
            <div className="table-card__header">
              <h3 className="table-card__title">Sales History: {selectedCustomer.name}</h3>
              <button className="close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>
            <div className="table-wrapper">
              <table className="stock-table" style={{ fontSize: 12 }}>
                <thead><tr><th>Date</th><th>ID</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>No sales recorded.</td></tr>
                  ) : history.map(h => (
                    <tr key={h.id}>
                      <td>{new Date(h.created_at).toLocaleDateString()}</td>
                      <td className="table-code">#{h.id}</td>
                      <td style={{ fontWeight: 600 }}>GHS {parseFloat(h.total_amount).toFixed(2)}</td>
                      <td><span className={`status-pill status-pill--${h.payment_status === 'PAID' ? 'ok' : 'low'}`} style={{ fontSize: 10 }}>{h.payment_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inp = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 };
const miniInp = { padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, background:'#f9fafb', outline: 'none' };
