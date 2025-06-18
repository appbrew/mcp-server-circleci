import { CircleCIMCP } from './circleci-mcp';
import { handleOAuthRequest } from './oauth-handler';
import '../../worker-configuration';

export { CircleCIMCP };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle OAuth-related requests
    if (
      url.pathname.startsWith('/oauth/') ||
      url.pathname === '/authorize' ||
      url.pathname === '/token'
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

    // Default response
    return new Response('CircleCI MCP Server with OAuth', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
