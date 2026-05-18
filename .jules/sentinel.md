## 2025-02-28 - Hardcoded Secrets Removed
**Vulnerability:** Found hardcoded fallback values for `JWT_SECRET` ('florzy_angel_secret_key') and default admin password ('admin123') in `server/index.js`.
**Learning:** Using static strings as fallbacks in production allows attackers to guess/reuse secret keys or default credentials if environment variables fail to load or are forgotten.
**Prevention:** Always use dynamic cryptographic defaults (e.g. `crypto.randomBytes`) for environment variables representing secrets if they are not explicitly set.
