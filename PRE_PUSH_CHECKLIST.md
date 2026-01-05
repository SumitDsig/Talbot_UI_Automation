# Pre-Push Checklist

Before pushing to the public repository, verify the following:

## ✅ Security Checks

1. **Verify sensitive files are NOT tracked by git:**
   ```bash
   git status
   ```
   - `token.json` should NOT appear in the list
   - `utils/credentials.json` should NOT appear in the list
   - `authState.json` should NOT appear in the list

2. **Verify files are ignored:**
   ```bash
   git check-ignore token.json utils/credentials.json
   ```
   - Both files should be listed (confirms they're ignored)

3. **Check what will be committed:**
   ```bash
   git status --short
   ```
   - Review the list - ensure no sensitive files are included

## ✅ Files Safe to Commit

The following files are safe to commit:
- ✅ `tests/TC01_login.spec.js` (uses environment variables now)
- ✅ `utils/gmailHelper.js` (code only, no credentials)
- ✅ `utils/credentials.json.example` (template file)
- ✅ `token.json.example` (template file)
- ✅ `.gitignore` (updated to exclude sensitive files)
- ✅ `SETUP.md` (documentation)

## ✅ Before Pushing

1. **Review your changes:**
   ```bash
   git diff
   ```

2. **Check for any hardcoded credentials:**
   - Search for email addresses, passwords, API keys
   - Ensure all sensitive data uses environment variables

3. **Test locally:**
   - Make sure tests still work with environment variables
   - Verify `.gitignore` is working correctly

## 🚀 Ready to Push

Once verified, you can safely push:
```bash
git add .
git commit -m "Add forgot password flow test with Gmail OAuth integration"
git push
```

## ⚠️ If Sensitive Files Were Already Committed

If `token.json` or `credentials.json` were previously committed:

1. **Remove from git history:**
   ```bash
   git rm --cached token.json
   git rm --cached utils/credentials.json
   git commit -m "Remove sensitive files from tracking"
   ```

2. **If already pushed, you need to:**
   - Rotate/regenerate all credentials immediately
   - Consider using `git filter-branch` or BFG Repo-Cleaner to remove from history
   - Force push (coordinate with team first!)

## 📝 Environment Variables Setup

Make sure to document required environment variables in your README or SETUP.md:
- `TEST_EMAIL` - Email address for testing forgot password flow
- `SENDER_EMAIL` - Email address that sends OTP emails
- `LOGIN_USERNAME` - Valid login username
- `LOGIN_PASSWORD` - Valid login password

