## 2024-05-17 - [Memoizing Dashboard Aggregations]
**Learning:** Large unmemoized aggregations (O(N) mapping, reducing, sorting) in the render path of `Dashboard.jsx` cause UI input lag. Any typing in form inputs within the component triggered a full re-render and re-computation of the stats, blocking the main thread.
**Action:** Use `useMemo` to cache the results of expensive calculations dependent on state, so re-renders (like user input) bypass the computation cost entirely.
