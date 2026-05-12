-- ==========================================
-- PRODUCTION READINESS RESET SCRIPT
-- ==========================================
-- This script will wipe all transaction data
-- and reset stock levels to 0. 
-- RUN THIS ONLY ONCE BEFORE HANDOVER!

-- 1. Truncate transaction tables (CAUTION: Unrecoverable)
TRUNCATE TABLE sale_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE sales RESTART IDENTITY CASCADE;
TRUNCATE TABLE expenses RESTART IDENTITY CASCADE;
TRUNCATE TABLE journal RESTART IDENTITY CASCADE;
TRUNCATE TABLE deposits RESTART IDENTITY CASCADE;
TRUNCATE TABLE customers RESTART IDENTITY CASCADE;
TRUNCATE TABLE system_logs RESTART IDENTITY CASCADE;

-- 2. Reset product stock to 0
-- If you want to keep current stock, comment out the line below
UPDATE products SET stock_quantity = 0;

-- 3. Reset all ID sequences (Done by CASCADE RESTART IDENTITY)

-- 4. Verify cleanup
SELECT 'RESET COMPLETE. System is now in a clean state for production.' as status;
