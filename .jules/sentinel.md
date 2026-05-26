## 2024-05-26 - [Hardcoded Secrets Fallback]
**Vulnerability:** Hardcoded JWT fallback secret (`florzy_angel_secret_key`) and hardcoded default administrator password (`admin123`) were present in the source code.
**Learning:** These fallback variables were left in the codebase for ease of development/setup, but presented a critical vulnerability if deployed to production without overriding the environment variables, allowing attackers full access to the system.
**Prevention:** Always use secure dynamic fallbacks for sensitive environment variables (e.g. `crypto.randomBytes(32).toString('hex')`) so that default unconfigured states are secure by default.
