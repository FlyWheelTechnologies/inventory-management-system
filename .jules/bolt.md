## 2024-05-15 - React Performance Optimization
**Learning:** Found heavy derived state calculations (filtering, reducing, sorting arrays) running on every render in Dashboard.jsx, which can be expensive.
**Action:** Wrapped these calculations in `useMemo` hooks with proper dependency arrays to prevent unnecessary recalculations on unrelated state changes, optimizing React component performance without sacrificing readability.
