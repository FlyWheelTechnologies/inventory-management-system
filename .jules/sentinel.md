## YYYY-MM-DD - Hardcoded Secrets in Source Code
**Vulnerability:** JWT secret (`'florzy_angel_secret_key'`) and default admin password (`'admin123'`) are hardcoded in `server/index.js`.
**Learning:** Default configuration values are sometimes left as insecure fallbacks if environment variables are missing. This risks exposing the JWT secret and admin account to anyone with source code access.
**Prevention:** Use dynamic, securely generated cryptographic fallbacks via Node's `crypto` module when required environment variables are absent.
