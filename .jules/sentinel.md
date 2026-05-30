## 2024-05-18 - [Dynamic Generation of Missing Secrets]
 **Vulnerability:** [Hardcoded secrets like `JWT_SECRET` and `admin123` password for default admin generation were present in `server/index.js`.]
 **Learning:** [Developers often use hardcoded strings as fallbacks during development, which can accidentally leak into production.]
 **Prevention:** [Use `crypto.randomBytes(n).toString('hex')` to dynamically generate secure fallbacks for sensitive environment variables. Make sure to log generated passwords so admins can still log in.]
