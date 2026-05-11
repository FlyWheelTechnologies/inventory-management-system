import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import ConfirmationModal from "../components/ConfirmationModal";
import "./Dashboard.css";

const playSound = (type) => {
  const audio = new Audio(type === 'success' ? '/sounds/success.mp3' : '/sounds/error.mp3');
  audio.play().catch(() => {}); // Ignore if audio is blocked
};

const InfoTip = ({ text }) => (
  <span className="info-tip" title={text}>ⓘ
    <span className="info-tip__content">{text}</span>
  </span>
);

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  
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

  const handleSubmit = async () => {
    if (items.length === 0 || !items[0].product_id) return setError('Please add at least one product.');
    
    const { error: err } = await supabase.from("sales").insert([{
      customer_id: customerId || null,
      customer_name: customerName,
      items: items.filter(i => i.product_id),
      amount_paid: parseFloat(amountPaid) || 0,
      payment_method: paymentMethod,
      notes,
    }]);

    if (!err) {
      playSound('success');
      setShowForm(false);
      setShowConfirm(false);
      setItems([{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
      setAmountPaid(''); setPaymentMethod('Cash'); setNotes(''); setCustomerId(''); setCustomerName('Walk-in Customer');
      fetchAll();
    } else {
      playSound('error');
      setError(err);
    }
  };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 className="section-title">Sales & Orders</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Record transactions and track Momo/Cash payments</p>
        </div>
        <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Sale'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid #fee2e2' }}>
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <div className="table-card" style={{ marginBottom:24 }}>
          <div className="table-card__header">
            <h3 className="table-card__title">Record New Sale</h3>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Fields marked * are required</span>
          </div>
          <div style={{ padding:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
              <div>
                <label style={lbl}>Customer <InfoTip text="Select 'Walk-in' for quick cash sales or choose a registered customer to track debt." /></label>
                <select style={inp} value={customerId} onChange={e => {
                  setCustomerId(e.target.value);
                  const c = customers.find(c => c.id === parseInt(e.target.value));
                  setCustomerName(c ? c.name : 'Walk-in Customer');
                }}>
                  <option value="">Walk-in Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.is_contractor ? '(Contractor)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Notes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(Optional)</span></label>
                <input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Delivery instructions..." />
              </div>
            </div>

            <h4 style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Line Items <InfoTip text="The individual items being sold in this transaction." /></h4>
            <table className="stock-table" style={{ marginBottom:16 }}>
              <thead><tr><th>Product</th><th>Qty</th><th>Unit Price (GHS)</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <select style={{...inp, minWidth:200}} value={item.product_id} onChange={e => {
                        const newItems = [...items];
                        const val = e.target.value;
                        newItems[idx].product_id = val;
                        const prod = products.find(p => p.id === parseInt(val));
                        if (prod) { newItems[idx].product_name = prod.name; newItems[idx].unit_price = prod.selling_price; }
                        setItems(newItems);
                      }}>
                        <option value="">Select product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.item_code} — {p.name} ({p.stock_quantity} {p.selling_uom}s)</option>)}
                      </select>
                    </td>
                    <td><input style={{...inp, width:80}} type="number" min="1" value={item.quantity} onChange={e => {
                      const newItems = [...items];
                      newItems[idx].quantity = parseFloat(e.target.value)||0;
                      setItems(newItems);
                    }} /></td>
                    <td><input style={{...inp, width:100}} type="number" step="0.01" value={item.unit_price} onChange={e => {
                      const newItems = [...items];
                      newItems[idx].unit_price = parseFloat(e.target.value)||0;
                      setItems(newItems);
                    }} /></td>
                    <td style={{fontWeight:600}}>GHS {(item.quantity * item.unit_price).toFixed(2)}</td>
                    <td><button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{background:'#ef4444', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer'}}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={() => setItems([...items, { product_id:'', product_name:'', quantity:1, unit_price:0 }])} style={{background:'#f3f4f6', border:'1px solid #ddd', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:13, marginBottom:20}}>+ Add Item</button>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, padding:16, background:'#f9fafb', borderRadius:10 }}>
              <div><label style={lbl}>Total Amount</label><p style={{fontSize:22, fontWeight:700}}>GHS {total.toFixed(2)}</p></div>
              <div>
                <label style={lbl}>Amount Paid (GHS) <InfoTip text="How much the customer is paying right now." /></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={inp} type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                  <select style={{...inp, width: 130}} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="Momo">Momo</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Balance Due <InfoTip text="Outstanding amount to be tracked in the Debtors Ledger." /></label>
                <p style={{fontSize:22, fontWeight:700, color: balance > 0 ? '#ef4444' : '#059669'}}>GHS {balance.toFixed(2)}</p>
              </div>
            </div>

            <button type="button" onClick={() => setShowConfirm(true)} className="quick-action-btn" style={{ marginTop:16 }}>
              Finish Sale & Record Payment
            </button>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-card__header"><h3 className="table-card__title">Recent Transactions</h3></div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Method</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan="8" style={{textAlign:'center', padding:24}}>No transactions yet.</td></tr>
              ) : sales.map(s => (
                <tr key={s.id}>
                  <td className="table-code">#{s.id}</td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>{s.customer_name}</td>
                  <td style={{fontWeight:600}}>GHS {parseFloat(s.total_amount).toFixed(2)}</td>
                  <td>GHS {parseFloat(s.amount_paid).toFixed(2)}</td>
                  <td><span style={{fontSize:11, background:'#f3f4f6', padding:'2px 6px', borderRadius:4, fontWeight: 600}}>{s.payment_method}</span></td>
                  <td style={{fontWeight:600, color: s.balance_due > 0 ? '#ef4444' : '#059669'}}>GHS {parseFloat(s.balance_due).toFixed(2)}</td>
                  <td><span className={`status-pill status-pill--${s.payment_status === 'PAID' ? 'ok' : 'low'}`}>{s.payment_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal 
        show={showConfirm}
        title="Confirm Transaction"
        message={`Are you sure you want to record this sale for GHS ${total.toFixed(2)}? This will deduct items from stock and create a journal entry.`}
        confirmText="Yes, Record Sale"
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
        type="primary"
      />

      <style>{`
        .info-tip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px; height: 14px;
          background: #e5e7eb;
          color: #6b7280;
          border-radius: 50%;
          font-size: 10px;
          margin-left: 4px;
          cursor: help;
          position: relative;
        }
        .info-tip__content {
          visibility: hidden;
          width: 180px;
          background-color: #374151;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 8px;
          position: absolute;
          z-index: 10;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.2s;
          font-weight: 400;
          font-size: 11px;
          line-height: 1.4;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .info-tip:hover .info-tip__content {
          visibility: visible;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13 };
