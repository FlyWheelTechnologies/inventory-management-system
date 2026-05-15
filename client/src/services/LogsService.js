import { supabase } from "./supabaseClient";

export const LogsService = {
  async fetchLogs(limit = 100) {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  subscribeToLogs(onInsert) {
    return supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, (payload) => {
        onInsert(payload.new);
      })
      .subscribe();
  },

  getActionColor(action) {
    if (action.includes('SALE')) return '#22c55e';
    if (action.includes('PRODUCT')) return '#2563eb';
    if (action.includes('STOCK')) return '#f59e0b';
    if (action.includes('USER')) return '#7c3aed';
    if (action.includes('DELETE')) return '#ef4444';
    return '#6b7280';
  }
};
