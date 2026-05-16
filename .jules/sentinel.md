## 2024-05-16 - [Hardcoded Secrets and Credentials]
**Vulnerability:** Found hardcoded fallback values for `JWT_SECRET` and a hardcoded default admin password (`admin123`) in `server/index.js`.
**Learning:** These fallback values exist likely for ease of local development setup but pose a severe security risk if deployed without environment variables set, potentially giving attackers full administrative access and the ability to forge JWTs.
**Prevention:** Always use cryptographically secure random values as fallbacks (e.g., `crypto.randomBytes(64).toString('hex')`) and avoid committing any static secret values or credentials directly in the source code.
