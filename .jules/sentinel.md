## 2025-05-27 - Hardcoded Cryptographic Keys and Admin Passwords
**Vulnerability:** Hardcoded `JWT_SECRET` string and a default hardcoded admin password (`admin123`) were used as fallbacks when environment variables were not present.
**Learning:** These were left in place likely for convenience during local development, but they present a massive security risk in a production or deployed environment where they could be exploited if an administrator neglects to explicitly set the configuration environment variables.
**Prevention:** Use Node's built-in `crypto` module (e.g., `crypto.randomBytes(32).toString('hex')`) to dynamically generate secure, unpredictable fallbacks at runtime so deployments remain secure by default even if not manually configured.
