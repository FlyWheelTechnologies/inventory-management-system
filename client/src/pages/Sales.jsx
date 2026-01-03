import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Sales() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  // FETCH PRODUCTS
  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id);

    setProducts(data || []);
  };

  // FETCH SALES HISTORY
  const fetchSales = async () => {
    const { data } = await supabase
      .from("sales")
      .select(`
        id,
        quantity,
        price,
        created_at,
        products(name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setSales(data || []);
  };

  // RECORD SALE
  const handleSale = async (e) => {
    e.preventDefault();

    const product = products.find((p) => p.id === productId);

    if (!product) return;

    if (quantity > product.quantity) {
      alert("Not enough stock!");
      return;
    }

    // 1. Insert sale
    await supabase.from("sales").insert([
      {
        user_id: user.id,
        product_id: product.id,
        quantity,
        price: product.price,
      },
    ]);

    // 2. Update product stock
    await supabase
      .from("products")
      .update({
        quantity: product.quantity - quantity,
      })
      .eq("id", product.id);

    setQuantity("");
    setProductId("");

    fetchProducts();
    fetchSales();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Sales & Orders</h2>

      <button onClick={() => navigate("/dashboard")}>
        ⬅ Back to Dashboard
      </button>

      <hr />

      {/* SALE FORM */}
      <form onSubmit={handleSale}>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (Stock: {p.quantity})
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />

        <button type="submit">Record Sale</button>
      </form>

      <hr />

      {/* SALES HISTORY */}
      <h3>Sales History</h3>

      {sales.length === 0 && <p>No sales yet.</p>}

      {sales.map((s) => (
        <div key={s.id} style={{ marginBottom: "10px" }}>
          <strong>{s.products?.name}</strong> — Qty: {s.quantity} — ₹{s.price}
          <br />
          <small>{new Date(s.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
