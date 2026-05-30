
## 2024-05-31 - O(N) Time-Series Pre-Aggregation in Dashboard
**Learning:** The dashboard previously calculated time-series metrics (revenue and expenses over time) using nested loops: iterating over each date interval and running `Array.prototype.filter().reduce()` over the entire dataset for every date. This causes O(M*N) complexity, creating significant performance bottlenecks on the main thread as datasets grow.
**Action:** Always pre-aggregate datasets into `Map` objects (dictionaries) in a single O(N) pass before mapping over the time intervals. Look up values from the map in O(1) time within the loop instead of scanning the full array.
