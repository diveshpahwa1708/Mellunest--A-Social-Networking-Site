# Verification

The reorganized source passed TypeScript checking, a production build and 10 isolated API checks on Linux. The API checks cover local database initialization, signup, session persistence, multiple accounts, posts, anonymous access rejection, forged platform-header rejection, password validation, logout and login.

The launcher is written in Node.js without Bash or PowerShell syntax. It invokes npm using the current Node executable and npm CLI path, for Windows/Linux/macOS compatibility. Windows and macOS have not been executed in this environment.

Manual checks on your laptop:
- Run npm start from the folder containing package.json.
- Create an account, upload a photo and save a draft.
- Restart the app and verify persistence.
- Use a separate browser profile for a second account; test chat and follows.
- Verify logout and account deletion return to the login page.
- Test keyboard navigation and mobile layouts.

Do not put real personal credentials into demonstration screenshots or source control.

One-command startup was also tested with node_modules absent (installation used the available package cache), followed by local migrations and server startup. A second launch reused dependencies. HTTP health returned 200, signup returned 201 and the returned session identified the created test user. Only the local test database was used; it is excluded from this export.
