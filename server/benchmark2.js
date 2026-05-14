const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'test_bench2.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new sqlite3.Database(dbPath);

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
});

async function setup() {
  await dbRun(`CREATE TABLE sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    quantity INTEGER,
    unit_price REAL,
    subtotal REAL
  )`);

  await dbRun(`CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_quantity INTEGER
  )`);

  const numItems = 1000;
  for (let i = 1; i <= numItems; i++) {
    await dbRun('INSERT INTO products (id, stock_quantity) VALUES (?, ?)', [i, 10000]);
  }
}

async function runBenchmarkBaseline(numItems) {
  const saleId = 1;
  const items = Array.from({length: numItems}, (_, i) => ({
    product_id: i + 1,
    product_name: `Product ${i}`,
    quantity: 1,
    unit_price: 10.0
  }));

  const start = process.hrtime.bigint();

  if (items && items.length > 0) {
    for (const item of items) {
      const subtotal = item.quantity * item.unit_price;
      await dbRun('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?,?,?,?,?,?)',
        [saleId, item.product_id, item.product_name, item.quantity, item.unit_price, subtotal]);
      // Deduct stock
      await dbRun('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
    }
  }

  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

async function runBenchmarkSingleQuery(numItems) {
  const saleId = 1;
  const items = Array.from({length: numItems}, (_, i) => ({
    product_id: i + 1,
    product_name: `Product ${i}`,
    quantity: 1,
    unit_price: 10.0
  }));

  const start = process.hrtime.bigint();

  if (items && items.length > 0) {
    // Single insert via batch string
    const insertPlaceholders = items.map(() => '(?,?,?,?,?,?)').join(',');
    const insertParams = [];
    for (const item of items) {
      insertParams.push(saleId, item.product_id, item.product_name, item.quantity, item.unit_price, item.quantity * item.unit_price);
    }
    await dbRun(`INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES ${insertPlaceholders}`, insertParams);

    // Single update via CASE statement
    let caseSql = 'UPDATE products SET stock_quantity = stock_quantity - CASE id ';
    const updateParams = [];
    const ids = [];
    for (const item of items) {
      caseSql += 'WHEN ? THEN ? ';
      updateParams.push(item.product_id, item.quantity);
      ids.push(item.product_id);
    }
    caseSql += 'ELSE 0 END WHERE id IN (' + ids.map(() => '?').join(',') + ')';
    updateParams.push(...ids);

    await dbRun(caseSql, updateParams);
  }

  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

async function main() {
  await setup();
  console.log("Setup complete");

  const numItems = 100;

  console.log(`\nBenchmarking ${numItems} items...`);

  // Warmup
  await runBenchmarkBaseline(10);

  // Baseline
  const baseTimes = [];
  for(let i=0; i<3; i++) baseTimes.push(await runBenchmarkBaseline(numItems));
  const baseAvg = baseTimes.reduce((a,b)=>a+b,0)/3;
  console.log(`Baseline Average: ${baseAvg.toFixed(2)} ms`);

  // Warmup
  await runBenchmarkSingleQuery(10);

  // Single Query
  const optTimes = [];
  for(let i=0; i<3; i++) optTimes.push(await runBenchmarkSingleQuery(numItems));
  const optAvg = optTimes.reduce((a,b)=>a+b,0)/3;
  console.log(`Single Query Average: ${optAvg.toFixed(2)} ms`);

  console.log(`\nImprovement: ${((baseAvg - optAvg) / baseAvg * 100).toFixed(2)}%`);
}

main().catch(console.error);
