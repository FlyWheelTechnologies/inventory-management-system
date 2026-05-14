# Create a dummy product for duplicates
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"item_code": "DUMMY3", "name": "Dummy Product 3", "category": "General", "price": 10.0, "stock_quantity": 100, "low_stock_threshold": 10}'

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
        "product_id": 11,
        "product_name": "Dummy Product 3",
        "quantity": 2,
        "unit_price": 10.0
      },
      {
        "product_id": 11,
        "product_name": "Dummy Product 3",
        "quantity": 3,
        "unit_price": 10.0
      }
    ]
  }'

echo -e "\nFetching stock for product 11..."
curl http://localhost:5000/api/products | grep '"id":11'
