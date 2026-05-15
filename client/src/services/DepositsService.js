import { supabase } from "./supabaseClient";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from "./formatters";

export const DepositsService = {
  async fetchDepositsData() {
    const { data: orders, error: ordersErr } = await supabase
      .from('sales')
      .select('*')
      .eq('payment_status', 'DEPOSIT')
      .order('created_at', { ascending: false });
    if (ordersErr) throw ordersErr;

    const { data: deps, error: depsErr } = await supabase
      .from('deposits')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false });
    if (depsErr) throw depsErr;

    const { data: prods, error: prodsErr } = await supabase
      .from('products')
      .select('*');
    if (prodsErr) throw prodsErr;

    return { orders, deps, prods };
  },

  async recordPureDeposit({ customerName, phone, amount, method, userEmail }) {
    // 1. Find or create customer
    let { data: customer, error: fetchErr } = await supabase
      .from('customers')
      .select('id, balance')
      .eq('phone', phone)
      .single();

    let customerId;
    if (fetchErr || !customer) {
      const { data: newCust, error: createErr } = await supabase
        .from('customers')
        .insert([{ name: customerName, phone: phone, balance: 0 }])
        .select()
        .single();
      if (createErr) throw createErr;
      customerId = newCust.id;
    } else {
      customerId = customer.id;
    }

    // 2. Insert deposit
    const { error: depErr } = await supabase
      .from('deposits')
      .insert([{
        customer_id: customerId,
        amount: parseFloat(amount),
        payment_method: method,
        recorded_by: userEmail,
        notes: 'Prepayment'
      }]);
    if (depErr) throw depErr;

    // 3. Log
    await supabase.from('logs').insert([{
      user_email: userEmail,
      action: 'DEPOSIT_RECORDED',
      details: `Recorded GHS ${amount} deposit for ${customerName}`
    }]);

    return customerId;
  },

  async fulfillPrepayment({ saleId, items, userEmail }) {
    // 1. Update sale status
    const { error: saleErr } = await supabase
      .from('sales')
      .update({ payment_status: 'PAID', updated_at: new Date().toISOString() })
      .eq('id', saleId);
    if (saleErr) throw saleErr;

    // 2. Deduct stock for each item
    for (const item of items) {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      await supabase
        .from('products')
        .update({ stock_quantity: (prod.stock_quantity || 0) - item.quantity })
        .eq('id', item.product_id);
    }

    // 3. Log
    await supabase.from('logs').insert([{
      user_email: userEmail,
      action: 'ORDER_FULFILLED',
      details: `Fulfilled deposit order #${saleId.slice(0,8)}`
    }]);
  },

  generateReceipt(dep) {
    const doc = new jsPDF();
    const date = new Date(dep.created_at).toLocaleDateString();

    doc.setFontSize(22);
    doc.text("CASH RECEIPT", 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Receipt #: DEP-${dep.id.slice(0,8).toUpperCase()}`, 14, 40);
    doc.text(`Date: ${date}`, 14, 45);

    doc.autoTable({
      startY: 60,
      head: [['Description', 'Amount']],
      body: [
        ['Customer Name', dep.customers?.name || 'Walk-in'],
        ['Customer Phone', dep.customers?.phone || '---'],
        ['Payment Method', dep.payment_method],
        ['Amount Paid', `GHS ${formatCurrency(dep.amount)}`],
      ],
      theme: 'striped',
      headStyles: { fillStyle: '#3b82f6' }
    });

    doc.save(`Receipt_${dep.id.slice(0,8)}.pdf`);
  }
};
