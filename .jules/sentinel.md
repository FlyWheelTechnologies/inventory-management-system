## 2024-05-18 - Hardcoded Secrets

**Vulnerability:**
The server was using a hardcoded `JWT_SECRET` string ('florzy_angel_secret_key') and a hardcoded default admin password ('admin123') in `server/index.js`.

**Learning:**
Hardcoding secrets makes them easily accessible to anyone with access to the source code, rendering the encryption/hashing essentially useless if an attacker compromises the codebase. Fallbacks should be dynamically generated.

**Prevention:**
Always use a secure random byte generator (e.g. `crypto.randomBytes(32).toString('hex')`) for default fallback values of sensitive variables. Never hardcode secrets. Ensure that auto-generated credentials required for initial setup are securely logged so administrators can actually access the system.
