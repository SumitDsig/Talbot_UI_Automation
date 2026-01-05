# Setup Guide for Gmail OAuth Integration

This guide explains how to set up the Gmail OAuth credentials required for the forgot password flow tests.

## Prerequisites

1. A Google Cloud Project with Gmail API enabled
2. OAuth 2.0 credentials configured

## Setup Steps

### 1. Create Google Cloud Project and Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Desktop app" as the application type
4. Name it (e.g., "Gmail OAuth Client")
5. Click "Create"
6. Download the credentials JSON file

### 3. Configure Credentials

1. Copy the downloaded credentials JSON file to `utils/credentials.json`
   ```bash
   cp /path/to/downloaded/credentials.json utils/credentials.json
   ```

2. Alternatively, copy `utils/credentials.json.example` to `utils/credentials.json` and fill in your values:
   ```bash
   cp utils/credentials.json.example utils/credentials.json
   ```

### 4. Generate Token

The first time you run the tests, you'll need to authorize the application:

1. Run the authorization script:
   ```bash
   node scripts/authorizeGmail.js
   ```

2. Follow the prompts:
   - A URL will be displayed - open it in your browser
   - Sign in with your Google account
   - Grant permissions
   - Copy the authorization code
   - Paste it in the terminal

3. The `token.json` file will be automatically created

### 5. Environment Variables (Optional)

For the test email addresses, you can set environment variables:

```bash
# Windows (PowerShell)
$env:TEST_EMAIL="your-test-email@gmail.com"
$env:SENDER_EMAIL="admin@yourdomain.com"

# Windows (CMD)
set TEST_EMAIL=your-test-email@gmail.com
set SENDER_EMAIL=admin@yourdomain.com

# Linux/Mac
export TEST_EMAIL="your-test-email@gmail.com"
export SENDER_EMAIL="admin@yourdomain.com"
```

Or create a `.env` file (make sure it's in `.gitignore`):
```
TEST_EMAIL=your-test-email@gmail.com
SENDER_EMAIL=admin@yourdomain.com
```

## File Structure

```
├── utils/
│   ├── credentials.json          # ⚠️ DO NOT COMMIT - Your OAuth credentials
│   ├── credentials.json.example  # ✅ Template file (safe to commit)
│   └── gmailHelper.js            # ✅ Helper functions (safe to commit)
├── token.json                    # ⚠️ DO NOT COMMIT - Your OAuth token
├── token.json.example            # ✅ Template file (safe to commit)
└── .gitignore                    # ✅ Ensures sensitive files aren't committed
```

## Security Notes

⚠️ **IMPORTANT**: Never commit the following files:
- `token.json`
- `utils/credentials.json`
- `authState.json`
- Any `.env` files

These files contain sensitive authentication information and are automatically excluded via `.gitignore`.

## Troubleshooting

### Token Expired
If you get authentication errors, regenerate the token:
```bash
node scripts/authorizeGmail.js
```

### Gmail API Not Enabled
Make sure the Gmail API is enabled in your Google Cloud Project.

### Permission Denied
Ensure your OAuth client has the correct scopes:
- `https://www.googleapis.com/auth/gmail.readonly`

## References

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)

