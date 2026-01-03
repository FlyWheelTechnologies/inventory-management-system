import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  // FETCH PRODUCTS
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setProducts(data);
    }
  };

  // ADD OR UPDATE PRODUCT
  const handleAddOrUpdateProduct = async (e) => {
    e.preventDefault();

    if (editingId) {
      await supabase
        .from("products")
        .update({ name, category, price, quantity })
        .eq("id", editingId);
    } else {
      await supabase.from("products").insert([
        {
          user_id: user.id,
          name,
          category,
          price,
          quantity,
        },
      ]);
    }

    resetForm();
    fetchProducts();
  };

  // UPDATE STOCK (+ / -)
  const updateStock = async (id, newQty) => {
    if (newQty < 0) return;

    await supabase
      .from("products")
      .update({ quantity: newQty })
      .eq("id", id);

    fetchProducts();
  };

  // DELETE PRODUCT
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  };

  const resetForm = () => {
    setName("");
    setCategory("");
    setPrice("");
    setQuantity("");
    setEditingId(null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📦 Products & Inventory</h2>

      <button onClick={() => navigate("/dashboard")}>
        ⬅ Back to Dashboard
      </button>

      <hr />

      {/* Add / Edit Form */}
      <form onSubmit={handleAddOrUpdateProduct}>
        <input
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />

        <button type="submit">
          {editingId ? "Update Product" : "Add Product"}
        </button>

        {editingId && (
          <button type="button" onClick={resetForm} style={{ marginLeft: 10 }}>
            Cancel
          </button>
        )}
      </form>

      <hr />

      {/* PRODUCT LIST */}
      {products.length === 0 && <p>No products added.</p>}

      {products.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 10,
            backgroundColor: p.quantity <= 5 ? "#ffe6e6" : "white",
          }}
        >
          <strong>{p.name}</strong>
          <br />
          Category: {p.category || "-"}
          <br />
          Price: ₹{p.price}
          <br />
          Quantity: {p.quantity}

          {p.quantity <= 5 && (
            <p style={{ color: "red" }}>⚠ Low Stock</p>
          )}

          <br />

          {/* STOCK CONTROLS */}
          <button onClick={() => updateStock(p.id, p.quantity + 1)}>
            ➕
          </button>

          <button
            onClick={() => updateStock(p.id, p.quantity - 1)}
            style={{ marginLeft: 5 }}
          >
            ➖
          </button>

          <br /><br />

          <button
            onClick={() => {
              setEditingId(p.id);
              setName(p.name);
              setCategory(p.category || "");
              setPrice(p.price);
              setQuantity(p.quantity);
            }}
          >
            Edit
          </button>

          <button
            onClick={() => handleDelete(p.id)}
            style={{ marginLeft: 10, background: "red", color: "white" }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
