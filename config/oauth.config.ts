/**
 * OAuth Provider Configuration
 * Setup for Google and Facebook OAuth integration
 */

export interface OAuthConfig {
    google: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        scopes: string[];
    };
    facebook: {
        appId: string;
        appSecret: string;
        redirectUri: string;
        scopes: string[];
    };
}

const oauthConfig: OAuthConfig = {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirectUri:
            process.env.GOOGLE_REDIRECT_URI ||
            `${process.env.DOMAIN}/auth/google/callback`,
        scopes: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ],
    },
    facebook: {
        appId: process.env.FACEBOOK_APP_ID || "",
        appSecret: process.env.FACEBOOK_APP_SECRET || "",
        redirectUri:
            process.env.FACEBOOK_REDIRECT_URI ||
            `${process.env.DOMAIN}/auth/facebook/callback`,
        scopes: ["email", "public_profile"],
    },
};

export default oauthConfig;
