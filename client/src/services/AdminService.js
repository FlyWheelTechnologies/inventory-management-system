import { supabase } from "./supabaseClient";

export const AdminService = {
  async fetchUsers() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data;
  },

  async deleteUser(userId, currentUserEmail) {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;

    // Log action
    await supabase.from('logs').insert([{
      user_email: currentUserEmail,
      action: 'USER_DELETED',
      details: `Deleted user profile with ID: ${userId}`
    }]);
  },

  async saveUser(user, editingId, currentUserEmail) {
    let error;
    if (editingId) {
      const { error: updateError } = await supabase.from('profiles').update({
        full_name: user.full_name,
        role: user.role
      }).eq('id', editingId);
      error = updateError;
    } else {
      const { data, error: functionError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: user.email,
          password: user.password,
          role: user.role,
          full_name: user.full_name
        }
      });
      if (functionError) error = functionError;
      else if (data?.error) error = { message: data.error };
    }

    if (error) throw error;

    // Log action
    await supabase.from('logs').insert([{
      user_email: currentUserEmail,
      action: editingId ? 'USER_UPDATED' : 'USER_CREATED',
      details: `${editingId ? 'Updated' : 'Created'} user: ${user.email || user.full_name}`
    }]);
  }
};
