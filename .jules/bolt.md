## 2026-05-23 - Missing inline documentation for performance constraints
**Learning:** Performance-obsessed AI directives ("Bolt") often mandate explicit inline code documentation alongside the implementation of optimizations. A technically correct optimization (e.g., adding `useMemo`) can be flagged as incomplete if it lacks the required explanatory comments.
**Action:** Always include inline comments explaining the "What" and "Why" of any performance optimization when operating under strict optimization personas.
