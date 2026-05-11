import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import { SyncService } from "../services/SyncService";
import { useAuth } from "../context/AuthContext";
import ConfirmationModal from "../components/ConfirmationModal";
import "./Dashboard.css";

const CATEGORIES = ['Building Materials', 'Plumbing', 'Electrical', 'Roofing', 'Paint', 'General'];
const UOM_PRESETS = {
  'Building Materials': { buying: 'Pallet', selling: 'Bag', factor: 40 },
  'Plumbing': { buying: 'Bundle', selling: 'Piece', factor: 10 },
  'Electrical': { buying: 'Roll', selling: 'Meter', factor: 100 },
  'Roofing': { buying: 'Pack', selling: 'Sheet', factor: 20 },
  'Paint': { buying: 'Carton', selling: 'Gallon', factor: 4 },
  'General': { buying: 'Carton', selling: 'Piece', factor: 1 },
};

const emptyForm = { name:'', category:'General', buying_uom:'Piece', selling_uom:'Piece', conversion_factor:1, cost_price:'', selling_price:'', stock_quantity:'', low_stock_threshold: 10 };

export default function Products() {
  const { user } = useAuth();
  const isAuditor = user?.role === 'auditor';
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [form, setForm] = useState({...emptyForm});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  const handleCategoryChange = (cat) => {
    const preset = UOM_PRESETS[cat] || UOM_PRESETS['General'];
    setForm(f => ({ ...f, category: cat, buying_uom: preset.buying, selling_uom: preset.selling, conversion_factor: preset.factor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      updated_at: new Date().toISOString()
    };
    
    if (editingId) {
      // Find the local item to get supabase_id if we want to sync updates properly
      // For now, assume SyncService handles UPDATE correctly if we implement it.
      // Since SyncService only has INSERT, we will just use db update for offline:
      await db.products.update(editingId, payload);
      await SyncService.queueMutation("products", "UPDATE", { ...payload, id: editingId });
      setEditingId(null);
    } else {
      payload.created_at = new Date().toISOString();
      await SyncService.queueMutation("products", "INSERT", payload);
    }
    setForm({...emptyForm});
    setShowForm(false);
  };

  const startEdit = (p) => {
    setForm({ ...p });
    setEditingId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = (p) => {
    setProductToDelete(p);
    setShowConfirm(true);
  };

  const handleDelete = async () => {
    if (productToDelete) {
      await db.products.delete(productToDelete.id);
      await SyncService.queueMutation("products", "DELETE", { supabase_id: productToDelete.supabase_id });
      setShowConfirm(false);
      setProductToDelete(null);
    }
  };

  const handleExport = () => {
    const csv = "Item Code,Name,Category,Buy UOM,Sell UOM,Conv Factor,Cost,Price,Stock\n"
      + products.map(p => `${p.item_code},${p.name},${p.category},${p.buying_uom},${p.selling_uom},${p.conversion_factor},${p.cost_price},${p.selling_price},${p.stock_quantity}`).join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = "florzy_products.csv";
    link.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split("\n").slice(1);
      let count = 0;
      for (const line of lines) {
        const [,name,category,buying_uom,selling_uom,conversion_factor,cost_price,selling_price,stock_quantity] = line.split(",");
        if (!name) continue;
        await SyncService.queueMutation("products", "INSERT", {
          name,category,buying_uom,selling_uom,
          conversion_factor: parseFloat(conversion_factor),
          cost_price: parseFloat(cost_price),
          selling_price: parseFloat(selling_price),
          stock_quantity: parseFloat(stock_quantity),
          created_at: new Date().toISOString()
        });
        count++;
      }
      alert(`Imported ${count} products`);
    };
    reader.readAsText(file);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.item_code?.toLowerCase().includes(search.toLowerCase()))
    .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
    .sort((a, b) => {
      if (sortBy === 'stock_low') return a.stock_quantity - b.stock_quantity;
      if (sortBy === 'stock_high') return b.stock_quantity - a.stock_quantity;
      if (sortBy === 'price_high') return b.selling_price - a.selling_price;
      return a.name.localeCompare(b.name);
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 className="section-title">Product Inventory ({products.length} items)</h2>
        <div style={{ display:'flex', gap:10 }}>
          <button className="quick-action-btn" onClick={() => { setShowForm(!showForm); if(showForm) {setForm({...emptyForm}); setEditingId(null);} }}>
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
          <button className="quick-action-btn" style={{background:'#374151'}} onClick={handleExport}>Export CSV</button>
          <label className="quick-action-btn" style={{background:'#059669', cursor:'pointer'}}>
            Import CSV <input type="file" accept=".csv" style={{display:'none'}} onChange={handleImport} />
          </label>
        </div>
      </div>

      {showForm && (
        <div className="table-card" style={{ marginBottom:24 }}>
          <div className="table-card__header"><h3 className="table-card__title">{editingId ? 'Edit Product' : 'New Product'}</h3></div>
          <form onSubmit={handleSubmit} style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
            <div>
              <label style={lbl}>Product Name *</label>
              <input 
                style={inp} 
                value={form.name} 
                onChange={e => setForm(f=>({...f, name:e.target.value}))} 
                required 
                list="existing-products"
              />
              <datalist id="existing-products">
                {products.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            <div>
              <label style={lbl}>Category</label>
              <select style={inp} value={form.category} onChange={e => handleCategoryChange(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Buying UOM</label><input style={inp} value={form.buying_uom} onChange={e => setForm(f=>({...f, buying_uom:e.target.value}))} /></div>
            <div><label style={lbl}>Selling UOM</label><input style={inp} value={form.selling_uom} onChange={e => setForm(f=>({...f, selling_uom:e.target.value}))} /></div>
            <div><label style={lbl}>Conversion (1 {form.buying_uom} = ? {form.selling_uom})</label><input style={inp} type="number" value={form.conversion_factor} onChange={e => setForm(f=>({...f, conversion_factor:e.target.value}))} /></div>
            <div><label style={lbl}>Cost Price (GHS)</label><input style={inp} type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f=>({...f, cost_price:e.target.value}))} required /></div>
            <div><label style={lbl}>Selling Price (GHS)</label><input style={inp} type="number" step="0.01" value={form.selling_price} onChange={e => setForm(f=>({...f, selling_price:e.target.value}))} required /></div>
            <div><label style={lbl}>Stock Qty ({form.selling_uom}s)</label><input style={inp} type="number" value={form.stock_quantity} onChange={e => setForm(f=>({...f, stock_quantity:e.target.value}))} required /></div>
            <div><label style={lbl}>Low Stock Alert Level</label><input style={inp} type="number" value={form.low_stock_threshold} onChange={e => setForm(f=>({...f, low_stock_threshold:e.target.value}))} required /></div>
            <button type="submit" className="quick-action-btn" style={{marginTop:'auto', height:38}}>{editingId ? 'Update Product' : 'Save Product'}</button>
          </form>
        </div>
      )}

      <div className="table-card">
        <div className="table-card__header">
          <h3 className="table-card__title">Current Stock</h3>
          <div className="table-card__actions">
            <select style={miniInp} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select style={miniInp} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Sort by Name</option>
              <option value="stock_low">Low Stock First</option>
              <option value="stock_high">High Stock First</option>
              <option value="price_high">Price: High to Low</option>
            </select>
            <input type="search" className="table-search" placeholder="Search..." value={search} onChange={e => {setSearch(e.target.value); setCurrentPage(1);}} />
          </div>
        </div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr>
              <th>Code</th><th>Name</th><th>Category</th><th>Stock</th><th>Buy UOM</th><th>Sell UOM</th><th>Cost</th><th>Price</th><th>Status</th>{!isAuditor && <th>Actions</th>}
            </tr></thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={isAuditor ? "9" : "10"} style={{textAlign:'center', padding:24}}>No products found.</td></tr>
              ) : paginated.map(p => (
                <tr key={p.id}>
                  <td className="table-code">{p.item_code}</td>
                  <td style={{fontWeight:500}}>{p.name}</td>
                  <td><span style={{background:'#f3f4f6', padding:'2px 8px', borderRadius:4, fontSize:12}}>{p.category}</span></td>
                  <td style={{fontWeight:600}}>{p.stock_quantity} {p.selling_uom}s</td>
                  <td>{p.buying_uom}</td>
                  <td>{p.selling_uom}</td>
                  <td>GHS {parseFloat(p.cost_price||0).toFixed(2)}</td>
                  <td style={{fontWeight:600}}>GHS {parseFloat(p.selling_price||0).toFixed(2)}</td>
                  <td><span className={`status-pill status-pill--${p.stock_quantity < (p.low_stock_threshold || 10) ? 'low' : 'ok'}`}>{p.stock_quantity < (p.low_stock_threshold || 10) ? 'Low' : 'OK'}</span></td>
                  {!isAuditor && (
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => startEdit(p)} style={actionBtn} title="Edit Product">✏️</button>
                        {user?.role === 'admin' && (
                          <button onClick={() => confirmDelete(p)} style={{ ...actionBtn, color: '#ef4444' }} title="Delete Product">🗑️</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, padding:16, borderTop:'1px solid #f3f4f6' }}>
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ ...miniInp, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <div style={{ display:'flex', alignItems:'center', fontSize:13, fontWeight:600 }}>
              Page {currentPage} of {totalPages}
            </div>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)}
              style={{ ...miniInp, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        type="danger"
      />
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13 };
const miniInp = { padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, background:'#f9fafb', outline: 'none' };
const actionBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' };
