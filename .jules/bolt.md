## 2024-05-21 - Derived State Memoization in React
**Learning:** Heavy derived state calculations (e.g., sorting, reducing, or filtering large datasets like sales and products) can severely block the UI thread and cause input lag during local state updates in React if they are not memoized.
**Action:** Always wrap expensive derived calculations like aggregation and filtering inside `useMemo` hooks, specifying exactly what dependencies trigger the recalculation to avoid redundant operations on every render.
