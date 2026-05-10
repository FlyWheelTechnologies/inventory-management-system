import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
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

const emptyForm = { name:'', category:'General', buying_uom:'Piece', selling_uom:'Piece', conversion_factor:1, cost_price:'', selling_price:'', stock_quantity:'' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({...emptyForm});
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  const handleCategoryChange = (cat) => {
    const preset = UOM_PRESETS[cat] || UOM_PRESETS['General'];
    setForm(f => ({ ...f, category: cat, buying_uom: preset.buying, selling_uom: preset.selling, conversion_factor: preset.factor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await supabase.from("products").insert([form]);
    setForm({...emptyForm});
    setShowForm(false);
    fetchProducts();
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
        await supabase.from("products").insert([{name,category,buying_uom,selling_uom,conversion_factor,cost_price,selling_price,stock_quantity}]);
        count++;
      }
      fetchProducts();
      alert(`Imported ${count} products`);
    };
    reader.readAsText(file);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.item_code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 className="section-title">Product Inventory ({products.length} items)</h2>
        <div style={{ display:'flex', gap:10 }}>
          <button className="quick-action-btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Product'}</button>
          <button className="quick-action-btn" style={{background:'#374151'}} onClick={handleExport}>Export CSV</button>
          <label className="quick-action-btn" style={{background:'#059669', cursor:'pointer'}}>
            Import CSV <input type="file" accept=".csv" style={{display:'none'}} onChange={handleImport} />
          </label>
        </div>
      </div>

      {showForm && (
        <div className="table-card" style={{ marginBottom:24 }}>
          <div className="table-card__header"><h3 className="table-card__title">New Product</h3></div>
          <form onSubmit={handleSubmit} style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
            <div><label style={lbl}>Product Name *</label><input style={inp} value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))} required /></div>
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
            <button type="submit" className="quick-action-btn" style={{marginTop:'auto', height:38}}>Save Product</button>
          </form>
        </div>
      )}

      <div className="table-card">
        <div className="table-card__header">
          <h3 className="table-card__title">Current Stock</h3>
          <input type="search" className="table-search" placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr>
              <th>Code</th><th>Name</th><th>Category</th><th>Stock</th><th>Buy UOM</th><th>Sell UOM</th><th>Conv.</th><th>Cost</th><th>Price</th><th>Margin</th><th>Status</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="11" style={{textAlign:'center', padding:24}}>No products found.</td></tr>
              ) : filtered.map(p => {
                const margin = p.selling_price > 0 && p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100).toFixed(1) : '—';
                return (
                  <tr key={p.id}>
                    <td className="table-code">{p.item_code}</td>
                    <td style={{fontWeight:500}}>{p.name}</td>
                    <td><span style={{background:'#f3f4f6', padding:'2px 8px', borderRadius:4, fontSize:12}}>{p.category}</span></td>
                    <td style={{fontWeight:600}}>{p.stock_quantity} {p.selling_uom}s</td>
                    <td>{p.buying_uom}</td>
                    <td>{p.selling_uom}</td>
                    <td>1:{p.conversion_factor}</td>
                    <td>GHS {parseFloat(p.cost_price||0).toFixed(2)}</td>
                    <td style={{fontWeight:600}}>GHS {parseFloat(p.selling_price||0).toFixed(2)}</td>
                    <td><span style={{color: parseFloat(margin) > 20 ? '#059669' : '#f59e0b', fontWeight:600}}>{margin}%</span></td>
                    <td><span className={`status-pill status-pill--${p.stock_quantity < p.low_stock_threshold ? 'low' : 'ok'}`}>{p.stock_quantity < p.low_stock_threshold ? 'Low' : 'OK'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13 };
