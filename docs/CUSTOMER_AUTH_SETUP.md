# Customer Authentication Setup Guide

## Quick Start

### 1. Environment Variables

Add these to your `.env` file:

```env
# JWT Secrets (Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ACCESS_TOKEN_SECRET=your-access-token-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-token-secret-min-32-chars

# OAuth - Google (Optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# OAuth - Facebook (Optional)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# Application
NODE_ENV=development
DOMAIN=http://localhost:3000
```

### 2. Generate JWT Secrets

Run this command to generate secure secrets:

```bash
node -e "console.log('ACCESS_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Schema

The Customer model has been updated with OAuth fields:

-   `providerType` - 'email', 'google', 'facebook'
-   `emailVerified` - Boolean for email verification status
-   `avatar` - Profile picture URL from OAuth or custom upload

Run to sync the database:

```bash
cd api
npm run prisma:push
# or if using migrations:
npx prisma migrate dev
```

### 4. Test the API

**Register a customer:**

```bash
curl -X POST http://localhost:3000/customer/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'
```

**Login:**

```bash
curl -X POST http://localhost:3000/customer/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }' \
  -c cookies.txt
```

**Get Profile (use token from login response):**

```bash
curl -X GET http://localhost:3000/customer/auth/profile \
  -H "Authorization: Bearer <your-access-token>"
```

---

## OAuth Setup (Optional)

### Google OAuth

1. **Go to Google Cloud Console**

    - Visit: https://console.cloud.google.com/
    - Create a new project (or select existing)

2. **Enable Google+ API**

    - Navigate to "APIs & Services" → "Library"
    - Search for "Google+ API" and enable it

3. **Create OAuth Credentials**

    - Go to "APIs & Services" → "Credentials"
    - Click "Create Credentials" → "OAuth client ID"
    - Application type: "Web application"
    - Add authorized redirect URI:
        - Development: `http://localhost:3000/auth/google/callback`
        - Production: `https://yourdomain.com/auth/google/callback`

4. **Copy Credentials to .env**
    ```env
    GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your-client-secret
    ```

### Facebook OAuth

1. **Go to Facebook Developers**

    - Visit: https://developers.facebook.com/
    - Create a new app or select existing

2. **Add Facebook Login Product**

    - In app dashboard, click "Add Product"
    - Select "Facebook Login" → "Set Up"

3. **Configure OAuth Redirect URIs**

    - Go to Facebook Login → Settings
    - Add Valid OAuth Redirect URIs:
        - Development: `http://localhost:3000/auth/facebook/callback`
        - Production: `https://yourdomain.com/auth/facebook/callback`

4. **Copy Credentials to .env**
    ```env
    FACEBOOK_APP_ID=your-app-id
    FACEBOOK_APP_SECRET=your-app-secret
    ```

---

## Frontend Integration

### Install Dependencies (React)

```bash
# For Google OAuth
npm install @react-oauth/google jwt-decode

# For Facebook OAuth
npm install react-facebook-login
```

### Example React App

```tsx
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const API_URL = "http://localhost:3000/customer/auth";

function App() {
    const handleGoogleSuccess = async (credentialResponse) => {
        const decoded = jwtDecode(credentialResponse.credential);

        const response = await axios.post(
            `${API_URL}/oauth`,
            {
                providerId: decoded.sub,
                providerType: "google",
                email: decoded.email,
                name: decoded.name,
                avatar: decoded.picture,
            },
            { withCredentials: true }
        );

        localStorage.setItem("accessToken", response.data.accessToken);
        alert("Login successful!");
    };

    return (
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
            <div>
                <h1>Customer Login</h1>
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => console.log("Login Failed")}
                />
            </div>
        </GoogleOAuthProvider>
    );
}
```

---

## API Endpoints Reference

| Method | Endpoint                         | Description                   | Auth Required |
| ------ | -------------------------------- | ----------------------------- | ------------- |
| POST   | `/customer/auth/register`        | Register with email/password  | No            |
| POST   | `/customer/auth/login`           | Login with email/password     | No            |
| POST   | `/customer/auth/oauth`           | OAuth login (Google/Facebook) | No            |
| POST   | `/customer/auth/logout`          | Logout                        | No            |
| GET    | `/customer/auth/refresh`         | Refresh access token          | Cookie        |
| POST   | `/customer/auth/forgot-password` | Request password reset        | No            |
| GET    | `/customer/auth/profile`         | Get customer profile          | Bearer Token  |

---

## Security Checklist

### Development

-   ✅ Use HTTPS in production
-   ✅ Set secure cookie flags in production (`secure: true`)
-   ✅ Configure CORS properly
-   ✅ Use strong JWT secrets (32+ chars)
-   ✅ Rate limit authentication endpoints

### Production

-   ✅ Enable `NODE_ENV=production`
-   ✅ Use environment variables for secrets
-   ✅ Configure proper CORS origins
-   ✅ Enable secure cookies
-   ✅ Implement email verification
-   ✅ Add rate limiting
-   ✅ Monitor failed login attempts
-   ✅ Implement HTTPS only

---

## Troubleshooting

### Issue: "Unauthorized" on login

**Solution:** Check that ACCESS_TOKEN_SECRET is set in `.env`

### Issue: OAuth not working

**Solution:**

1. Verify OAuth credentials in `.env`
2. Check redirect URIs match exactly in OAuth provider settings
3. Ensure frontend is sending correct provider data

### Issue: Refresh token not working

**Solution:**

1. Check cookies are enabled in browser
2. Verify `withCredentials: true` in axios requests
3. Check CORS settings allow credentials

### Issue: "Password must include..." error

**Solution:** Password must have:

-   At least 8 characters
-   One uppercase letter
-   One lowercase letter
-   One digit
-   One special character (@$!%\*?&#^()[]{})`

---

## Next Steps

1. **Customize Password Requirements** - Edit regex in `auth.controller.ts`
2. **Add Email Verification** - Implement email verification flow
3. **Add Password Reset** - Complete password reset functionality
4. **Add More OAuth Providers** - Apple, Microsoft, etc.
5. **Implement Rate Limiting** - Protect against brute force attacks
6. **Add Session Management** - Track active sessions per customer

---

## Files Created

-   `api/services/customer/customer.service.ts` - Database operations
-   `api/controllers/customer/auth.controller.ts` - Authentication logic
-   `api/routes/customer-auth.routes.ts` - Route definitions
-   `api/middleware/verifyCustomerJWT.ts` - JWT verification middleware
-   `api/config/oauth.config.ts` - OAuth configuration
-   `api/docs/CUSTOMER_AUTHENTICATION.md` - Full documentation
-   `api/docs/CUSTOMER_AUTH_SETUP.md` - This setup guide

---

## Support

For detailed API documentation and examples, see:
📖 `api/docs/CUSTOMER_AUTHENTICATION.md`
