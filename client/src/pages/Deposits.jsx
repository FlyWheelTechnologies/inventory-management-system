import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import ConfirmationModal from "../components/ConfirmationModal";
import "./Dashboard.css";
import { formatCurrency, formatPhone } from "../services/formatters";
import ConfirmationModal from "../components/ConfirmationModal";
import DepositOrdersTable from "../components/Deposits/DepositOrdersTable";
import GeneralDepositsTable from "../components/Deposits/GeneralDepositsTable";
import FulfillItemsModal from "../components/Deposits/FulfillItemsModal";
import RecordDepositModal from "../components/Deposits/RecordDepositModal";
import { DepositsService } from "../services/DepositsService";

export default function Deposits() {
  const location = useLocation();
  const [deposits, setDeposits] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Fulfillment Logic
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => { 
    fetchDeposits(); 
    if (location.state?.showForm) {
      setShowDepositModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Record Deposit Logic
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depCustName, setDepCustName] = useState("");
  const [depCustPhone, setDepCustPhone] = useState("");
  const [depMethod, setDepMethod] = useState("Cash");
  const [depSaving, setDepSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { orders: o, deps, prods } = await DepositsService.fetchDepositsData();
      setOrders(o);
      setDeposits(deps);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const executeFulfillment = async () => {
    if (!selectedSale) return;
    try {
      setFulfilling(true);
      // For simple fulfillment, we assume items in the sale are already defined
      // If sale.items is missing or we want to use the current modal logic:
      const itemsToFulfill = selectedSale.items || [];
      await DepositsService.fulfillPrepayment({
        saleId: selectedSale.id,
        items: itemsToFulfill,
        userEmail: user?.email
      });

      setToast({ message: "Order marked as fulfilled!", type: "success" });
      setShowConfirm(false);
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: "Fulfillment failed", type: "error" });
    } finally {
      setFulfilling(false);
    }
  };

  const handlePureFulfillment = async () => {
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) return;
    
    try {
      setFulfilling(true);
      await DepositsService.fulfillPrepayment({
        saleId: selectedSale.id,
        items: validItems,
        userEmail: user?.email
      });

      setToast({ message: "Stock updated & fulfilled!", type: "success" });
      setShowFulfillModal(false);
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: "Fulfillment failed", type: "error" });
    } finally {
      setFulfilling(false);
    }
  };

  const handlePureDeposit = async () => {
    if (!depAmount || parseFloat(depAmount) <= 0) return;
    try {
      setDepSaving(true);
      await DepositsService.recordPureDeposit({
        customerName: depCustName,
        phone: depCustPhone,
        amount: depAmount,
        method: depMethod,
        userEmail: user?.email
      });

      setToast({ message: "Deposit recorded successfully!", type: "success" });
      setShowDepositModal(false);
      setDepAmount(""); setDepCustName(""); setDepCustPhone("");
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: "Failed to record deposit", type: "error" });
    } finally {
      setDepSaving(false);
    }
  };

  if (loading) return <div className="p-6"><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div className="deposits-container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 className="section-title">Deposits & Prepayments</h2>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Manage customer prepayments and pending order fulfillment</p>
        </div>
        <button
          onClick={() => setShowDepositModal(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}
        >
          + Record New Deposit
        </button>
      </div>

      <DepositOrdersTable
        orders={orders}
        onFulfill={(s) => { setSelectedSale(s); setShowConfirm(true); }}
        onFulfillItems={(s) => { setSelectedSale(s); setItems(s.items || [{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }]); setShowFulfillModal(true); }}
      />

      <GeneralDepositsTable
        deposits={deposits}
        onDownloadReceipt={(d) => DepositsService.generateReceipt(d)}
      />

      {/* Status Toasts */}
      {toast && (
        <div style={{ 
          position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', 
          background: toast.type === 'success' ? '#064e3b' : '#7f1d1d', 
          color:'#fff', padding:'12px 24px', borderRadius:'12px', 
          boxShadow:'0 10px 15px -3px rgba(0,0,0,0.2)', zIndex:4000, 
          display:'flex', alignItems:'center', gap:10, animation:'slideDown 0.3s ease' 
        }}>
          <span style={{fontSize:18}}>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{fontWeight:600}}>{toast.message}</span>
          <style>{`
            @keyframes slideDown { 
              from { transform: translateX(-50%) translateY(-50px); opacity: 0; }
              to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      <FulfillItemsModal
        show={showFulfillModal}
        onClose={() => setShowFulfillModal(false)}
        selectedSale={selectedSale}
        items={items}
        setItems={setItems}
        products={products}
        onFulfill={handlePureFulfillment}
        fulfilling={fulfilling}
      />

      <RecordDepositModal
        show={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        custName={depCustName}
        setCustName={setDepCustName}
        custPhone={depCustPhone}
        setCustPhone={setDepCustPhone}
        amount={depAmount}
        setAmount={setDepAmount}
        method={depMethod}
        setMethod={setDepMethod}
        onSave={handlePureDeposit}
        saving={depSaving}
      />

      <ConfirmationModal 
        show={showConfirm}
        title="Confirm Fulfillment"
        message="Are you sure you want to mark this order as fulfilled? This confirms items have been physically delivered to the customer."
        confirmText="Yes, Mark Fulfilled"
        onConfirm={executeFulfillment}
        onCancel={() => setShowConfirm(false)}
        type="primary"
        isLoading={fulfilling}
      />
    </div>
  );
}
