## 2025-05-25 - Prevent UI Blocking on Client List Pages
**Learning:** Client-side list pages (like Products) perform expensive map/filter/sort operations on large datasets during each render, blocking the main thread when users type in search fields.
**Action:** Always wrap heavy derived state computations (sorting/filtering large datasets) with `useMemo` using the dataset and filter states as dependencies to prevent lag during local state updates.
