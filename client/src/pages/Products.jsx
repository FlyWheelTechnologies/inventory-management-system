import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
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
  const [products, setProducts] = useState([]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);
  const [form, setForm] = useState({...emptyForm});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null); // { message, type }

  // --- Draft Persistence ---
  useEffect(() => {
    const savedDraft = localStorage.getItem("product_draft");
    if (savedDraft && !editingId) {
      try {
        const draft = JSON.parse(savedDraft);
        setForm(f => ({ ...f, ...draft }));
        setShowForm(true);
      } catch (e) { console.error("Product draft load error", e); }
    }
  }, [editingId]);

  useEffect(() => {
    if (showForm && !editingId) {
      localStorage.setItem("product_draft", JSON.stringify(form));
    }
  }, [form, showForm, editingId]);

  const clearDraft = () => {
    localStorage.removeItem("product_draft");
    setForm({...emptyForm});
    setEditingId(null);
  };

  const handleCategoryChange = (cat) => {
    // Only update category — UOM fields are typed freely by the user
    setForm(f => ({ ...f, category: cat }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const payload = {
      ...form,
      cost_price: parseFloat(form.cost_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      stock_quantity: parseFloat(form.stock_quantity) || 0,
      conversion_factor: parseFloat(form.conversion_factor) || 1,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
      updated_at: new Date().toISOString()
    };
    
    try {
      if (editingId) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        payload.created_at = new Date().toISOString();
        const { error: err } = await supabase.from('products').insert([payload]);
        if (err) throw err;
      }
      
      clearDraft();
      setShowForm(false);
      fetchProducts();
      setError('');
      setToast({ message: editingId ? "Product updated!" : "Product created!", type: "success" });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error("Product save error:", err);
      setError(`Failed to save product: ${err.message || "Please check your network"}. Draft still held.`);
    } finally {
      setSaving(false);
    }
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
      await supabase.from('products').delete().eq('id', productToDelete.id);
      setShowConfirm(false);
      setProductToDelete(null);
      fetchProducts();
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
        await supabase.from('products').insert([{
          name,category,buying_uom,selling_uom,
          conversion_factor: parseFloat(conversion_factor),
          cost_price: parseFloat(cost_price),
          selling_price: parseFloat(selling_price),
          stock_quantity: parseFloat(stock_quantity),
          created_at: new Date().toISOString()
        }]);
        count++;
      }
      fetchProducts();
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

      {error && (
        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={handleSubmit} 
            disabled={saving}
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
          >
            {saving ? 'Retrying...' : 'Retry Now'}
          </button>
        </div>
      )}

      {showForm && (
        <div className="table-card" style={{ marginBottom:24 }}>
          <div className="table-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="table-card__title">{editingId ? 'Edit Product' : 'New Product'}</h3>
            {!editingId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Draft Auto-saved</span>
                <button 
                  onClick={clearDraft}
                  style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear Form
                </button>
              </div>
            )}
          </div>
          <div style={{ padding:0 }}>
            {/* SECTION 1: BASIC INFO */}
            <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6' }}>
              <h4 style={secH}>01. Basic Information</h4>
              <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:20 }}>
                <div>
                  <label style={lbl}>Product Name *</label>
                  <input style={inp} value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))} required list="existing-products" />
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
              </div>
            </div>

            {/* SECTION 2: PRICING & UNITS */}
            <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6' }}>
              <h4 style={secH}>02. Pricing & Units</h4>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20 }}>
                <div>
                  <label style={lbl}>Cost Price (GHS) *</label>
                  <input style={inp} type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f=>({...f, cost_price:e.target.value}))} required />
                </div>
                <div>
                  <label style={lbl}>Selling Price (GHS) *</label>
                  <input style={{...inp, fontWeight:700, color:'#059669', border:'1px solid #10b981'}} type="number" step="0.01" value={form.selling_price} onChange={e => setForm(f=>({...f, selling_price:e.target.value}))} required />
                </div>
                <div>
                  <label style={lbl}>UOM (e.g. Bag, Pcs)</label>
                  <input style={inp} value={form.selling_uom} onChange={e => setForm(f=>({...f, selling_uom:e.target.value}))} />
                </div>
              </div>
            </div>

            {/* SECTION 3: STOCK CONTROL */}
            <div style={{ padding: 20 }}>
              <h4 style={secH}>03. Stock Inventory</h4>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20 }}>
                <div>
                  <label style={lbl}>Current Stock Qty *</label>
                  <input style={{...inp, fontWeight:700}} type="number" value={form.stock_quantity} onChange={e => setForm(f=>({...f, stock_quantity:e.target.value}))} required />
                </div>
                <div>
                  <label style={lbl}>Low Stock Alert Level</label>
                  <input style={{...inp, border: '1px solid #fca5a5'}} type="number" value={form.low_stock_threshold} onChange={e => setForm(f=>({...f, low_stock_threshold:e.target.value}))} required />
                </div>
                <div style={{ alignSelf: 'end' }}>
                  <button type="submit" className="quick-action-btn" style={{ width: '100%', height: 38 }} disabled={saving}>
                    {saving ? 'Saving...' : (editingId ? 'Update Product' : 'Create Product')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Success Toast */}
      {toast && (
        <div style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', background:'#064e3b', color:'#fff', padding:'12px 24px', borderRadius:'12px', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.2)', zIndex:2000, display:'flex', alignItems:'center', gap:10, animation:'slideDown 0.3s ease' }}>
          <span style={{fontSize:18}}>✅</span>
          <span style={{fontWeight:600}}>{toast.message}</span>
          <style>{`
            @keyframes slideDown { 
              from { transform: translateX(-50%) translateY(-50px); opacity: 0; }
              to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      <div className="table-card">
        <div className="table-card__header">
          <h3 className="table-card__title">Current Stock</h3>
          <div className="table-card__actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <select style={{ ...miniInp, paddingLeft: 30 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="All">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </div>
            
            <div style={{ position: 'relative' }}>
              <select style={{ ...miniInp, paddingLeft: 30 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="name">Sort by Name</option>
                <option value="stock_low">Low Stock First</option>
                <option value="stock_high">High Stock First</option>
                <option value="price_high">Price: High to Low</option>
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <path d="M15 18H3M21 12H3M21 6H3"/>
              </svg>
            </div>

            <div style={{ position: 'relative' }}>
              <input 
                type="search" 
                className="table-search" 
                placeholder="Search..." 
                value={search} 
                onChange={e => {setSearch(e.target.value); setCurrentPage(1);}} 
                style={{ paddingLeft: 34, height: 32 }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="3" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
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
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          onClick={() => startEdit(p)} 
                          style={{ ...actionBtn, color: '#6b7280' }} 
                          onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                          onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                          title="Edit Product"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {user?.role === 'admin' && (
                          <button 
                            onClick={() => confirmDelete(p)} 
                            style={{ ...actionBtn, color: '#6b7280' }} 
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                            title="Delete Product"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
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
        show={showConfirm}
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
const secH = { fontSize:13, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1px', marginBottom:16 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13, outline: 'none' };
const miniInp = { padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, background:'#f9fafb', outline: 'none' };
const actionBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' };
