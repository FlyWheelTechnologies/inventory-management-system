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

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id);

    setProducts(data || []);
  };

  const fetchSales = async () => {
    const { data } = await supabase
      .from("sales")
      .select(
        `id, quantity, price, created_at, products(name)`
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setSales(data || []);
  };

  const handleSale = async (e) => {
    e.preventDefault();

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (quantity > product.quantity) {
      alert("Not enough stock!");
      return;
    }

    await supabase.from("sales").insert([
      {
        user_id: user.id,
        product_id: product.id,
        quantity,
        price: product.price,
      },
    ]);

    await supabase
      .from("products")
      .update({ quantity: product.quantity - quantity })
      .eq("id", product.id);

    setQuantity("");
    setProductId("");

    fetchProducts();
    fetchSales();
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .sales-container {
          min-height: 100vh;
          background: #f4f6fb;
          padding: 30px;
        }

        .sales-card {
          max-width: 1100px;
          margin: auto;
          background: #fff;
          padding: 25px;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .sales-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .back-btn {
          background: #667eea;
          color: #fff;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
        }

        .sales-form {
          display: flex;
          gap: 10px;
          margin: 20px 0;
          flex-wrap: wrap;
        }

        .sales-form select,
        .sales-form input {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ccc;
          min-width: 180px;
        }

        .sales-form button {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: #667eea;
          color: #fff;
          font-weight: bold;
          cursor: pointer;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        th, td {
          padding: 12px;
          text-align: center;
        }

        thead {
          background: #edf2ff;
        }

        tbody tr:nth-child(even) {
          background: #f9f9f9;
        }

        .total {
          font-weight: bold;
        }
      `}</style>

      <div className="sales-container">
        <div className="sales-card">
          <div className="sales-header">
            <h2>💰 Sales & Orders</h2>
            <button className="back-btn" onClick={() => navigate("/dashboard")}>
              ⬅ Dashboard
            </button>
          </div>

          {/* SALE FORM */}
          <form className="sales-form" onSubmit={handleSale}>
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

          {/* SALES HISTORY */}
          <h3>📊 Sales History</h3>

          {sales.length === 0 ? (
            <p>No sales yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price (₹)</th>
                  <th>Total (₹)</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.products?.name}</td>
                    <td>{s.quantity}</td>
                    <td>{s.price}</td>
                    <td className="total">{s.quantity * s.price}</td>
                    <td>
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
