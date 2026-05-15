import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";
import ConfirmationModal from "../components/ConfirmationModal";
import ProductForm from "../components/Products/ProductForm";
import ProductTable from "../components/Products/ProductTable";
import { ProductsService } from "../services/ProductsService";

export default function Products() {
  const { user } = useAuth();
  const location = useLocation();
  const isAuditor = user?.role === 'auditor';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Filtering & Sorting
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [itemsToShow, setItemsToShow] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Form State
  const initialForm = {
    name: "",
    category: "General",
    cost_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    selling_uom: "Bag",
    low_stock_threshold: 10,
    item_code: ""
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (location.state?.showForm) {
      setShowForm(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const [form, setForm] = useState({...emptyForm});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const isAuditor = user?.role === 'storekeeper';

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const data = await ProductsService.fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const productToSave = { ...formData };
      if (editingId) productToSave.id = editingId;

      await ProductsService.saveProduct(productToSave, user.email);
      
      setToast({ message: editingId ? "Product updated!" : "Product created!", type: "success" });
      setShowForm(false);
      setEditingId(null);
      setFormData(initialForm);
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || "Failed to save product", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await ProductsService.deleteProduct(productToDelete.id, productToDelete.name, user.email);
      setToast({ message: "Product deleted", type: "success" });
      setShowConfirm(false);
      setProductToDelete(null);
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      category: p.category,
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      stock_quantity: p.stock_quantity,
      selling_uom: p.selling_uom,
      low_stock_threshold: p.low_stock_threshold,
      item_code: p.item_code || ""
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split("\n").slice(1);
      const productsToInsert = [];
      for (const line of lines) {
        const [,name,category,buying_uom,selling_uom,conversion_factor,cost_price,selling_price,stock_quantity] = line.split(",");
        if (!name) continue;
        productsToInsert.push({
          name,category,buying_uom,selling_uom,
          conversion_factor: parseFloat(conversion_factor),
          cost_price: parseFloat(cost_price),
          selling_price: parseFloat(selling_price),
          stock_quantity: parseFloat(stock_quantity),
          created_at: new Date().toISOString()
        });
      }

      if (productsToInsert.length > 0) {
        const { error } = await supabase.from('products').insert(productsToInsert);
        if (error) {
          console.error("Bulk import error:", error);
          alert(`Import failed: ${error.message}`);
        } else {
          fetchProducts();
          alert(`Imported ${productsToInsert.length} products`);
        }
      }
    };
    reader.readAsText(file);
  };

    if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "newest") result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === "margin") result.sort((a, b) => ((b.selling_price - b.cost_price)/b.selling_price) - ((a.selling_price - a.cost_price)/a.selling_price));
    if (sortBy === "stock_low") result.sort((a, b) => a.stock_quantity - b.stock_quantity);
    if (sortBy === "stock_high") result.sort((a, b) => b.stock_quantity - a.stock_quantity);
    if (sortBy === "price_high") result.sort((a, b) => b.selling_price - a.selling_price);
    if (sortBy === "price_low") result.sort((a, b) => a.selling_price - b.selling_price);

    return result;
  }, [products, search, categoryFilter, sortBy]);

  const paginated = filtered.slice(0, itemsToShow);

  if (loading) return <div className="p-6 skeleton-container"><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div className="products-container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 className="section-title">Inventory Management</h2>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Manage products, stock levels, and pricing</p>
        </div>
        {!isAuditor && (
          <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData(initialForm); }}>
            {showForm ? 'Close Form' : '+ Add New Product'}
          </button>
        )}
      </div>

      <ProductForm
        show={showForm}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditingId(null); setFormData(initialForm); }}
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

      <ProductTable
        products={paginated}
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onEdit={startEdit}
        onDelete={(p) => { setProductToDelete(p); setShowConfirm(true); }}
        isAuditor={isAuditor}
        userRole={user?.role}
        itemsToShow={itemsToShow}
        setItemsToShow={setItemsToShow}
        setCurrentPage={setCurrentPage}
      />

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
