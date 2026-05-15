const { performance } = require('perf_hooks');

// Mock db
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const dbGet = async (sql, params) => {
  await delay(1); // simulate 1ms network latency
  if (sql.includes('FROM users')) return { email: 'admin@example.com' };
  if (sql.includes('FROM products')) return { id: params[0], stock_quantity: 5, low_stock_threshold: 10 };
  return null;
};

const dbAll = async (sql, params) => {
  await delay(1); // 1 network call
  return params.map(id => ({ id, stock_quantity: 5, low_stock_threshold: 10 }));
};

const sendLowStockAlert = async () => {};

const items = Array.from({ length: 50 }).map((_, i) => ({ product_id: i }));

async function original() {
  const start = performance.now();
  if (items && items.length > 0) {
    const admin = await dbGet('SELECT email FROM users WHERE role = "admin" LIMIT 1');
    if (admin) {
      for (const item of items) {
        const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (product && product.stock_quantity < product.low_stock_threshold) {
          await sendLowStockAlert(admin.email, product);
        }
      }
    }
  }
  return performance.now() - start;
}

async function optimized() {
  const start = performance.now();
  if (items && items.length > 0) {
    const admin = await dbGet('SELECT email FROM users WHERE role = "admin" LIMIT 1');
    if (admin) {
      const productIds = items.map(item => item.product_id);
      const placeholders = productIds.map(() => '?').join(',');
      const products = await dbAll(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds);
      for (const product of products) {
        if (product.stock_quantity < product.low_stock_threshold) {
          await sendLowStockAlert(admin.email, product);
        }
      }
    }
  }
  return performance.now() - start;
}

(async () => {
  const t1 = await original();
  const t2 = await optimized();
  console.log(`Original: ${t1.toFixed(2)}ms`);
  console.log(`Optimized: ${t2.toFixed(2)}ms`);
})();
