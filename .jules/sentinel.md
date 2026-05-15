## 2024-05-15 - [CRITICAL] Fixed Hardcoded Secrets in Node/Express Backend

**Vulnerability:** The application contained hardcoded secrets in `server/index.js`, specifically a fallback JWT secret (`'florzy_angel_secret_key'`) and a default admin password (`'admin123'`).

**Learning:** Hardcoding secrets like these provides a false sense of security. If an attacker gains access to the source code, they can immediately compromise the system by forging JWT tokens or logging into the default administrative account. Fallback values must also be secure.

**Prevention:**
1. Always mandate secrets to be loaded from environment variables (e.g., `process.env.JWT_SECRET`).
2. If a secret is missing and the application must start, dynamically generate a cryptographically strong random value (e.g., using `crypto.randomBytes(32).toString('hex')`) instead of falling back to a static string.
3. For default administrative accounts, either force the user to provide an initial password via the environment, or generate a random password, log it securely to the console on startup, and require an immediate password change.