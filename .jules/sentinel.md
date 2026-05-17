
## 2025-05-17 - Removed hardcoded cryptographic secrets and credentials
**Vulnerability:** Found hardcoded fallback values for `JWT_SECRET` (`'florzy_angel_secret_key'`) and default admin password (`'admin123'`) in `server/index.js`.
**Learning:** Hardcoded cryptographic secrets allow trivial token forgery and unauthorized access. Hardcoded passwords bypass intended authentication security, even for default users.
**Prevention:** Use dynamic cryptographic fallbacks (e.g. `crypto.randomBytes`) for environment variables like `JWT_SECRET` and generate secure, random initial passwords for default administrative accounts when explicitly omitted from environment configuration.
