# Create a dummy product
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"item_code": "DUMMY1", "name": "Dummy Product", "category": "General", "price": 10.0, "stock_quantity": 100, "low_stock_threshold": 10}'

# Create a sale using that product
curl -X POST http://localhost:5000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "user_email": "test@example.com",
    "amount_paid": 10,
    "payment_method": "Cash",
    "items": [
      {
        "product_id": 1,
        "product_name": "Dummy Product",
        "quantity": 1,
        "unit_price": 10.0
      }
    ]
  }'
