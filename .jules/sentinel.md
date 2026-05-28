## 2024-03-24 - [Unprotected Endpoints]
**Vulnerability:** Several critical API endpoints (`/api/products`, `/api/customers`, `/api/sales`, `/api/expenses`, etc.) are missing authentication/authorization middleware (`requireRole`). This allows any unauthenticated user to access, create, update, or delete sensitive data.
**Learning:** When adding new endpoints, middleware can easily be forgotten if not applied globally or to a specific router.
**Prevention:** Apply an authentication middleware at the router level for all protected routes, or ensure every protected route explicitly includes the middleware.
