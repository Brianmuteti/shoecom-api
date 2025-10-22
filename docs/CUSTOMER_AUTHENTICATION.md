# Customer Authentication System

## Overview

The customer authentication system supports **hybrid authentication** with both email/password and OAuth providers (Google, Facebook). This gives customers flexibility while maximizing conversion rates.

## Architecture

### Models

**Customer Model** (`api/prisma/schema.prisma`)

```prisma
model Customer {
  id            Int       @id @default(autoincrement())
  email         String?   @unique
  phone         String?   @unique
  name          String?
  password      String?   // Null for OAuth-only customers
  providerId    String?   // OAuth provider unique ID
  providerType  String?   // 'email', 'google', 'facebook'
  emailVerified Boolean   @default(false)
  avatar        String?   // Profile picture URL
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  // ... relations
}
```

### Key Features

✅ **Email/Password Authentication**
✅ **OAuth (Google, Facebook)**
✅ **JWT Access & Refresh Tokens**
✅ **Email Verification Support**
✅ **Password Reset Flow**
✅ **Secure Cookie-based Refresh Tokens**

---

## API Endpoints

Base URL: `/customer/auth`

### 1. Register with Email/Password

**POST** `/customer/auth/register`

```json
{
    "email": "customer@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "phone": "+1234567890" // optional
}
```

**Response (201)**

```json
{
    "message": "Registration successful",
    "customer": {
        "id": 1,
        "email": "customer@example.com",
        "name": "John Doe",
        "emailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notes:**

-   Password must be at least 8 characters
-   Must include uppercase, lowercase, digit, and special character
-   Refresh token set as `jwt_customer` HTTP-only cookie

---

### 2. Login with Email/Password

**POST** `/customer/auth/login`

```json
{
    "email": "customer@example.com",
    "password": "SecurePass123!"
}
```

**Response (200)**

```json
{
    "message": "Login successful",
    "customer": {
        "id": 1,
        "email": "customer@example.com",
        "name": "John Doe",
        "emailVerified": true,
        "avatar": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Cases:**

-   `401`: Invalid credentials
-   `401`: Account uses OAuth login (not email/password)

---

### 3. OAuth Login (Google/Facebook)

**POST** `/customer/auth/oauth`

```json
{
    "providerId": "1234567890",
    "providerType": "google",
    "email": "customer@gmail.com",
    "name": "John Doe",
    "avatar": "https://lh3.googleusercontent.com/..."
}
```

**Response (200)**

```json
{
    "message": "OAuth login successful",
    "customer": {
        "id": 1,
        "email": "customer@gmail.com",
        "name": "John Doe",
        "emailVerified": true,
        "avatar": "https://lh3.googleusercontent.com/...",
        "providerType": "google"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Behavior:**

-   Creates new customer if doesn't exist
-   Links OAuth to existing email/password account if email matches
-   OAuth emails are automatically verified

---

### 4. Refresh Access Token

**GET** `/customer/auth/refresh`

**Requirements:**

-   `jwt_customer` cookie must be present

**Response (200)**

```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 5. Logout

**POST** `/customer/auth/logout`

**Response (200)**

```json
{
    "message": "Logout successful"
}
```

Clears the `jwt_customer` cookie.

---

### 6. Get Profile (Protected)

**GET** `/customer/auth/profile`

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response (200)**

```json
{
    "customer": {
        "id": 1,
        "email": "customer@example.com",
        "name": "John Doe",
        "phone": "+1234567890",
        "emailVerified": true,
        "avatar": null,
        "providerType": "email",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z",
        "addresses": [],
        "Order": []
    }
}
```

---

### 7. Forgot Password

**POST** `/customer/auth/forgot-password`

```json
{
    "email": "customer@example.com"
}
```

**Response (200)**

```json
{
    "message": "If the email exists, a reset link has been sent"
}
```

**Note:** Returns same message regardless of email existence (security best practice)

---

## Frontend Integration Examples

### React Example with Email/Password

```typescript
// api/auth.ts
import axios from "axios";

const API_URL = "http://localhost:3000/customer/auth";

export const register = async (data: {
    email: string;
    password: string;
    name: string;
}) => {
    const response = await axios.post(`${API_URL}/register`, data, {
        withCredentials: true, // Important for cookies
    });
    return response.data;
};

export const login = async (email: string, password: string) => {
    const response = await axios.post(
        `${API_URL}/login`,
        { email, password },
        { withCredentials: true }
    );
    return response.data;
};

export const logout = async () => {
    await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
};

export const getProfile = async (token: string) => {
    const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
    });
    return response.data;
};

export const refreshToken = async () => {
    const response = await axios.get(`${API_URL}/refresh`, {
        withCredentials: true,
    });
    return response.data;
};
```

### React Login Component

```tsx
import { useState } from "react";
import { login } from "./api/auth";

export const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const data = await login(email, password);
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("customer", JSON.stringify(data.customer));
            // Redirect to dashboard
            window.location.href = "/dashboard";
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
            />
            {error && <p style={{ color: "red" }}>{error}</p>}
            <button type="submit">Login</button>
        </form>
    );
};
```

---

## OAuth Integration

### Google OAuth Setup

1. **Create Google OAuth App**

    - Go to [Google Cloud Console](https://console.cloud.google.com/)
    - Create project → Enable Google+ API
    - Create OAuth 2.0 credentials
    - Add authorized redirect URI: `http://localhost:3000/auth/google/callback`

2. **Add to `.env`**

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### Facebook OAuth Setup

1. **Create Facebook App**

    - Go to [Facebook Developers](https://developers.facebook.com/)
    - Create App → Add Facebook Login
    - Add Valid OAuth Redirect URI: `http://localhost:3000/auth/facebook/callback`

2. **Add to `.env`**

```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback
```

### Frontend OAuth Integration (React)

Install Google OAuth package:

```bash
npm install @react-oauth/google
```

**App Setup:**

```tsx
import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
    return (
        <GoogleOAuthProvider clientId="your-google-client-id">
            <YourApp />
        </GoogleOAuthProvider>
    );
}
```

**Google Login Button:**

```tsx
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

export const GoogleLoginButton = () => {
    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            // Decode Google JWT to get user info
            const decoded: any = jwtDecode(credentialResponse.credential);

            // Send to backend
            const response = await axios.post(
                "http://localhost:3000/customer/auth/oauth",
                {
                    providerId: decoded.sub,
                    providerType: "google",
                    email: decoded.email,
                    name: decoded.name,
                    avatar: decoded.picture,
                },
                { withCredentials: true }
            );

            // Store access token
            localStorage.setItem("accessToken", response.data.accessToken);
            localStorage.setItem(
                "customer",
                JSON.stringify(response.data.customer)
            );

            // Redirect
            window.location.href = "/dashboard";
        } catch (error) {
            console.error("Google login failed:", error);
        }
    };

    return (
        <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.log("Login Failed")}
        />
    );
};
```

**Facebook Login Button:**

```tsx
import FacebookLogin from "react-facebook-login";
import axios from "axios";

export const FacebookLoginButton = () => {
    const handleFacebookCallback = async (response: any) => {
        try {
            const result = await axios.post(
                "http://localhost:3000/customer/auth/oauth",
                {
                    providerId: response.id,
                    providerType: "facebook",
                    email: response.email,
                    name: response.name,
                    avatar: response.picture.data.url,
                },
                { withCredentials: true }
            );

            localStorage.setItem("accessToken", result.data.accessToken);
            localStorage.setItem(
                "customer",
                JSON.stringify(result.data.customer)
            );
            window.location.href = "/dashboard";
        } catch (error) {
            console.error("Facebook login failed:", error);
        }
    };

    return (
        <FacebookLogin
            appId="your-facebook-app-id"
            autoLoad={false}
            fields="name,email,picture"
            callback={handleFacebookCallback}
        />
    );
};
```

---

## Token Management

### Access Token

-   **Expires:** 15 minutes
-   **Storage:** localStorage (or memory for extra security)
-   **Format:** JWT with customer info

### Refresh Token

-   **Expires:** 7 days
-   **Storage:** HTTP-only cookie (`jwt_customer`)
-   **Security:** Can't be accessed by JavaScript

### Token Refresh Strategy

```typescript
import axios from "axios";

// Add axios interceptor to refresh token on 401
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const { data } = await axios.get(
                    "http://localhost:3000/customer/auth/refresh",
                    {
                        withCredentials: true,
                    }
                );

                localStorage.setItem("accessToken", data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

                return axios(originalRequest);
            } catch (refreshError) {
                // Refresh failed, redirect to login
                localStorage.removeItem("accessToken");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
```

---

## Security Best Practices

### Backend

✅ Passwords hashed with bcrypt (10 rounds)
✅ JWT tokens signed with secrets
✅ HTTP-only cookies for refresh tokens
✅ Rate limiting on login endpoint
✅ Email verification support
✅ Secure cookie flags in production

### Frontend

✅ Access tokens in localStorage (short-lived)
✅ Refresh tokens in HTTP-only cookies (can't be accessed by JS)
✅ Automatic token refresh
✅ HTTPS in production
✅ CORS properly configured

---

## Environment Variables Required

```env
# JWT Secrets (use strong random strings)
ACCESS_TOKEN_SECRET=your-access-token-secret-here
REFRESH_TOKEN_SECRET=your-refresh-token-secret-here

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# OAuth - Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# Application
NODE_ENV=development
DOMAIN=http://localhost:3000
```

---

## Testing

### Postman Collection

**Register:**

```http
POST http://localhost:3000/customer/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!",
  "name": "Test User"
}
```

**Login:**

```http
POST http://localhost:3000/customer/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Get Profile:**

```http
GET http://localhost:3000/customer/auth/profile
Authorization: Bearer <your-access-token>
```

---

## Differences: User vs Customer Auth

| Feature          | User (Staff/Admin)  | Customer               |
| ---------------- | ------------------- | ---------------------- |
| **Auth Type**    | Email/Password only | Email/Password + OAuth |
| **Cookie Name**  | `jwt`               | `jwt_customer`         |
| **Endpoint**     | `/auth`             | `/customer/auth`       |
| **Use Case**     | Dashboard access    | E-commerce shopping    |
| **Verification** | Required            | Optional               |
| **OAuth**        | ❌                  | ✅ Google, Facebook    |

---

## Next Steps

1. **Implement Email Verification**

    - Add verification token fields to Customer model
    - Create email verification endpoint
    - Send verification emails

2. **Complete Password Reset**

    - Add reset token fields to Customer model
    - Create reset password endpoint
    - Integrate with email service

3. **Add More OAuth Providers**

    - Apple Sign In
    - Microsoft
    - Twitter/X

4. **Implement Phone Login**
    - SMS OTP verification
    - Phone number as primary identifier

---

## Support

For issues or questions, refer to:

-   `api/controllers/customer/auth.controller.ts` - Controller logic
-   `api/services/customer/customer.service.ts` - Database operations
-   `api/routes/customer-auth.routes.ts` - Route definitions
-   `api/middleware/verifyCustomerJWT.ts` - Auth middleware
