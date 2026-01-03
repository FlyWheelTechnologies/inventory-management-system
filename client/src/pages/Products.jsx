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

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    setProducts(data || []);
  };

  const handleAddOrUpdateProduct = async (e) => {
    e.preventDefault();

    if (editingId) {
      await supabase
        .from("products")
        .update({ name, category, price, quantity })
        .eq("id", editingId);
    } else {
      await supabase.from("products").insert([
        { user_id: user.id, name, category, price, quantity },
      ]);
    }

    resetForm();
    fetchProducts();
  };

  const updateStock = async (id, newQty) => {
    if (newQty < 0) return;
    await supabase.from("products").update({ quantity: newQty }).eq("id", id);
    fetchProducts();
  };

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
    <>
      <style>{`
        * {
          box-sizing: border-box;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .products-container {
          min-height: 100vh;
          background: #f4f6fb;
          padding: 30px;
        }

        .products-card {
          max-width: 1000px;
          margin: auto;
          background: #fff;
          padding: 25px;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header h2 {
          margin: 0;
        }

        .back-btn {
          background: #667eea;
          color: #fff;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
        }

        .product-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .product-form input {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ccc;
        }

        .product-form button {
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: #667eea;
          color: #fff;
          font-weight: bold;
          cursor: pointer;
        }

        .cancel-btn {
          background: #999 !important;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 30px;
        }

        .product-item {
          padding: 15px;
          border-radius: 10px;
          background: #fff;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          border-left: 6px solid #667eea;
        }

        .low-stock {
          border-left-color: red;
          background: #fff5f5;
        }

        .product-item h4 {
          margin: 0 0 5px;
        }

        .stock-controls button {
          margin-right: 5px;
          padding: 6px 10px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .edit-btn {
          background: #38a169;
          color: #fff;
        }

        .delete-btn {
          background: #e53e3e;
          color: #fff;
          margin-left: 5px;
        }

        .stock-warning {
          color: red;
          font-weight: bold;
          font-size: 13px;
        }
      `}</style>

      <div className="products-container">
        <div className="products-card">
          <div className="header">
            <h2>📦 Products & Inventory</h2>
            <button className="back-btn" onClick={() => navigate("/dashboard")}>
              ⬅ Dashboard
            </button>
          </div>

          {/* FORM */}
          <form className="product-form" onSubmit={handleAddOrUpdateProduct}>
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
              <button
                type="button"
                className="cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </form>

          {/* PRODUCTS */}
          <div className="products-grid">
            {products.length === 0 && <p>No products added.</p>}

            {products.map((p) => (
              <div
                key={p.id}
                className={`product-item ${
                  p.quantity <= 5 ? "low-stock" : ""
                }`}
              >
                <h4>{p.name}</h4>
                <p>Category: {p.category || "-"}</p>
                <p>Price: ₹{p.price}</p>
                <p>Quantity: {p.quantity}</p>

                {p.quantity <= 5 && (
                  <p className="stock-warning">⚠ Low Stock</p>
                )}

                <div className="stock-controls">
                  <button onClick={() => updateStock(p.id, p.quantity + 1)}>
                    ➕
                  </button>
                  <button onClick={() => updateStock(p.id, p.quantity - 1)}>
                    ➖
                  </button>
                </div>

                <br />

                <button
                  className="edit-btn"
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
                  className="delete-btn"
                  onClick={() => handleDelete(p.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
