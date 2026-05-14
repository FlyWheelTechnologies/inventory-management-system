import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import ConfirmationModal from "../components/ConfirmationModal";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import "./Dashboard.css";
import { formatCurrency, formatPhone } from "../services/formatters";

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
  const location = useLocation();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [salesRes, productsRes, customersRes] = await Promise.all([
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('customers').select('*')
    ]);
    if (salesRes.data) setSales(salesRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
    setTimeout(() => setLoading(false), 1000);
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
  const [toast, setToast] = useState(null); // { message, type }
  
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+233');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [items, setItems] = useState([{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [isDeposit, setIsDeposit] = useState(false);
  const [taxPercentage, setTaxPercentage] = useState(20);
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [customerCredit, setCustomerCredit] = useState(0);
  const [useCredit, setUseCredit] = useState(0);

  useEffect(() => {
    if (location.state?.isDeposit) {
      setIsDeposit(true);
      setShowForm(true);
    }
  }, [location]);

  const filteredCustomers = customerSearch.length > 0
    ? customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  // --- Draft Persistence ---
  useEffect(() => {
    const savedDraft = localStorage.getItem("sales_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setCustomerId(draft.customerId || '');
        setCustomerName(draft.customerName || 'Walk-in Customer');
        setItems(draft.items || [{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
        setAmountPaid(draft.amountPaid || '');
        setPaymentMethod(draft.paymentMethod || 'Cash');
        setNotes(draft.notes || '');
        setIsDeposit(draft.isDeposit || false);
        setTaxPercentage(draft.taxPercentage || 0);
        setTaxInclusive(draft.taxInclusive !== undefined ? draft.taxInclusive : true);
        setCustomerPhone(draft.customerPhone || '+233');
        // Only show form if there was meaningful data
        if (draft.items?.length > 0 && draft.items[0].product_id) setShowForm(true);
      } catch (e) { console.error("Draft load error", e); }
    }
  }, []);

  useEffect(() => {
    if (showForm) {
      const draft = { customerId, customerName, customerPhone, items, amountPaid, paymentMethod, notes, isDeposit, taxPercentage, taxInclusive };
      localStorage.setItem("sales_draft", JSON.stringify(draft));
    }
  }, [customerId, customerName, items, amountPaid, paymentMethod, notes, isDeposit, showForm]);

  const clearDraft = () => {
    localStorage.removeItem("sales_draft");
    setCustomerSearch('');
    setCustomerPhone('+233');
    setItems([{ product_id:'', product_name:'', quantity:1, unit_price:0 }]);
    setAmountPaid('');
    setPaymentMethod('Cash');
    setNotes('');
    setIsDeposit(false);
    setTaxPercentage(20);
    setTaxInclusive(true);
  };

  const handleCustomerSelect = async (c) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerSearch(c.name);
    setCustomerPhone(c.phone || '+233');
    setShowCustomerSuggestions(false);
    
    // Fetch customer credit balance
    const { data } = await supabase.from('deposits').select('total_balance').eq('customer_id', c.id).single();
    if (data && data.total_balance < 0) {
      setCustomerCredit(Math.abs(data.total_balance));
    } else {
      setCustomerCredit(0);
    }
  };

  const handleCustomerInputChange = (e) => {
    const val = e.target.value;
    setCustomerSearch(val);
    setCustomerName(val || 'Walk-in Customer');
    setCustomerId('');
    setCustomerPhone('+233');
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
    
    doc.line(5, 13, 75, 13);
    
    // Transaction Details
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');
    doc.text(`INVOICE: #INV-${String(sale.invoice_no || sale.id).slice(-6).padStart(3, '0')}`, 5, 19);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`, 5, 23);
    doc.text(`Customer: ${sale.customer_name}`, 5, 27);
    doc.text(`Recorded By: ${sale.recorded_by || 'Staff'}`, 5, 31);
    
    autoTable(doc, {
      startY: 35,
      margin: { left: 5, right: 5 },
      head: [['ITEM', 'QTY', 'PRICE', 'TOTAL']],
      body: saleItems.map(i => [i.product_name, i.quantity, i.unit_price.toFixed(1), i.subtotal.toFixed(1)]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' }, // Charcoal Header
      columnStyles: { 3: { halign: 'right' } }
    });

    const finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(`GRAND TOTAL:`, 35, finalY);
    doc.text(`GHS ${parseFloat(sale.total_amount).toFixed(1)}`, 75, finalY, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Amount Paid:`, 35, finalY + 5);
    doc.text(`GHS ${parseFloat(sale.amount_paid).toFixed(1)}`, 75, finalY + 5, { align: 'right' });
    
    doc.text(`Balance Due:`, 35, finalY + 9);
    doc.setTextColor(sale.balance_due > 0 ? 249 : 5, sale.balance_due > 0 ? 115 : 150, sale.balance_due > 0 ? 22 : 105);
    doc.text(`GHS ${parseFloat(sale.balance_due).toFixed(1)}`, 75, finalY + 9, { align: 'right' });
    
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(6);
    doc.text('powered by bookflywheel.com', 40, 146, { align: 'center' });
    
    doc.save(`Receipt_INV_${String(sale.invoice_no || sale.id).slice(-6).padStart(3, '0')}.pdf`);
  };

  const shareViaWhatsApp = (sale) => {
    if (!sale) return;
    const customer = customers.find(c => c.id === sale.customer_id);
    let phone = customer?.phone || (sale.customer_name === customerName ? customerPhone : '');
    
    // Fallback/Format phone
    if (phone && phone.startsWith('0')) phone = '+233' + phone.substring(1);
    if (phone && !phone.startsWith('+')) phone = '+233' + phone;

    if (!phone || phone === '+233') {
      setToast({ message: "No phone number available for this customer.", type: "error" });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const invoiceNo = `INV-${String(sale.invoice_no || sale.id || '000').slice(-6).padStart(3, '0')}`;
    const message = `*FlorzyAngel ENT - Official Receipt*%0A%0A` +
      `Hello ${sale.customer_name}, thank you for your business!%0A%0A` +
      `*Invoice:* ${invoiceNo}%0A` +
      `*Date:* ${new Date(sale.created_at || new Date()).toLocaleDateString()}%0A` +
      `*Total:* GHS ${formatCurrency(sale.total_amount)}%0A` +
      `*Paid:* GHS ${formatCurrency(sale.amount_paid)}%0A` +
      `*Balance:* GHS ${formatCurrency(sale.balance_due)}%0A%0A` +
      `Thank you for shopping with us!`;

    const waUrl = `https://wa.me/${phone.replace(/\s+/g, '').replace(/^\+/, '')}?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const total = items.reduce((a, i) => a + (i.quantity * i.unit_price), 0);
  const taxAmount = taxInclusive 
    ? total - (total / (1 + (taxPercentage / 100))) 
    : total * (taxPercentage / 100);
  const grandTotal = taxInclusive ? total : total + taxAmount;
  const balance = grandTotal - (parseFloat(amountPaid) || 0) - (parseFloat(useCredit) || 0);

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
          phone: customerPhone,
          email: '',
          is_contractor: false,
          created_at: new Date().toISOString()
        }]).select().single();
        
        if (custErr) throw custErr;
        resolvedCustomerId = newCust.id;
      }

      const validItems = [];
      for (const item of items) {
        if (!item.product_id) continue;
        const prod = products.find(p => p.id === parseInt(item.product_id) || p.id === item.product_id);
        
        if (!isDeposit && parseFloat(item.quantity) > prod.stock_quantity) {
          throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity} ${prod.selling_uom}. Requested: ${item.quantity}`);
        }

        validItems.push({
          product_id: prod.id,
          product_name: item.product_name,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.quantity) * parseFloat(item.unit_price)
        });
      }

      const payloadAmountPaid = parseFloat(amountPaid) || 0;
      const status = isDeposit ? 'DEPOSIT' : (balance <= 0 ? 'PAID' : payloadAmountPaid > 0 ? 'PARTIAL' : 'UNPAID');

      const { data: newSale, error: rpcError } = await supabase.rpc('record_sale_transaction', {
        p_customer_id: resolvedCustomerId,
        p_customer_name: customerName,
        p_total_amount: total,
        p_amount_paid: payloadAmountPaid,
        p_payment_method: paymentMethod,
        p_payment_status: status,
        p_items: validItems,
        p_recorded_by: userEmail,
        p_tax_percentage: taxPercentage,
        p_tax_inclusive: taxInclusive,
        p_credit_used: parseFloat(useCredit) || 0
      });

      if (rpcError) throw rpcError;

      // Handle credit usage if applied
      if (useCredit > 0) {
        // Record credit usage logic here if needed for journal, 
        // but since we're just deducting from amountPaid logic, 
        // the RPC should handle balance_due correctly if we pass the total effectively.
        // Actually, I should probably pass a p_credit_applied to the RPC.
      }

      // Clear draft on success
      setUseCredit(0);
      setCustomerCredit(0);
      clearDraft();
      setShowConfirm(false);
      setShowForm(false);
      fetchData();
      setToast({ 
        message: "Sale recorded successfully!", 
        type: "success",
        action: () => shareViaWhatsApp({
          id: newSaleId,
          customer_id: resolvedCustomerId,
          customer_name: customerName,
          total_amount: grandTotal,
          amount_paid: payloadAmountPaid + (parseFloat(useCredit) || 0),
          balance_due: balance,
          created_at: new Date().toISOString()
        }),
        actionLabel: "Send WhatsApp Receipt"
      });
      setTimeout(() => setToast(null), 10000); // 10s or until close
    } catch (err) {
      console.error(err);
      setShowConfirm(false);
      setError(`Transaction Failed: ${err.message || 'Network issue'}. Your data is safe in this draft.`);
    } finally {
      setSaving(false);
    }
  };

  const [dateFilter, setDateFilter] = useState('');
  const [itemsToShow, setItemsToShow] = useState(25);
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

  const paginated = filtered.slice(0, itemsToShow);

  if (loading) {
    return (
      <div className="sales-container" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 300, height: 40 }} />
          <div className="skeleton" style={{ width: 140, height: 40 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 45, borderRadius: 10 }} />)}
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div className="skeleton" style={{ height: 45, marginBottom: 20, width: '100%' }} />
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="skeleton" style={{ height: 55, marginBottom: 12, width: '100%' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 className="section-title">Sales & Orders</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Record transactions and track Momo/Cash payments</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {showForm && (
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
          <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Close Form' : '+ New Sale'}
          </button>
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
          <div style={{ padding:0 }}>
            {/* SECTION 1: CUSTOMER & NOTES */}
            <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6' }}>
              <h4 style={secH}>01. Customer Information</h4>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
                <div style={{ position: 'relative' }}>
                  <label style={lbl}>Select Customer *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        style={{ ...inp, border: customerId ? '1.5px solid #3b82f6' : '1px solid #ddd' }}
                        value={customerSearch}
                        onChange={handleCustomerInputChange}
                        onFocus={() => setShowCustomerSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                        placeholder="Search existing or type new name..."
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      />
                      {showCustomerSuggestions && (
                        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #ddd', borderRadius:8, zIndex:100, maxHeight:200, overflowY:'auto', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)', marginTop:4 }}>
                          <div 
                            onMouseDown={() => { setCustomerId(''); setCustomerName('Walk-in Customer'); setCustomerSearch(''); setCustomerPhone('+233'); }}
                            style={{ padding:'10px 12px', cursor:'pointer', fontSize:13, borderBottom:'1.5px solid #e5e7eb', fontWeight:700, color:'#f97316', background: '#fff7ed' }}
                          >
                            👤 Generic Walk-in Customer (Default)
                          </div>
                          {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                            <div key={c.id} onMouseDown={() => handleCustomerSelect(c)}
                              style={{ padding:'10px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f3f4f6' }}
                              onMouseEnter={e => e.target.style.background='#f3f4f6'}
                              onMouseLeave={e => e.target.style.background='#fff'}
                            >
                              <span style={{ fontWeight: 600 }}>{c.name}</span> {c.phone ? `— ${c.phone}` : ''}
                            </div>
                          )) : (
                            <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
                              No matching customers
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setCustomerId(''); setCustomerName('Walk-in Customer'); setCustomerSearch(''); setCustomerPhone('+233'); }}
                      style={{ background:'#f3f4f6', border:'none', borderRadius:8, padding:'0 12px', cursor:'pointer', color:'#6b7280', fontSize:12, fontWeight:600 }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Customer Phone</label>
                  <input
                    style={inp}
                    value={customerPhone}
                    onChange={e => setCustomerPhone(formatPhone(e.target.value))}
                    placeholder="+233XXXXXXXXX"
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
                <div>
                  <label style={lbl}>Internal Sale Notes</label>
                  <input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. For delivery / special packaging..." onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: customerId ? '#3b82f6' : '#6b7280' }}>
                    Active: <span style={{ color: '#111827' }}>{customerName}</span> {customerId && ' (Linked Account)'}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: ITEMS */}
            <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6' }}>
              <h4 style={secH}>02. Items Selection</h4>
              <table className="stock-table" style={{ marginBottom:16 }}>
                <thead><tr><th>Product</th><th>Qty</th><th>Unit Price (GHS)</th><th>Subtotal</th><th></th></tr></thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                          <input 
                            style={{...inp, minWidth:250}} 
                            placeholder="Search code or name..."
                            value={item.product_id ? (products.find(p => p.id === parseInt(item.product_id) || p.id === item.product_id)?.name || '') : item.searchQuery || ''}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].searchQuery = e.target.value;
                              newItems[idx].product_id = ''; // Clear selected if typing
                              setItems(newItems);
                            }}
                            onFocus={() => {
                              const newItems = [...items];
                              newItems[idx].showDropdown = true;
                              setItems(newItems);
                            }}
                          />
                          {item.showDropdown && (
                            <div className="search-dropdown" style={{
                              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                              background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', marginTop: 4,
                              maxHeight: 250, overflowY: 'auto'
                            }}>
                              {products.filter(p => 
                                !item.searchQuery || 
                                (p.name?.toLowerCase() || '').includes(item.searchQuery.toLowerCase()) || 
                                (p.item_code?.toLowerCase() || '').includes(item.searchQuery.toLowerCase())
                              ).length === 0 ? (
                                <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                                  ⚠️ Product not found
                                </div>
                              ) : (
                                products.filter(p => 
                                  !item.searchQuery || 
                                  (p.name?.toLowerCase() || '').includes(item.searchQuery.toLowerCase()) || 
                                  (p.item_code?.toLowerCase() || '').includes(item.searchQuery.toLowerCase())
                                ).map(p => (
                                  <div 
                                    key={p.id}
                                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }}
                                    className="search-item"
                                    onClick={() => {
                                      const newItems = [...items];
                                      newItems[idx].product_id = p.id;
                                      newItems[idx].product_name = p.name;
                                      newItems[idx].unit_price = p.selling_price;
                                      newItems[idx].showDropdown = false;
                                      newItems[idx].searchQuery = p.name;
                                      setItems(newItems);
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{p.name}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                                      {p.item_code} • {p.stock_quantity} {p.selling_uom} available
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        {item.showDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => {
                          const newItems = [...items];
                          newItems[idx].showDropdown = false;
                          setItems(newItems);
                        }} />}
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
                      <td style={{fontWeight:600}}>GHS {formatCurrency(item.quantity * item.unit_price)}</td>
                      <td><button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{background:'#f3f4f6', color:'#ef4444', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer'}}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => setItems([...items, { product_id:'', product_name:'', quantity:1, unit_price:0 }])} style={{background:'#f3f4f6', border:'1px solid #ddd', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:13}}>+ Add Item Row</button>
            </div>

            {/* SECTION 3: TOTALS & PAYMENT */}
            <div style={{ padding: 20 }}>
              <h4 style={secH}>03. Totals & Payment</h4>
              
              <div style={{ display:'flex', alignItems:'center', gap:12, margin:'0 0 20px', padding:'12px 16px', background: isDeposit ? '#ecfdf5' : '#eff6ff', borderRadius:10, border: `1.5px solid ${isDeposit ? '#10b981' : '#3b82f6'}` }}>
                <button type="button" onClick={() => setIsDeposit(!isDeposit)} style={{ background: isDeposit ? '#10b981' : '#3b82f6', color:'#fff', border:'none', borderRadius:20, padding:'6px 18px', fontWeight:700, cursor:'pointer', fontSize:13 }}>
                  {isDeposit ? '✓ Marked as Deposit' : '📥 Mark as Deposit'}
                </button>
                <span style={{ fontSize:12, color: isDeposit ? '#065f46' : '#1e40af' }}>{isDeposit ? 'Payment held as advance deposit. Items stay in stock reservation.' : 'Toggle this if customer is paying in advance.'}</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr', gap:20, padding:20, background:'#f9fafb', borderRadius:12, border: '1px solid #e5e7eb' }}>
                <div>
                  <label style={lbl}>Tax Options</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <select style={{ ...inp, padding: '6px' }} value={taxPercentage} onChange={e => setTaxPercentage(parseFloat(e.target.value))}>
                      <option value="20">20% Unified (VAT+NHIL+GET)</option>
                      <option value="15">15% VAT Only</option>
                      <option value="12.5">12.5% Flat Rate</option>
                      <option value="0">0% Exempt</option>
                    </select>
                    <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4, whiteSpace:'nowrap' }}>
                      <input type="checkbox" checked={taxInclusive} onChange={e => setTaxInclusive(e.target.checked)} /> Inclusive
                    </label>
                  </div>
                  <div style={{fontSize:11, color:'#6b7280', marginTop:6}}>Tax: GHS {formatCurrency(taxAmount)}</div>
                </div>
                <div>
                  <label style={lbl}>Grand Total</label>
                  <p style={{fontSize:24, fontWeight:800, color: '#111827'}}>GHS {formatCurrency(grandTotal)}</p>
                </div>
                <div>
                  <label style={lbl}>{isDeposit ? 'Deposit Amt' : 'Paid Amt'} *</label>
                  <input style={{...inp, fontSize:16, fontWeight:700, border: '2px solid #3b82f6'}} type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                </div>
                <div>
                  <label style={lbl}>Pay Method</label>
                  <select style={{...inp, fontWeight:600}} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="Cash">💵 Cash</option>
                    <option value="Momo">📱 Momo</option>
                    <option value="Bank">🏦 Bank</option>
                  </select>
                </div>
              </div>

              {customerCredit > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1.5px dashed #22c55e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>🎁 Available Customer Credit: GHS {formatCurrency(customerCredit)}</span>
                    <p style={{ fontSize: 11, color: '#15803d', margin: '4px 0 0' }}>This customer has overpaid in the past. You can apply this to the current sale.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Apply Credit: </label>
                    <input 
                      type="number" 
                      max={Math.min(customerCredit, grandTotal)} 
                      style={{ ...inp, width: 100, border: '1.5px solid #22c55e' }} 
                      value={useCredit} 
                      onChange={e => setUseCredit(Math.min(parseFloat(e.target.value) || 0, customerCredit, grandTotal))} 
                    />
                    <button 
                      type="button"
                      onClick={() => setUseCredit(Math.min(customerCredit, grandTotal))}
                      style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Max
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20 }}>
                <div style={{ display:'flex', gap: 20 }}>
                  <div>
                    <label style={lbl}>Subtotal</label>
                    <p style={{fontSize:15, fontWeight:600, color:'#6b7280'}}>GHS {formatCurrency(total)}</p>
                  </div>
                  <div>
                    <label style={lbl}>{isDeposit ? 'Balance on Delivery' : 'Balance Due'}</label>
                    <p style={{fontSize:15, fontWeight:700, color: balance > 0 ? (isDeposit ? '#f59e0b' : '#ef4444') : '#059669'}}>GHS {formatCurrency(balance)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowConfirm(true)} className="quick-action-btn" style={{ width:'280px', height:'50px', fontSize:16, background: isDeposit ? '#10b981' : undefined }}>
                  {isDeposit ? '📥 Record Deposit' : 'Confirm & Complete Sale'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Success Toast */}
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
            {toast.action && (
              <button 
                onClick={() => { toast.action(); setToast(null); }}
                style={{ 
                  background: '#f15a24', border: 'none', color: '#fff', 
                  padding: '6px 12px', borderRadius: '8px', fontSize: '11px', 
                  fontWeight: 800, cursor: 'pointer', marginTop: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              >
                <span>📱</span> {toast.actionLabel}
              </button>
            )}
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
                  <td style={{fontWeight:600}}>GHS {formatCurrency(s.total_amount)}</td>
                  <td>GHS {formatCurrency(s.amount_paid)}</td>
                  <td style={{fontWeight:600, color: s.balance_due > 0 ? '#ef4444' : '#059669'}}>GHS {formatCurrency(s.balance_due)}</td>
                  <td><span className={`status-pill status-pill--${s.payment_status === 'PAID' ? 'ok' : 'low'}`}>{s.payment_status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button onClick={() => generateReceipt(s)} style={{background:'none', border:'none', cursor:'pointer', fontSize:16, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'}} title="Download PDF Receipt">📄</button>
                      <button onClick={() => shareViaWhatsApp(s)} style={{background:'none', border:'none', cursor:'pointer', fontSize:16}} title="Send receipt on WhatsApp">📱</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > itemsToShow && (
          <div style={{ padding: 20, textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
            <button 
              onClick={() => setItemsToShow(prev => prev + 25)}
              style={{ width: '100%', padding: '12px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 8, color: '#4b5563', fontWeight: 600, cursor: 'pointer' }}
            >
              See More Transactions ↓
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal 
        show={showConfirm}
        title="Confirm Transaction"
        message={`Are you sure you want to record this sale for GHS ${total.toFixed(1)}? This will deduct items from stock and create a journal entry.`}
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
const secH = { fontSize:13, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1px', marginBottom:16 };
const inp = { width:'100%', padding:8, borderRadius:6, border:'1px solid #ddd', fontSize:13, outline: 'none' };
const miniInp = { padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, background:'#f9fafb', outline: 'none' };
