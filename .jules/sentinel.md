## 2024-06-25 - [Missing Authentication on API Endpoints]
**Vulnerability:** Core API endpoints were missing authentication checks.
**Learning:** Only some endpoints like profile update and admin user management were protected; standard business endpoints were exposed. A global middleware was needed after public routes.
**Prevention:** Apply an authentication/authorization middleware at the router level for all private endpoints.
