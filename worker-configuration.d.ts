declare global {
  interface Env {
    // OAuth configuration
    ACCESS_CLIENT_ID: string;
    ACCESS_CLIENT_SECRET: string;
    ACCESS_TOKEN_URL: string;
    ACCESS_AUTHORIZATION_URL: string;
    ACCESS_JWKS_URL: string;
    COOKIE_ENCRYPTION_KEY: string;

    // CircleCI configuration
    CIRCLECI_TOKEN: string;
    CIRCLECI_BASE_URL: string;

    // Bindings
    OAUTH_DATA: KVNamespace;
  }
}

export {};
