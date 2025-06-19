import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CCI_HANDLERS, CCI_TOOLS, type ToolHandler } from '../circleci-tools';

export class CircleCIMCP {
  private server: McpServer | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/sse') {
      return this.handleSSE(request);
    }

    if (url.pathname === '/mcp') {
      return this.handleMCP(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleSSE(request: Request): Promise<Response> {
    if (!this.server) {
      this.server = this.createServer();
    }

    // Handle WebSocket upgrade for MCP Inspector
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const webSocketPair = new WebSocketPair();
      const client = webSocketPair[0];
      const serverSocket = webSocketPair[1];

      serverSocket.accept();
      this.handleWebSocket(serverSocket);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // For regular SSE requests, create a simple stream
    const stream = new ReadableStream({
      start(controller) {
        // Send immediate response for MCP handshake
        const message = JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {}
        });
        controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  private async handleMCP(request: Request): Promise<Response> {
    if (!this.server) {
      this.server = this.createServer();
    }

    const body = await request.text();
    try {
      // Note: This is a simplified implementation.
      // In a real implementation, you'd need to properly handle MCP protocol.
      return new Response(JSON.stringify({ message: 'MCP endpoint not fully implemented' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  private handleWebSocket(webSocket: WebSocket) {
    if (!this.server) {
      this.server = this.createServer();
    }

    webSocket.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle MCP protocol messages
        if (message.method === 'initialize') {
          webSocket.send(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: {},
              },
              serverInfo: {
                name: 'mcp-server-circleci',
                version: '0.10.1',
              }
            }
          }));
        } else if (message.method === 'tools/list') {
          // Return the available CircleCI tools
          webSocket.send(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: { 
              tools: [
                { name: 'getLatestPipelineStatus', description: 'Get the latest pipeline status for a project' },
                { name: 'listFollowedProjects', description: 'List followed projects' },
                { name: 'getBuildFailureLogs', description: 'Get build failure logs' },
                // Add other tools as needed
              ]
            }
          }));
        } else {
          // Forward other messages to the MCP server
          webSocket.send(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          }));
        }
      } catch (error) {
        webSocket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error',
              data: error instanceof Error ? error.message : 'Unknown error'
            }
          })
        );
      }
    });

    webSocket.addEventListener('close', () => {
      console.log('WebSocket connection closed');
    });
  }

  private createServer(): McpServer {
    const server = new McpServer(
      {
        name: 'mcp-server-circleci',
        version: '0.10.1',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Register all CircleCI tools
    CCI_TOOLS.forEach((tool) => {
      const handler = CCI_HANDLERS[tool.name];
      if (!handler) {
        throw new Error(`Handler for tool ${tool.name} not found`);
      }

      server.tool(
        tool.name,
        tool.description,
        { params: tool.inputSchema },
        handler as ToolHandler<typeof tool.name>
      );
    });

    return server;
  }
}
