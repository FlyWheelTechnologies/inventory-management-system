import { supabase } from "./supabaseClient";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from "./formatters";

export const SalesService = {
  /**
   * Generates and downloads a PDF receipt for a sale
   */
  async generateReceipt(sale) {
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

    let offset = 5;
    if (sale.tax_inclusive) {
      doc.setFontSize(7);
      doc.setFont(undefined, 'italic');
      doc.text(`(Tax Inclusive)`, 35, finalY + 3);
      offset = 8;
    }

    let amountPaidDisplay = parseFloat(sale.amount_paid);
    let balanceDueDisplay = parseFloat(sale.balance_due);
    let changeDisplay = 0;

    if (sale.notes && sale.notes.includes('Change given: GHS')) {
      const match = sale.notes.match(/Change given: GHS ([\d.]+)/);
      if (match) {
        changeDisplay = parseFloat(match[1]);
        amountPaidDisplay = parseFloat(sale.total_amount) + changeDisplay;
        balanceDueDisplay = 0;
      }
    }

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(changeDisplay > 0 ? `Amount Tendered:` : `Amount Paid:`, 35, finalY + offset);
    doc.text(`GHS ${amountPaidDisplay.toFixed(1)}`, 75, finalY + offset, { align: 'right' });

    if (changeDisplay > 0) {
      doc.text(`Change:`, 35, finalY + offset + 4);
      doc.setTextColor(5, 150, 105); // Green
      doc.text(`GHS ${changeDisplay.toFixed(1)}`, 75, finalY + offset + 4, { align: 'right' });
    } else {
      doc.text(`Balance Due:`, 35, finalY + offset + 4);
      doc.setTextColor(sale.balance_due > 0 ? 249 : 5, sale.balance_due > 0 ? 115 : 150, sale.balance_due > 0 ? 22 : 105);
      doc.text(`GHS ${balanceDueDisplay.toFixed(1)}`, 75, finalY + offset + 4, { align: 'right' });
    }

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(6);
    doc.text('powered by bookflywheel.com', 40, 146, { align: 'center' });

    doc.save(`Receipt_INV_${String(sale.invoice_no || sale.id).slice(-6).padStart(3, '0')}.pdf`);
  },

  /**
   * Shares a sale receipt via WhatsApp
   */
  async shareViaWhatsApp(sale, options = {}) {
    if (!sale) return;

    const { customerPhone, customerName, customers = [] } = options;

    // Fetch items for this sale
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id);

    if (itemsError) {
      console.error("Error fetching sale items for WhatsApp:", itemsError);
    }

    const customer = customers.find(c => c.id === sale.customer_id);
    let phone = customer?.phone || (sale.customer_name === customerName ? customerPhone : '');

    // Fallback/Format phone
    if (phone && phone.startsWith('0')) phone = '+233' + phone.substring(1);
    if (phone && !phone.startsWith('+')) phone = '+233' + phone;

    if (!phone || phone === '+233') {
      throw new Error("No phone number available for this customer.");
    }

    const invoiceNo = `INV-${String(sale.invoice_no || sale.id || '000').slice(-6).padStart(3, '0')}`;
    const date = new Date(sale.created_at || new Date()).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const divider = "================================";
    const thinDivider = "--------------------------------";

    // Format items list
    let itemsList = "";
    if (saleItems && saleItems.length > 0) {
      itemsList = `*ITEMS PURCHASED:*\n`;
      saleItems.forEach(item => {
        itemsList += `• ${item.product_name} (x${item.quantity}) - GHS ${formatCurrency(item.subtotal)}\n`;
      });
      itemsList += `\n`;
    }

    let amountPaidDisplay = parseFloat(sale.amount_paid);
    let balanceDueDisplay = parseFloat(sale.balance_due);
    let changeDisplay = 0;

    if (sale.notes && sale.notes.includes('Change given: GHS')) {
      const match = sale.notes.match(/Change given: GHS ([\d.]+)/);
      if (match) {
        changeDisplay = parseFloat(match[1]);
        amountPaidDisplay = parseFloat(sale.total_amount) + changeDisplay;
        balanceDueDisplay = 0;
      }
    }

    const message =
      `*FLORZYANGEL ENTERPRISE*\n` +
      `${divider}\n` +
      `*OFFICIAL RECEIPT*\n` +
      `${divider}\n\n` +
      `*CUSTOMER:* ${sale.customer_name}\n` +
      `*INVOICE:* #${invoiceNo}\n` +
      `*DATE:* ${date}\n\n` +
      itemsList +
      `${thinDivider}\n` +
      `*FINANCIAL SUMMARY*\n` +
      `${thinDivider}\n` +
      `*Total Amount:* GHS ${formatCurrency(sale.total_amount)}${sale.tax_inclusive ? ' _(Tax Inclusive)_' : ''}\n` +
      `${changeDisplay > 0 ? `*Amount Tendered:* GHS ${formatCurrency(amountPaidDisplay)}\n*Change:*          GHS ${formatCurrency(changeDisplay)}` : `*Amount Paid:*  GHS ${formatCurrency(amountPaidDisplay)}\n*Balance Due:*  GHS ${formatCurrency(balanceDueDisplay)}`}\n` +
      `${thinDivider}\n\n` +
      `*Thank you for your business!*\n` +
      `*Hope to see you again soon!*`;

    const waUrl = `https://wa.me/${phone.replace(/\s+/g, '').replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  },

  /**
   * Exports sales data to CSV
   */
  exportToCSV(sales) {
    const headers = ["Invoice #", "Date", "Customer", "Total Amount", "Amount Paid", "Balance", "Status", "Method", "Recorded By"];
    const rows = sales.map(s => [
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
  },

  /**
   * Records a sale transaction via Supabase RPC
   */
  async recordSaleTransaction(params) {
    const { data, error } = await supabase.rpc('record_sale_transaction', params);
    if (error) throw error;
    return data;
  }
};
