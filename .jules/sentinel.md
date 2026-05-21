## 2026-05-21 - Replaced Hardcoded Secrets in server/index.js
**Vulnerability:** The application was using hardcoded strings for `JWT_SECRET` and the default admin password.
**Learning:** Hardcoded secrets in source code present a significant security risk, as anyone with access to the codebase can potentially compromise the system.
**Prevention:** Always use environment variables for sensitive configuration, and implement secure cryptographic fallbacks (e.g., using Node's `crypto` module) when defaults are strictly necessary.
