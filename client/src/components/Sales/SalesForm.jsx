import React, { useState, useEffect } from "react";
import { formatCurrency, formatPhone } from "../../services/formatters";

const SalesForm = ({ products, customers, initialData, onSave, onCancel, saving }) => {
  const [customerName, setCustomerName] = useState(initialData.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(initialData.customerPhone || "");
  const [items, setItems] = useState(initialData.items || [{ product_id: '', product_name: '', quantity: 1, unit_price: 0, showDropdown: false, searchQuery: '' }]);
  const [paymentMethod, setPaymentMethod] = useState(initialData.paymentMethod || "Cash");
  const [amountPaid, setAmountPaid] = useState(initialData.amountPaid || "");
  const [isDeposit, setIsDeposit] = useState(initialData.isDeposit || false);
  const [taxPercentage, setTaxPercentage] = useState(initialData.taxPercentage || 0);
  const [taxInclusive, setTaxInclusive] = useState(initialData.taxInclusive !== undefined ? initialData.taxInclusive : true);
  const [useCredit, setUseCredit] = useState(initialData.useCredit || 0);

  // Auto-save draft
  useEffect(() => {
    const draft = { customerName, customerPhone, items, paymentMethod, amountPaid, isDeposit, taxPercentage, taxInclusive, useCredit };
    localStorage.setItem("sales_draft", JSON.stringify(draft));
  }, [customerName, customerPhone, items, paymentMethod, amountPaid, isDeposit, taxPercentage, taxInclusive, useCredit]);

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const taxAmount = taxInclusive
    ? total - (total / (1 + (taxPercentage / 100)))
    : total * (taxPercentage / 100);

  const grandTotal = taxInclusive ? total : total + taxAmount;
  const balance = Math.max(0, grandTotal - (parseFloat(amountPaid) || 0) - (parseFloat(useCredit) || 0));

  const customerCredit = customers.find(c => c.name === customerName)?.balance || 0;

  const handleSubmit = () => {
    if (!customerName || items.filter(i => i.product_id).length === 0) {
      alert("Please enter customer name and at least one product.");
      return;
    }
    onSave({ customerName, customerPhone, items, total, taxAmount, grandTotal, amountPaid, paymentMethod, isDeposit, balance, taxPercentage, taxInclusive, useCredit });
  };

  return (
    <div className="table-card animate-slide-up" style={{ marginBottom: 30, border: '2px solid var(--brand-primary)' }}>
      <div className="table-card__header" style={{ background: 'var(--brand-bg-light)' }}>
        <h3 className="table-card__title">✨ New Sale Transaction</h3>
        <button onClick={onCancel} className="close-btn">✕</button>
      </div>

      {/* SECTION 1: CUSTOMER */}
      <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6' }}>
        <h4 className="sec-header">01. Customer Details</h4>
        <div className="form-grid">
          <div>
            <label className="form-label">Customer Name *</label>
            <input className="form-input" list="customer-list" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Search or enter name..." />
            <datalist id="customer-list">
              {customers.map(c => <option key={c.id} value={c.name}>{c.phone}</option>)}
            </datalist>
          </div>
          <div>
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={customerPhone} onChange={e => setCustomerPhone(formatPhone(e.target.value))} placeholder="+233XXXXXXXXX" />
          </div>
        </div>
      </div>

      {/* SECTION 2: ITEMS */}
      <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6' }}>
        <h4 className="sec-header">02. Cart Items</h4>
        <table className="stock-table" style={{ marginBottom: 15 }}>
          <thead>
            <tr><th style={{ width: '40%' }}>Product Selection</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      placeholder="Type product name or code..."
                      value={item.searchQuery || item.product_name}
                      onFocus={() => {
                        const newItems = [...items];
                        newItems[idx].showDropdown = true;
                        setItems(newItems);
                      }}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].searchQuery = e.target.value;
                        newItems[idx].showDropdown = true;
                        setItems(newItems);
                      }}
                    />
                    {item.showDropdown && (
                      <div className="table-card" style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                        marginTop: 4, maxHeight: 250, overflowY: 'auto'
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
                              style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
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
                <td><input className="form-input" style={{ width: 80 }} type="number" min="1" value={item.quantity} onChange={e => {
                  const newItems = [...items];
                  newItems[idx].quantity = parseFloat(e.target.value) || 0;
                  setItems(newItems);
                }} /></td>
                <td><input className="form-input" style={{ width: 100 }} type="number" step="0.01" value={item.unit_price} onChange={e => {
                  const newItems = [...items];
                  newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                  setItems(newItems);
                }} /></td>
                <td style={{ fontWeight: 600 }}>GHS {formatCurrency(item.quantity * item.unit_price)}</td>
                <td><button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: '#f3f4f6', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }])} style={{ background: '#f3f4f6', border: '1px solid #ddd', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>+ Add Item Row</button>
      </div>

      {/* SECTION 3: TOTALS & PAYMENT */}
      <div style={{ padding: 20 }}>
        <h4 className="sec-header">03. Totals & Payment</h4>

        <div className={`payment-toggle ${isDeposit ? 'payment-toggle--deposit' : 'payment-toggle--regular'}`}>
          <button type="button" onClick={() => setIsDeposit(!isDeposit)} style={{ background: isDeposit ? '#10b981' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {isDeposit ? '✓ Marked as Deposit' : '📥 Mark as Deposit'}
          </button>
          <span style={{ fontSize: 12, color: isDeposit ? '#065f46' : '#1e40af' }}>{isDeposit ? 'Payment held as advance deposit. Items stay in stock reservation.' : 'Toggle this if customer is paying in advance.'}</span>
        </div>

        <div className="totals-grid">
          <div>
            <label className="form-label">Tax Options</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select className="form-select" style={{ padding: '6px' }} value={taxPercentage} onChange={e => setTaxPercentage(parseFloat(e.target.value))}>
                <option value="20">20% Unified (VAT+NHIL+GET)</option>
                <option value="15">15% VAT Only</option>
                <option value="12.5">12.5% Flat Rate</option>
                <option value="0">0% Exempt</option>
              </select>
              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={taxInclusive} onChange={e => setTaxInclusive(e.target.checked)} /> Inclusive
              </label>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Tax: GHS {formatCurrency(taxAmount)}</div>
          </div>
          <div>
            <label className="form-label">Grand Total</label>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>GHS {formatCurrency(grandTotal)}</p>
          </div>
          <div>
            <label className="form-label">{isDeposit ? 'Deposit Amt' : 'Paid Amt'} *</label>
            <input className="form-input" style={{ fontSize: 16, fontWeight: 700, border: '2px solid #3b82f6' }} type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label className="form-label">Pay Method</label>
            <select className="form-select" style={{ fontWeight: 600 }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="Cash">💵 Cash</option>
              <option value="Momo">📱 Momo</option>
              <option value="Bank">🏦 Bank</option>
            </select>
          </div>
        </div>

        {customerCredit > 0 && (
          <div className="credit-banner">
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>🎁 Available Customer Credit: GHS {formatCurrency(customerCredit)}</span>
              <p style={{ fontSize: 11, color: '#15803d', margin: '4px 0 0' }}>This customer has overpaid in the past. You can apply this to the current sale.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Apply Credit: </label>
              <input
                type="number"
                max={Math.min(customerCredit, grandTotal)}
                className="form-input"
                style={{ width: 100, border: '1.5px solid #22c55e' }}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <label className="form-label">Subtotal</label>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#6b7280' }}>GHS {formatCurrency(total)}</p>
            </div>
            <div>
              <label className="form-label">{isDeposit ? 'Balance on Delivery' : 'Balance Due'}</label>
              <p style={{ fontSize: 15, fontWeight: 700, color: balance > 0 ? (isDeposit ? '#f59e0b' : '#ef4444') : '#059669' }}>GHS {formatCurrency(balance)}</p>
            </div>
          </div>
          <button type="button" onClick={handleSubmit} className="quick-action-btn" style={{ width: '280px', height: '50px', fontSize: 16, background: isDeposit ? '#10b981' : undefined }}>
            {isDeposit ? '📥 Record Deposit' : 'Confirm & Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesForm;
