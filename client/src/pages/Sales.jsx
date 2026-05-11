import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import ConfirmationModal from "../components/ConfirmationModal";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import "./Dashboard.css";

const playSound = (type) => {
  // Sounds currently disabled as files are missing
  // const audio = new Audio(type === 'success' ? '/sounds/success.mp3' : '/sounds/error.mp3');
  // audio.play().catch(() => {});
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

  const fetchData = async () => {
    const [salesRes, productsRes, customersRes] = await Promise.all([
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('customers').select('*')
    ]);
    if (salesRes.data) setSales(salesRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  
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

  const generateReceipt = async (sale) => {
    const { data: saleItems } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);

    const doc = new jsPDF({ format: [80, 150] }); // POS width 80mm
    
    // Header
    doc.setFontSize(14);
    doc.setTextColor(55, 65, 81); // Charcoal
    doc.setFont(undefined, 'bold');
    doc.text('FlorzyAngel Enterprise', 40, 10, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(249, 115, 22); // Orange
    doc.text('Inventory Management System', 40, 15, { align: 'center' });
    
    doc.setDrawColor(249, 115, 22); // Orange Line
    doc.line(5, 18, 75, 18);
    
    // Transaction Details
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');
    doc.text(`INVOICE: #INV-${String(sale.invoice_no || sale.id).slice(-6).padStart(3, '0')}`, 5, 24);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`, 5, 28);
    doc.text(`Customer: ${sale.customer_name}`, 5, 32);
    doc.text(`Recorded By: ${sale.recorded_by || 'Staff'}`, 5, 36);
    
    autoTable(doc, {
      startY: 40,
      margin: { left: 5, right: 5 },
      head: [['ITEM', 'QTY', 'PRICE', 'TOTAL']],
      body: saleItems.map(i => [i.product_name, i.quantity, i.unit_price.toFixed(2), i.subtotal.toFixed(2)]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' }, // Charcoal Header
      columnStyles: { 3: { halign: 'right' } }
    });

    const finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(`GRAND TOTAL:`, 35, finalY);
    doc.text(`GHS ${parseFloat(sale.total_amount).toFixed(2)}`, 75, finalY, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Amount Paid:`, 35, finalY + 5);
    doc.text(`GHS ${parseFloat(sale.amount_paid).toFixed(2)}`, 75, finalY + 5, { align: 'right' });
    
    doc.text(`Balance Due:`, 35, finalY + 9);
    doc.setTextColor(sale.balance_due > 0 ? 249 : 5, sale.balance_due > 0 ? 115 : 150, sale.balance_due > 0 ? 22 : 105);
    doc.text(`GHS ${parseFloat(sale.balance_due).toFixed(2)}`, 75, finalY + 9, { align: 'right' });
    
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.text('Powered by bookflywheel.com', 40, finalY + 18, { align: 'center' });
    
    doc.save(`Receipt_INV_${String(sale.invoice_no || sale.id).slice(-6).padStart(3, '0')}.pdf`);
  };

  const total = items.reduce((a, i) => a + (i.quantity * i.unit_price), 0);
  const balance = total - (parseFloat(amountPaid) || 0);

  const handleSubmit = async () => {
    if (items.length === 0 || !items[0].product_id) return setError('Please add at least one product.');
    if (saving) return;
    setSaving(true);
    
    setError('');
    const userEmail = JSON.parse(localStorage.getItem("user"))?.email || 'System';

    try {
      let resolvedCustomerId = customerId ? parseInt(customerId) : null;
      const isNewCustomer = customerName && customerName !== 'Walk-in Customer' && !customerId;
      
      if (isNewCustomer) {
        const { data: newCust, error: custErr } = await supabase.from('customers').insert([{
          name: customerName,
          phone: '',
          email: '',
          is_contractor: false,
          created_at: new Date().toISOString()
        }]).select().single();
        
        if (custErr) throw custErr;
        resolvedCustomerId = newCust.id;
      }

      const validItems = items.filter(i => i.product_id).map(i => {
        const prod = products.find(p => p.id === parseInt(i.product_id) || p.id === i.product_id);
        return {
          product_id: prod.id,
          product_name: i.product_name,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
          subtotal: parseFloat(i.quantity) * parseFloat(i.unit_price)
        };
      });

      const payloadAmountPaid = parseFloat(amountPaid) || 0;
      const status = isDeposit ? 'DEPOSIT' : (balance <= 0 ? 'PAID' : payloadAmountPaid > 0 ? 'PARTIAL' : 'UNPAID');

      const { error: rpcError } = await supabase.rpc('record_sale_transaction', {
        p_customer_id: resolvedCustomerId,
        p_customer_name: customerName,
        p_total_amount: total,
        p_amount_paid: payloadAmountPaid,
        p_payment_method: paymentMethod,
        p_payment_status: status,
        p_items: validItems,
        p_recorded_by: userEmail
      });

      if (rpcError) throw rpcError;

      setShowForm(false);
      setShowConfirm(false);
      setItems([{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
      setAmountPaid(''); setPaymentMethod('Cash'); setNotes('');
      setCustomerId(''); setCustomerName('Walk-in Customer'); setCustomerSearch('');
      setIsDeposit(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to record sale');
    } finally {
      setSaving(false);
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

  const handleExportCSV = () => {
    const headers = ["Invoice #", "Date", "Customer", "Total Amount", "Amount Paid", "Balance", "Status", "Method", "Recorded By"];
    const rows = filtered.map(s => [
      `INV-${String(s.invoice_no || s.id).padStart(3, '0')}`,
      new Date(s.created_at).toLocaleDateString(),
      s.customer_name,
      s.total_amount,
      s.amount_paid,
      s.balance_due,
      s.payment_status,
      s.payment_method,
      s.recorded_by
    ]);
    
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Sales_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const salesToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => row[h] = values[idx]);
        salesToImport.push(row);
      }

      if (salesToImport.length > 0) {
        if (!window.confirm(`Found ${salesToImport.length} records. Import them now?`)) return;
        
        setSaving(true);
        try {
          for (const row of salesToImport) {
            const prod = products.find(p => p.name.toLowerCase() === row.product?.toLowerCase()) || products[0];
            if (!prod) continue;

            const payload = {
              p_customer_name: row.customer || 'Walk-in Customer',
              p_total_amount: parseFloat(row.price) * parseFloat(row.quantity) || 0,
              p_amount_paid: parseFloat(row.paid) || 0,
              p_payment_method: row.method || 'Cash',
              p_payment_status: 'PAID',
              p_items: [{
                product_id: prod.id,
                product_name: prod.name,
                quantity: parseFloat(row.quantity) || 1,
                unit_price: parseFloat(row.price) || prod.selling_price,
                subtotal: (parseFloat(row.quantity) || 1) * (parseFloat(row.price) || prod.selling_price)
              }],
              p_recorded_by: JSON.parse(localStorage.getItem("user"))?.email || 'Import'
            };

            await supabase.rpc('record_sale_transaction', payload);
          }
          alert("Import completed successfully!");
          fetchData();
        } catch (err) {
          console.error(err);
          alert("Import failed: " + err.message);
        } finally {
          setSaving(false);
        }
      }
    };
    reader.readAsText(file);
  };

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
                <label style={lbl}>Customer Selection *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      style={{ ...inp, border: customerId ? '1.5px solid #3b82f6' : '1px solid #ddd' }}
                      value={customerSearch}
                      onChange={handleCustomerInputChange}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                      placeholder="Search existing or type new name..."
                    />
                    {showCustomerSuggestions && (
                      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #ddd', borderRadius:8, zIndex:100, maxHeight:200, overflowY:'auto', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)', marginTop:4 }}>
                        <div 
                          onMouseDown={() => { setCustomerId(''); setCustomerName('Walk-in Customer'); setCustomerSearch(''); }}
                          style={{ padding:'10px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f3f4f6', fontWeight:600, color:'#3b82f6' }}
                        >
                          👤 Generic Walk-in Customer
                        </div>
                        {filteredCustomers.map(c => (
                          <div key={c.id} onMouseDown={() => handleCustomerSelect(c)}
                            style={{ padding:'10px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f3f4f6' }}
                            onMouseEnter={e => e.target.style.background='#f3f4f6'}
                            onMouseLeave={e => e.target.style.background='#fff'}
                          >
                            <span style={{ fontWeight: 600 }}>{c.name}</span> {c.phone ? `(${c.phone})` : ''}
                          </div>
                        ))}
                        {customerSearch.length > 0 && !customerId && !filteredCustomers.find(c => c.name.toLowerCase() === customerSearch.toLowerCase()) && (
                          <div style={{ padding:'10px 12px', fontSize:12, color:'#059669', background:'#ecfdf5' }}>
                            ✨ Add "{customerSearch}" as new customer
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setCustomerId(''); setCustomerName('Walk-in Customer'); setCustomerSearch(''); }}
                    style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #ddd', background: !customerId && customerName === 'Walk-in Customer' ? '#f3f4f6' : '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Reset to Walk-in
                  </button>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: customerId ? '#3b82f6' : '#6b7280' }}>
                  Current: <span style={{ color: '#111827' }}>{customerName}</span> {customerId && ' (Saved)'}
                </div>
              </div>
              <div>
                <label style={lbl}>Internal Notes</label>
                <input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. For delivery / specific request..." />
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
                        const prod = products.find(p => p.id === parseInt(val) || p.id === val);
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleExportCSV} style={miniInp} title="Export to CSV">📤 Export</button>
              <label style={{ ...miniInp, cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Import from CSV">
                📥 Import
                <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
              </label>
            </div>
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
                  <td className="table-code">#INV-{String(s.invoice_no || s.id).slice(-6).padStart(3, '0')}</td>
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
        isLoading={saving}
      />
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13 };
const miniInp = { padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, background:'#f9fafb', outline: 'none' };
