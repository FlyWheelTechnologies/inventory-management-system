import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";
import { formatCurrency } from "../services/formatters";
import ConfirmationModal from "../components/ConfirmationModal";
import SalesForm from "../components/Sales/SalesForm";
import SalesTable from "../components/Sales/SalesTable";
import { SalesService } from "../services/SalesService";

export default function Sales() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSaleData, setPendingSaleData] = useState(null);
  const [toast, setToast] = useState(null);

  // Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("AllTime");
  const [itemsToShow, setItemsToShow] = useState(15);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { sales, products, customers } = await SalesService.fetchSalesData();
      setSales(sales);
      setProducts(products);
      setCustomers(customers);
    } catch (err) {
      console.error("Error fetching sales data:", err);
      setError("Failed to load sales data. Please refresh.");
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
    if (location.state?.showForm) {
      setShowForm(true);
    }
    // Clear state after handling it
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const filtered = useMemo(() => {
    return sales
      .filter(s => s.customer_name?.toLowerCase().includes(search.toLowerCase()))
      .filter(s => statusFilter === 'All' || s.payment_status === statusFilter)
      .filter(s => !dateFilter || new Date(s.created_at).toDateString() === new Date(dateFilter).toDateString())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [sales, search, statusFilter, dateFilter]);

  const paginated = useMemo(() => {
    return filtered.slice(0, itemsToShow);
  }, [filtered, itemsToShow]);

  const handleExportCSV = () => {
    SalesService.exportToCSV(filtered);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length <= 1) return;

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
          const payloads = [];
          for (const row of salesToImport) {
            const prod = products.find(p => p.name.toLowerCase() === row.product?.toLowerCase()) || products[0];
            if (!prod) continue;

            payloads.push({
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
            });
          }

          if (payloads.length > 0) {
            await SalesService.recordSaleTransactionsBatch(payloads);
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

  const handleSaleSave = (data) => {
    setPendingSaleData(data);
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    if (!pendingSaleData || saving) return;

    try {
      setSaving(true);
      const userEmail = user?.email || 'Walk-in Staff';
      
      const resolvedCustomerId = await SalesService.getOrCreateCustomer(
        pendingSaleData.customerName,
        pendingSaleData.customerPhone
      );

      const validItems = pendingSaleData.items
        .filter(item => item.product_id)
        .map(item => {
          const prod = products.find(p => p.id === parseInt(item.product_id) || p.id === item.product_id);

          if (!pendingSaleData.isDeposit && parseFloat(item.quantity) > prod.stock_quantity) {
            throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity} ${prod.selling_uom}.`);
          }

          return {
            product_id: prod.id,
            product_name: item.product_name,
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price),
            subtotal: parseFloat(item.quantity) * parseFloat(item.unit_price)
          };
        });

      const status = pendingSaleData.isDeposit ? 'DEPOSIT' : (pendingSaleData.balance <= 0 ? 'PAID' : pendingSaleData.amountPaid > 0 ? 'PARTIAL' : 'UNPAID');

      const newSaleId = await SalesService.recordSaleTransaction({
        p_customer_id: resolvedCustomerId,
        p_customer_name: pendingSaleData.customerName,
        p_total_amount: pendingSaleData.total,
        p_amount_paid: parseFloat(pendingSaleData.amountPaid) || 0,
        p_payment_method: pendingSaleData.paymentMethod,
        p_payment_status: status,
        p_items: validItems,
        p_recorded_by: userEmail,
        p_tax_percentage: pendingSaleData.taxPercentage,
        p_tax_inclusive: pendingSaleData.taxInclusive,
        p_credit_used: parseFloat(pendingSaleData.useCredit) || 0
      });

      localStorage.removeItem("sales_draft");
      setShowConfirm(false);
      setShowForm(false);
      setPendingSaleData(null);
      fetchData();

      setToast({ 
        message: "Sale recorded successfully!", 
        type: "success",
        action: () => SalesService.shareViaWhatsApp({
          id: newSaleId,
          customer_id: resolvedCustomerId,
          customer_name: pendingSaleData.customerName,
          total_amount: pendingSaleData.grandTotal,
          amount_paid: (parseFloat(pendingSaleData.amountPaid) || 0) + (parseFloat(pendingSaleData.useCredit) || 0),
          balance_due: pendingSaleData.balance,
          created_at: new Date().toISOString()
        }, {
          customerPhone: pendingSaleData.customerPhone,
          customerName: pendingSaleData.customerName,
          customers
        }),
        actionLabel: "Send WhatsApp Receipt"
      });
      setTimeout(() => setToast(null), 10000);
    } catch (err) {
      console.error(err);
      setShowConfirm(false);
      setError(`Transaction Failed: ${err.message || 'Network issue'}. Data is safe in draft.`);
    } finally {
      setSaving(false);
    }
  };

  const initialDraft = (() => {
    const savedDraft = localStorage.getItem("sales_draft");
    if (savedDraft) {
      try { return JSON.parse(savedDraft); } catch { return {}; }
    }
    return {};
  })();

      let matchesDate = true;
      if (dateFilter === 'Today') matchesDate = new Date(s.created_at).toDateString() === new Date().toDateString();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [sales, search, statusFilter, dateFilter]);

  const paginated = filtered.slice(0, itemsToShow);

  if (loading) return <div className="p-6"><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 className="section-title">Sales & Orders</h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280' }}>Record transactions and track Momo/Cash payments</p>
        </div>
        <button className="quick-action-btn" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close Form' : '+ New Sale'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {showForm && (
        <SalesForm
          products={products}
          customers={customers}
          initialData={JSON.parse(localStorage.getItem("sales_draft") || "{}")}
          onSave={handleSaleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      <SalesTable
        filteredSales={filtered}
        paginatedSales={paginated}
        itemsToShow={itemsToShow}
        setItemsToShow={setItemsToShow}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onExportCSV={() => SalesService.exportToCSV(filtered)}
        onGenerateReceipt={(s) => SalesService.generateReceipt(s)}
        onShareViaWhatsApp={(s) => SalesService.shareViaWhatsApp(s, { customers })}
      />

      {toast && (
        <div 
          style={{ 
            position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', 
            background: toast.type === 'error' ? '#991b1b' : '#064e3b', 
            color:'#fff', padding:'16px 24px', borderRadius:'16px', 
            boxShadow:'0 20px 25px -5px rgba(0,0,0,0.2)', zIndex:3000,
            display:'flex', alignItems:'center', gap:15,
            animation:'slideDown 0.4s ease'
          }}
        >
          <div style={{ fontSize:24 }}>{toast.type === 'error' ? '⚠️' : '✅'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight:700, fontSize: 14 }}>{toast.message}</div>
            {toast.action && (
              <button 
                onClick={toast.action}
                style={{ background: '#f15a24', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', marginTop: 8 }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
          <style>{`@keyframes slideDown { from { transform: translateX(-50%) translateY(-100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>
        </div>
      )}

      <ConfirmationModal 
        show={showConfirm}
        title="Confirm Transaction"
        message={`Are you sure you want to record this sale for GHS ${pendingSaleData?.total?.toFixed(1)}?`}
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
        type="primary"
        isLoading={saving}
      />
    </div>
  );
}
