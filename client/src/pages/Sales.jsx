import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import { SyncService } from "../services/SyncService";
import ConfirmationModal from "../components/ConfirmationModal";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
  const sales = useLiveQuery(() => db.sales.reverse().sortBy('created_at'), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [items, setItems] = useState([{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [isDeposit, setIsDeposit] = useState(false);

  const filteredCustomers = customerSearch.length > 1
    ? customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()))
    : [];

  const handleCustomerSelect = (c) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerSearch(c.name);
    setShowCustomerSuggestions(false);
  };

  const handleCustomerInputChange = (e) => {
    const val = e.target.value;
    setCustomerSearch(val);
    setCustomerName(val || 'Walk-in Customer');
    setCustomerId('');
    setShowCustomerSuggestions(true);
  };

  // fetchAll not needed since useLiveQuery handles it automatically

  const generateReceipt = async (sale) => {
    const saleItems = await db.sale_items.where('sale_id').equals(sale.id).toArray();

    const doc = new jsPDF({ format: [80, 150] }); // POS width 80mm
    doc.setFontSize(12);
    doc.text('FlorzyAngel ENT.', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Management System Receipt', 40, 14, { align: 'center' });
    doc.text('------------------------------------------', 40, 18, { align: 'center' });
    
    doc.text(`Receipt #: ${sale.id.slice(0, 8).toUpperCase()}`, 5, 24);
    doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`, 5, 28);
    doc.text(`Customer: ${sale.customer_name}`, 5, 32);
    doc.text(`Attendant: ${sale.attendant_email}`, 5, 36);
    
    doc.autoTable({
      startY: 40,
      margin: { left: 5, right: 5 },
      head: [['Item', 'Qty', 'Price', 'Sub']],
      body: saleItems.map(i => [i.product_name, i.quantity, i.unit_price, i.subtotal]),
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fontStyle: 'bold' }
    });

    const finalY = doc.lastAutoTable.finalY + 5;
    doc.text(`TOTAL: GHS ${parseFloat(sale.total_amount).toFixed(2)}`, 45, finalY);
    doc.text(`PAID: GHS ${parseFloat(sale.amount_paid).toFixed(2)}`, 45, finalY + 4);
    doc.text(`BAL: GHS ${parseFloat(sale.balance_due).toFixed(2)}`, 45, finalY + 8);
    
    doc.text('------------------------------------------', 40, finalY + 14, { align: 'center' });
    doc.text('Thank you for your business!', 40, finalY + 18, { align: 'center' });
    
    doc.save(`Receipt_${sale.id}.pdf`);
  };

  const total = items.reduce((a, i) => a + (i.quantity * i.unit_price), 0);
  const balance = total - (parseFloat(amountPaid) || 0);

  const handleSubmit = async () => {
    if (items.length === 0 || !items[0].product_id) return setError('Please add at least one product.');
    
    setError('');
    const userEmail = JSON.parse(localStorage.getItem("user"))?.email || 'System';

    try {
      // Auto-add new customer if a name was typed that doesn't exist yet
      let resolvedCustomerId = customerId ? parseInt(customerId) : null;
      const isNewCustomer = customerName && customerName !== 'Walk-in Customer' && !customerId;
      if (isNewCustomer) {
        resolvedCustomerId = await db.customers.add({
          name: customerName,
          phone: '',
          email: '',
          is_contractor: 0,
          created_at: new Date().toISOString(),
          supabase_id: crypto.randomUUID(),
          sync_status: 'pending'
        });
        // Queue sync to Supabase
        await SyncService.queueMutation('customers', 'INSERT', { name: customerName, phone: '', email: '', is_contractor: false, created_at: new Date().toISOString() });
      }

      const validItems = items.filter(i => i.product_id).map(i => {
        const prod = products.find(p => p.id === parseInt(i.product_id));
        return {
          product_id: parseInt(i.product_id),
          supabase_product_id: prod?.supabase_id,
          product_name: i.product_name,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
          subtotal: parseFloat(i.quantity) * parseFloat(i.unit_price)
        };
      });

      const payloadAmountPaid = parseFloat(amountPaid) || 0;
      // Deposit: customer pays in advance — status is DEPOSIT regardless of balance
      // Normal: PAID if balance<=0, PARTIAL if some paid, else unpaid
      const status = isDeposit ? 'DEPOSIT' : (balance <= 0 ? 'PAID' : payloadAmountPaid > 0 ? 'PARTIAL' : 'UNPAID');
      const created_at = new Date().toISOString();
      const supabase_id = crypto.randomUUID();

      // Offline updates to Dexie
      await db.transaction('rw', db.sales, db.sale_items, db.products, db.journal_entries, async () => {
        const saleId = await db.sales.add({
          customer_id: resolvedCustomerId,
          customer_name: customerName,
          attendant_email: userEmail,
          total_amount: total,
          amount_paid: payloadAmountPaid,
          balance_due: balance,
          payment_status: status,
          payment_method: paymentMethod,
          notes: notes,
          created_at,
          supabase_id,
          sync_status: 'synced' // We will queue the RPC instead, so local records don't need independent sync
        });

        for (const item of validItems) {
          await db.sale_items.add({
            sale_id: saleId,
            ...item,
            supabase_id: crypto.randomUUID(),
            sync_status: 'synced'
          });
          const product = await db.products.get(item.product_id);
          if (product) {
            await db.products.update(product.id, { stock_quantity: product.stock_quantity - item.quantity });
          }
        }
        
        // ── Journal Entries (Double-Entry Accounting) ───────────────
        if (isDeposit) {
          // DEPOSIT accounting:
          // DR Cash/Momo (money received)
          // CR Customer Deposits (liability — we owe the customer the goods)
          if (payloadAmountPaid > 0) {
            await db.journal_entries.add({ sale_id: saleId, account_type: paymentMethod.toUpperCase(), debit: payloadAmountPaid, credit: 0, description: `Deposit received from ${customerName}`, created_at, supabase_id: crypto.randomUUID(), sync_status: 'synced' });
            await db.journal_entries.add({ sale_id: saleId, account_type: 'CUSTOMER_DEPOSITS', debit: 0, credit: payloadAmountPaid, description: `Advance deposit — Order pending fulfillment`, created_at, supabase_id: crypto.randomUUID(), sync_status: 'synced' });
          }
        } else {
          // NORMAL SALE accounting:
          // DR Cash (amount paid) → CR Revenue
          // DR Accounts Receivable (balance owed) → CR Revenue
          if (payloadAmountPaid > 0) {
            await db.journal_entries.add({ sale_id: saleId, account_type: paymentMethod.toUpperCase(), debit: payloadAmountPaid, credit: 0, description: `${paymentMethod} received`, created_at, supabase_id: crypto.randomUUID(), sync_status: 'synced' });
          }
          await db.journal_entries.add({ sale_id: saleId, account_type: 'REVENUE', debit: 0, credit: total, description: `Revenue from sale`, created_at, supabase_id: crypto.randomUUID(), sync_status: 'synced' });
        }
      });

      // Queue RPC for Supabase
      await db.sync_queue.add({
        table: 'record_sale_transaction', // used as RPC name
        operation: 'RPC',
        payload: {
          p_customer_id: resolvedCustomerId,
          p_customer_name: customerName,
          p_total_amount: total,
          p_amount_paid: payloadAmountPaid,
          p_payment_method: paymentMethod,
          p_payment_status: status,
          p_items: validItems.map(i => ({
            product_id: i.supabase_product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.subtotal
          })),
          p_recorded_by: userEmail
        },
        created_at
      });
      if (navigator.onLine) SyncService.syncQueueToSupabase();

      playSound('success');
      setShowForm(false);
      setShowConfirm(false);
      setItems([{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
      setAmountPaid(''); setPaymentMethod('Cash'); setNotes('');
      setCustomerId(''); setCustomerName('Walk-in Customer'); setCustomerSearch('');
      setIsDeposit(false);
    } catch (err) {
      playSound('error');
      setError(err.message || 'Failed to record sale');
    }
  };

  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = sales
    .filter(s => s.customer_name?.toLowerCase().includes(search.toLowerCase()))
    .filter(s => statusFilter === 'All' || s.payment_status === statusFilter)
    .filter(s => !dateFilter || new Date(s.created_at).toDateString() === new Date(dateFilter).toDateString())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
              <div style={{ position: 'relative' }}>
                <label style={lbl}>Customer <InfoTip text="Type to search or add a new customer. Leave blank for Walk-in." /></label>
                <input
                  style={inp}
                  value={customerSearch}
                  onChange={handleCustomerInputChange}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
                  placeholder="Walk-in Customer (type to search/add)"
                />
                {showCustomerSuggestions && filteredCustomers.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #ddd', borderRadius:6, zIndex:100, maxHeight:160, overflowY:'auto', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
                    {filteredCustomers.map(c => (
                      <div key={c.id} onMouseDown={() => handleCustomerSelect(c)}
                        style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f3f4f6' }}
                        onMouseEnter={e => e.target.style.background='#f9fafb'}
                        onMouseLeave={e => e.target.style.background='#fff'}
                      >
                        {c.name} {c.is_contractor ? <span style={{fontSize:11, color:'#6b7280'}}>(Contractor)</span> : ''}
                      </div>
                    ))}
                  </div>
                )}
                {customerSearch && !customerId && (
                  <p style={{ fontSize:11, color:'#059669', marginTop:4 }}>✨ New customer "{customerSearch}" will be added automatically</p>
                )}
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

            {/* Deposit Toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'12px 0', padding:'12px 16px', background: isDeposit ? '#ecfdf5' : '#eff6ff', borderRadius:10, border: `1.5px solid ${isDeposit ? '#10b981' : '#3b82f6'}` }}>
              <button
                type="button"
                onClick={() => setIsDeposit(!isDeposit)}
                style={{ background: isDeposit ? '#10b981' : '#3b82f6', color:'#fff', border:'none', borderRadius:20, padding:'6px 18px', fontWeight:700, cursor:'pointer', fontSize:13, transition:'all 0.2s' }}
              >
                {isDeposit ? '✓ Marked as Deposit' : '📥 Mark as Deposit'}
              </button>
              <span style={{ fontSize:12, color: isDeposit ? '#065f46' : '#1e40af' }}>
                {isDeposit
                  ? 'Payment held as advance deposit. Revenue recorded when order is fulfilled.'
                  : 'Toggle this if the customer is paying in advance for a future order.'}
              </span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, padding:16, background:'#f9fafb', borderRadius:10 }}>
              <div><label style={lbl}>Total Amount</label><p style={{fontSize:22, fontWeight:700}}>GHS {total.toFixed(2)}</p></div>
              <div>
                <label style={lbl}>{isDeposit ? 'Deposit Amount (GHS)' : 'Amount Paid (GHS)'} <InfoTip text={isDeposit ? 'How much the customer is depositing in advance.' : 'How much the customer is paying right now.'} /></label>
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
                <label style={lbl}>{isDeposit ? 'Balance to Collect on Delivery' : 'Balance Due'}</label>
                <p style={{fontSize:22, fontWeight:700, color: balance > 0 ? (isDeposit ? '#f59e0b' : '#ef4444') : '#059669'}}>GHS {balance.toFixed(2)}</p>
              </div>
            </div>

            <button type="button" onClick={() => setShowConfirm(true)} className="quick-action-btn" style={{ marginTop:16, background: isDeposit ? '#10b981' : undefined }}>
              {isDeposit ? '📥 Record Deposit' : 'Finish Sale & Record Payment'}
            </button>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-card__header">
          <h3 className="table-card__title">Recent Transactions</h3>
          <div className="table-card__actions">
            <input type="date" style={miniInp} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            <select style={miniInp} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="UNPAID">Unpaid</option>
            </select>
            <input type="search" className="table-search" placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrapper">
          <table className="stock-table">
            <thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Bal</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="8" style={{textAlign:'center', padding:24}}>No transactions found.</td></tr>
              ) : paginated.map(s => (
                <tr key={s.id}>
                  <td className="table-code">#{s.id}</td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>{s.customer_name}</td>
                  <td style={{fontWeight:600}}>GHS {parseFloat(s.total_amount).toFixed(2)}</td>
                  <td>GHS {parseFloat(s.amount_paid).toFixed(2)}</td>
                  <td style={{fontWeight:600, color: s.balance_due > 0 ? '#ef4444' : '#059669'}}>GHS {parseFloat(s.balance_due).toFixed(2)}</td>
                  <td><span className={`status-pill status-pill--${s.payment_status === 'PAID' ? 'ok' : 'low'}`}>{s.payment_status}</span></td>
                  <td>
                    <button onClick={() => generateReceipt(s)} style={{background:'none', border:'none', cursor:'pointer', fontSize:16}} title="Download Receipt">📄</button>
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

      <ConfirmationModal 
        show={showConfirm}
        title="Confirm Transaction"
        message={`Are you sure you want to record this sale for GHS ${total.toFixed(2)}? This will deduct items from stock and create a journal entry.`}
        confirmText="Yes, Record Sale"
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
        type="primary"
      />
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13 };
const miniInp = { padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, background:'#f9fafb', outline: 'none' };
