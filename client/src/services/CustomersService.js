import { supabase } from "./supabaseClient";

export const CustomersService = {
  async fetchCustomers() {
    const { data, error } = await supabase
      .from('customer_stats')
      .select('*')
      .order('name');

    if (error) {
      console.error("Error fetching from customer_stats, falling back to manual calculation:", error);
      // Fallback to manual calculation if view is missing
      const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('*, sales(total_amount, created_at, payment_status, invoice_no)')
        .order('name');

      if (custErr) throw custErr;

      return customers.map(c => ({
        ...c,
        total_spent: c.sales?.reduce((a, s) => a + parseFloat(s.total_amount || 0), 0) || 0,
        order_count: c.sales?.length || 0
      }));
    }

    return data.map(c => ({
      ...c,
      total_spent: c.total_spent || 0,
      order_count: c.transaction_count || 0
    }));
  },

  async fetchCustomerHistory(customerId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async saveCustomer(customer, userEmail) {
    const { id, total_spent, order_count, transaction_count, ...custData } = customer;
    let result;

    if (id) {
      result = await supabase
        .from('customers')
        .update(custData)
        .eq('id', id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('customers')
        .insert([{ ...custData, created_at: new Date().toISOString() }])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    // Log action
    await supabase.from('logs').insert([{
      user_email: userEmail,
      action: id ? 'CUSTOMER_UPDATED' : 'CUSTOMER_CREATED',
      details: `${id ? 'Updated' : 'Created'} customer: ${custData.name}`
    }]);

    return result.data;
  },

  async deleteCustomer(id, customerName, userEmail) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') throw new Error("Cannot delete customer with existing sales records. Try editing instead.");
      throw error;
    }

    // Log action
    await supabase.from('logs').insert([{
      user_email: userEmail,
      action: 'CUSTOMER_DELETED',
      details: `Deleted customer: ${customerName}`
    }]);
  }
};
