import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [items, setItems] = useState([{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: s } = await supabase.from("sales").select("*");
    const { data: p } = await supabase.from("products").select("*");
    const { data: c } = await supabase.from("customers").select("*");
    setSales(s || []);
    setProducts(p || []);
    setCustomers(c || []);
  };

  const total = items.reduce((a, i) => a + (i.quantity * i.unit_price), 0);
  const balance = total - (parseFloat(amountPaid) || 0);

  const addItem = () => setItems([...items, { product_id:'', product_name:'', quantity:1, unit_price:0 }]);

  const updateItem = (idx, field, val) => {
    const newItems = [...items];
    newItems[idx][field] = val;
    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(val));
      if (prod) { newItems[idx].product_name = prod.name; newItems[idx].unit_price = prod.selling_price; }
    }
    setItems(newItems);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleCustomerSelect = (id) => {
    setCustomerId(id);
    const c = customers.find(c => c.id === parseInt(id));
    if (c) setCustomerName(c.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0 || !items[0].product_id) return alert('Add at least one item');
    
    await supabase.from("sales").insert([{
      customer_id: customerId || null,
      customer_name: customerName,
      items: items.filter(i => i.product_id),
      amount_paid: parseFloat(amountPaid) || 0,
      payment_method: paymentMethod,
      notes,
    }]);

    setShowForm(false);
    setItems([{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
    setAmountPaid(''); setPaymentMethod('Cash'); setNotes(''); setCustomerId(''); setCustomerName('Walk-in Customer');
    fetchAll();
  };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 className="section-title">Sales & Orders</h2>
        <button className="quick-action-btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Sale'}</button>
      </div>

      {showForm && (
        <div className="table-card" style={{ marginBottom:24 }}>
          <div className="table-card__header"><h3 className="table-card__title">Record New Sale</h3></div>
          <form onSubmit={handleSubmit} style={{ padding:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
              <div>
                <label style={lbl}>Customer</label>
                <select style={inp} value={customerId} onChange={e => handleCustomerSelect(e.target.value)}>
                  <option value="">Walk-in Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.is_contractor ? '(Contractor)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
              </div>
            </div>

            <h4 style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Line Items</h4>
            <table className="stock-table" style={{ marginBottom:16 }}>
              <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <select style={{...inp, minWidth:200}} value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                        <option value="">Select product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.item_code} — {p.name} ({p.stock_quantity} {p.selling_uom}s)</option>)}
                      </select>
                    </td>
                    <td><input style={{...inp, width:80}} type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value)||0)} /></td>
                    <td><input style={{...inp, width:100}} type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value)||0)} /></td>
                    <td style={{fontWeight:600}}>GHS {(item.quantity * item.unit_price).toFixed(2)}</td>
                    <td><button type="button" onClick={() => removeItem(idx)} style={{background:'#ef4444', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer'}}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addItem} style={{background:'#f3f4f6', border:'1px solid #ddd', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:13, marginBottom:20}}>+ Add Item</button>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, padding:16, background:'#f9fafb', borderRadius:10 }}>
              <div><label style={lbl}>Total</label><p style={{fontSize:22, fontWeight:700}}>GHS {total.toFixed(2)}</p></div>
              <div>
                <label style={lbl}>Amount Paid (GHS)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={inp} type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                  <select style={{...inp, width: 140}} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div><label style={lbl}>Balance Due</label><p style={{fontSize:22, fontWeight:700, color: balance > 0 ? '#ef4444' : '#059669'}}>GHS {balance.toFixed(2)}</p></div>
            </div>

            <button type="submit" className="quick-action-btn" style={{ marginTop:16 }}>Record Sale & Create Journal Entry</button>
          </form>
        </div>
      )}

      <div className="table-card">
        <div className="table-card__header"><h3 className="table-card__title">Transaction History</h3></div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Method</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan="8" style={{textAlign:'center', padding:24}}>No sales recorded.</td></tr>
              ) : sales.map(s => (
                <tr key={s.id}>
                  <td className="table-code">#{s.id}</td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>{s.customer_name}</td>
                  <td style={{fontWeight:600}}>GHS {parseFloat(s.total_amount).toFixed(2)}</td>
                  <td>GHS {parseFloat(s.amount_paid).toFixed(2)}</td>
                  <td><span style={{fontSize:11, background:'#f3f4f6', padding:'2px 6px', borderRadius:4}}>{s.payment_method}</span></td>
                  <td style={{fontWeight:600, color: s.balance_due > 0 ? '#ef4444' : '#059669'}}>GHS {parseFloat(s.balance_due).toFixed(2)}</td>
                  <td><span className={`status-pill status-pill--${s.payment_status === 'PAID' ? 'ok' : 'low'}`}>{s.payment_status}</span></td>
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
