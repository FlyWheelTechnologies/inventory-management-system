
## 2025-05-18 - Memoize Expensive Derived State
**Learning:** React page components handling significant datasets (e.g., `products`, `sales` arrays in `client/src/pages/Dashboard.jsx`) frequently re-calculate expensive derived arrays on every render (including minor local state changes like a toast message or typing in an unrelated modal form). This causes input lag and UI thread blocking.
**Action:** Always wrap heavy derived state calculations (e.g., filtering, sorting, or reducing large datasets) inside `useMemo` hooks with specific dependency arrays to prevent unnecessary recalculations on local state updates.
