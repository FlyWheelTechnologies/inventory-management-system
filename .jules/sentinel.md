## 2025-02-23 - Missing Authentication on API Endpoints
**Vulnerability:** Several sensitive backend API routes (e.g., Products, Customers, Sales, Expenses) lacked authentication or authorization middleware, allowing anyone to read and modify sensitive data.
**Learning:** The `requireRole()` middleware was implemented but only applied to user management routes (`/api/users`), leaving all other data models exposed. A common oversight in Express applications is forgetting to apply authentication middleware to all non-public routes.
**Prevention:** Apply a global authentication middleware (e.g., `app.use('/api', requireRole())`) right after public/auth routes but before sensitive business logic endpoints to ensure everything is protected by default.
