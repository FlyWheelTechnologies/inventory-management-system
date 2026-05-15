import { supabase } from "./supabaseClient";

export const JournalEntriesService = {
  async fetchJournalEntries() {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async fetchFinancialReport(date, mode) {
    // Mode can be 'Daily', 'Monthly', 'AllTime'
    // This could be a Supabase RPC call for more efficiency,
    // but here we might simulate based on fetched data
  },

  getAccountColor(type) {
    const t = type?.toUpperCase();
    if (t === 'REVENUE' || t === 'CASH_IN' || t === 'CASH') return { bg: '#ecfdf5', text: '#059669' };
    if (t === 'EXPENSE' || t === 'TAX_PAYABLE') return { bg: '#fef2f2', text: '#ef4444' };
    if (t === 'ACCOUNTS_RECEIVABLE' || t === 'DEBT') return { bg: '#fff7ed', text: '#f97316' };
    if (t === 'MOMO' || t === 'BANK' || t === 'CHECKING') return { bg: '#eff6ff', text: '#2563eb' };
    if (t === 'CUSTOMER_DEPOSIT' || t === 'INTEREST') return { bg: '#f5f3ff', text: '#7c3aed' };
    return { bg: '#f3f4f6', text: '#6b7280' };
  },

  exportToCSV(data, filename) {
    const headers = ["Date", "Account", "Debit", "Credit", "Description"];
    const rows = data.map(j => [
      new Date(j.created_at).toLocaleString(),
      j.account_type,
      j.debit?.toFixed(2),
      j.credit?.toFixed(2),
      `"${j.description?.replace(/"/g, '""') || ''}"`
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.body.appendChild(document.createElement("a"));
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    document.body.removeChild(link);
  }
};
