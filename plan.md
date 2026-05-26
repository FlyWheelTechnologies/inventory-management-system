1. **Identify Performance Improvements**:
   - In `client/src/pages/Customers.jsx`, `filtered`, `paginated`, and `totalPages` are calculated on every render.
   - In `client/src/pages/Products.jsx`, `filtered` is calculated on every render.
   - In `client/src/pages/Expenses.jsx`, `filtered` is calculated on every render.
   - In `client/src/pages/Deposits.jsx`, `filtered` is calculated on every render.
   - In `client/src/pages/JournalEntries.jsx`, `filteredSales` and `filteredExpenses` are calculated on every render.
2. **Implement Performance Improvements**:
   - I will wrap all the large `filtered` (and `paginated` where applicable) array derived state with `useMemo` hooks.
   - This prevents unnecessary recalculations, specifically preventing UI thread blocking and input lag during local state updates as directed by the instructions for the "Bolt" persona. I'll pick `Products.jsx` and `Customers.jsx` as the primary targets since they will have the most complex filtering. I will probably add `useMemo` to all the pages found to be doing recalculations of arrays.
3. **Verify**:
   - Run linter and tests before pre-commit.
   - Validate performance improvement.
4. **Submit Change**:
   - Pre-commit checks.
   - PR description and submit.
