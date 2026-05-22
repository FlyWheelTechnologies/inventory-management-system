## 2024-05-22 - Hardcoded Secrets & Missing Authentication Middleware

**Vulnerability:** Core API routes (`/api/products`, `/api/sales`, `/api/customers`, etc.) lacked authentication middleware, creating an authorization bypass. Additionally, the backend used weak, hardcoded fallbacks for `JWT_SECRET` and the default admin password.
**Learning:** Development defaults often leak into production when dynamic cryptographic fallbacks are missing. Similarly, global API authorization rules should be applied structurally (e.g. via an `app.use()` rule for all restricted routes) rather than relying on per-route middleware, which is prone to omission.
**Prevention:** Use `crypto.randomBytes().toString('hex')` for fallback secrets instead of hardcoded strings to ensure unique generation on startup. Implement blanket authentication mechanisms for core `/api` paths after public auth paths, rather than attaching them to every individual route.
