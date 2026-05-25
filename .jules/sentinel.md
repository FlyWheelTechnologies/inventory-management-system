## 2025-02-14 - Removed Hardcoded Secrets
**Vulnerability:** Found hardcoded JWT_SECRET ('florzy_angel_secret_key') and default admin password ('admin123') in server/index.js.
**Learning:** Hardcoded secrets and fallback passwords committed to version control can lead to system compromise and session hijacking.
**Prevention:** Use environment variables for secrets. If a fallback is needed for testing/initialization, generate a dynamic value using `crypto.randomBytes()` and log it securely instead of hardcoding strings.
