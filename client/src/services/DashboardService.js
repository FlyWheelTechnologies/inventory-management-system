import { supabase } from "./supabaseClient";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from "./formatters";

export const DashboardService = {
  async fetchDashboardData() {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch Today's Sales for Cash In and Revenue
    const { data: salesToday, error: salesErr } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', today);
    if (salesErr) throw salesErr;

    // 2. Fetch Deposits for Cash In
    const { data: depositsToday, error: depErr } = await supabase
      .from('deposits')
      .select('amount')
      .gte('created_at', today);
    if (depErr) throw depErr;

    // 3. Fetch Pending Deposits (Total Balance)
    const { data: customers, error: custErr } = await supabase
      .from('customers')
      .select('balance');
    if (custErr) throw custErr;

    // 4. Fetch Inventory for Stock Value and Low Stock
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('*');
    if (prodErr) throw prodErr;

    // 5. Fetch Chart Data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: chartSales, error: cSalesErr } = await supabase
      .from('sales')
      .select('total_amount, amount_paid, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());
    if (cSalesErr) throw cSalesErr;

    const { data: chartDeps, error: cDepsErr } = await supabase
      .from('deposits')
      .select('amount, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());
    if (cDepsErr) throw cDepsErr;

    // 6. Fetch Logs
    const { data: logs, error: logsErr } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (logsErr) throw logsErr;

    return {
      salesToday,
      depositsToday,
      customers,
      products,
      chartSales,
      chartDeps,
      logs
    };
  },

  async recordDeposit({ customerName, phone, amount, method, userEmail }) {
    // Check if customer exists
    let { data: customer, error: fetchErr } = await supabase
      .from('customers')
      .select('id, balance, name')
      .eq('phone', phone)
      .single();

    let customerId;
    if (fetchErr || !customer) {
      // Create new customer
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

    // Insert deposit
    const { error: depErr } = await supabase
      .from('deposits')
      .insert([{
        customer_id: customerId,
        amount: parseFloat(amount),
        payment_method: method,
        recorded_by: userEmail,
        notes: 'Direct Deposit'
      }]);
    if (depErr) throw depErr;

    // Log action
    await supabase.from('logs').insert([{
      user_email: userEmail,
      action: 'DEPOSIT_RECORDED',
      details: `Recorded GHS ${amount} deposit for ${customerName}`
    }]);

    return customerId;
  },

  generatePDFReport({ salesToday, depositsToday, products, bestSeller, grossMargin }) {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    doc.setFontSize(20);
    doc.text("Business Performance Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${today}`, 14, 30);

    const cashIn = (salesToday?.reduce((sum, s) => sum + (s.amount_paid || 0), 0) || 0) +
                   (depositsToday?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0);
    const revenue = salesToday?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['Today\'s Cash In', `GHS ${formatCurrency(cashIn)}`],
        ['Today\'s Revenue', `GHS ${formatCurrency(revenue)}`],
        ['Best Selling Item', bestSeller],
        ['Gross Margin', `${grossMargin}%`]
      ],
    });

    doc.save(`Report_${today.replace(/\//g, '-')}.pdf`);
  }
};
