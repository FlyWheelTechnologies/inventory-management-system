import { supabase } from "./supabaseClient";

export const ExpensesService = {
  async fetchExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async saveExpense(expense, userEmail) {
    const payload = {
      ...expense,
      recorded_by: userEmail || 'System',
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('expenses')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Log action
    await supabase.from('logs').insert([{
      user_email: userEmail,
      action: 'EXPENSE_RECORDED',
      details: `Recorded GHS ${expense.amount} for ${expense.description}`
    }]);

    return data;
  }
};
