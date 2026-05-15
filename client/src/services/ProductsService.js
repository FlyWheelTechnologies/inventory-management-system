import { supabase } from "./supabaseClient";

export const CATEGORIES = ["General", "Cement", "Iron Rods", "Plumbing", "Electrical", "Carpentry", "Masonry", "Paints", "Tools", "Roofing", "Tiles", "Sand & Stone", "Sanitary Ware", "Other"];

export const ProductsService = {
  async fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async saveProduct(product, userEmail) {
    const { id, ...productData } = product;
    let result;

    if (id) {
      result = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    // Log action
    await supabase.from('logs').insert([{
      user_email: userEmail,
      action: id ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
      details: `${id ? 'Updated' : 'Created'} product: ${productData.name}`
    }]);

    return result.data;
  },

  async deleteProduct(id, productName, userEmail) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;

    // Log action
    await supabase.from('logs').insert([{
      user_email: userEmail,
      action: 'PRODUCT_DELETED',
      details: `Deleted product: ${productName}`
    }]);
  }
};
