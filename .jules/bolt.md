## 2024-05-15 - [Dashboard Render Cycle]
**Learning:** High-frequency intervals (like a 1s clock for a static greeting) placed at the root of a heavy component cause massive frontend bottlenecks because they force the entire component tree (including expensive charts, `.sort()` operations, and tables) to re-render.
**Action:** Always avoid `setInterval` for slow-changing UI elements. When dynamic clocks or intervals are truly needed, encapsulate them into their own small, isolated component (`<Clock />`) to limit the scope of re-renders, rather than placing them at the page root level.
