import { CircleCIMCP } from './circleci-mcp';
import { handleOAuthRequest } from './oauth-handler';

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
  MCP_OAUTH_DATA: KVNamespace;
}

export { CircleCIMCP };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle OAuth-related requests
    if (
      url.pathname.startsWith('/oauth/') ||
      url.pathname === '/authorize' ||
      url.pathname === '/token' ||
      url.pathname === '/register'
    ) {
      return handleOAuthRequest(request, env);
    }

    // Handle MCP requests
    if (url.pathname === '/mcp') {
      const mcpInstance = new CircleCIMCP();
      return mcpInstance.fetch(request);
    }

    // Handle SSE endpoint for MCP Inspector
    if (url.pathname === '/sse') {
      const mcpInstance = new CircleCIMCP();
      return mcpInstance.fetch(request);
    }

    // Handle OAuth discovery endpoint
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      const baseUrl = new URL(request.url).origin;
      return new Response(JSON.stringify({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        jwks_uri: env.ACCESS_JWKS_URL || `${baseUrl}/.well-known/jwks.json`,
        registration_endpoint: `${baseUrl}/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: ['read'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic']
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default response with OAuth configuration
    const baseUrl = new URL(request.url).origin;
    return new Response(JSON.stringify({ 
      name: 'CircleCI MCP Server', 
      version: '0.10.1',
      status: 'running',
      oauth: 'enabled',
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      response_types_supported: ['code']
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
