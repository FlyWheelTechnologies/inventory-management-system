# Create a dummy product for duplicates
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"item_code": "DUMMY2", "name": "Dummy Product 2", "category": "General", "price": 10.0, "stock_quantity": 100, "low_stock_threshold": 10}'

# Create a sale using that product with duplicates
curl -X POST http://localhost:5000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "user_email": "test@example.com",
    "amount_paid": 20,
    "payment_method": "Cash",
    "items": [
      {
        "product_id": 9,
        "product_name": "Dummy Product 2",
        "quantity": 1,
        "unit_price": 10.0
      },
      {
        "product_id": 9,
        "product_name": "Dummy Product 2",
        "quantity": 1,
        "unit_price": 10.0
      }
    ]
  }'

echo -e "\nFetching stock for product 9..."
curl http://localhost:5000/api/products | grep "DUMMY2"
