import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CCI_HANDLERS, CCI_TOOLS, type ToolHandler } from '../circleci-tools.js';
import { handleOAuthRequest } from './oauth-handler';
import { setEnvironment } from '../lib/environment.js';
import { validateToken, extractBearerToken } from '../lib/oauth-validation.js';

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

export class CircleCIMCP extends McpAgent {
  server = new McpServer({
    name: 'mcp-circleci',
    version: '0.10.1',
  }) as any;

  env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;

    // Set global environment variables for backward compatibility
    setEnvironment({
      CIRCLECI_TOKEN: env.CIRCLECI_TOKEN,
      CIRCLECI_BASE_URL: env.CIRCLECI_BASE_URL,
    });
  }

  private async authenticateRequest(request: Request): Promise<void> {
    const authHeader = request.headers.get('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new Error('Authorization header with Bearer token is required');
    }

    const tokenData = await validateToken(token, this.env.MCP_OAUTH_DATA);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }
  }

  async init() {
    // Register all CircleCI tools with authentication wrapper
    CCI_TOOLS.forEach((tool) => {
      const handler = CCI_HANDLERS[tool.name];
      if (!handler) {
        throw new Error(`Handler for tool ${tool.name} not found`);
      }

      // Wrap handler with authentication check
      const authenticatedHandler = async (args: any, context: any) => {
        // Extract request from context if available
        const request = context?.request || context?.meta?.request;
        if (request) {
          await this.authenticateRequest(request);
        }
        return handler(args, context);
      };

      this.server.tool(
        tool.name,
        tool.description,
        { params: tool.inputSchema },
        authenticatedHandler as ToolHandler<typeof tool.name>
      );
    });
  }
}

// Helper function for authentication check
async function authenticateRequest(request: Request, env: Env): Promise<void> {
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    throw new Error('Authorization header with Bearer token is required');
  }

  const tokenData = await validateToken(token, env.MCP_OAUTH_DATA);
  if (!tokenData) {
    throw new Error('Invalid or expired token');
  }
}

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

    // Handle MCP SSE endpoint with authentication
    if (url.pathname === '/sse' || url.pathname === '/sse/message') {
      await authenticateRequest(request, env);
      return CircleCIMCP.serveSSE('/sse').fetch(request, env, ctx);
    }

    // Handle MCP endpoint with authentication
    if (url.pathname === '/mcp') {
      await authenticateRequest(request, env);
      return CircleCIMCP.serve('/mcp').fetch(request, env, ctx);
    }

    // Handle OAuth discovery endpoint
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      const baseUrl = new URL(request.url).origin;
      return new Response(
        JSON.stringify({
          issuer: baseUrl,
          authorization_endpoint: `${baseUrl}/authorize`,
          token_endpoint: `${baseUrl}/token`,
          jwks_uri: env.ACCESS_JWKS_URL || `${baseUrl}/.well-known/jwks.json`,
          registration_endpoint: `${baseUrl}/register`,
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code'],
          code_challenge_methods_supported: ['S256'],
          scopes_supported: ['read'],
          token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Default response with OAuth configuration
    const baseUrl = new URL(request.url).origin;
    return new Response(
      JSON.stringify({
        name: 'CircleCI MCP Server',
        version: '0.10.1',
        status: 'running',
        oauth: 'enabled',
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        response_types_supported: ['code'],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
