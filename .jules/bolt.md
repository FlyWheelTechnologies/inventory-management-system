
## 2024-05-26 - [Avoid Unnecessary Re-renders with useMemo]
 **Learning:** Large data filtering and sorting inside components without memoization causes UI blocking and lag.
 **Action:** Always wrap heavy derived state calculations (e.g., sorting, reducing, or filtering large datasets) inside `useMemo` to prevent UI thread blocking and input lag during local state updates.
