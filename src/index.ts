#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CCI_HANDLERS, CCI_TOOLS, type ToolHandler } from './circleci-tools.js';
import { setEnvironment } from './lib/environment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

// Initialize environment from process.env
setEnvironment({
  CIRCLECI_TOKEN: process.env.CIRCLECI_TOKEN || '',
  CIRCLECI_BASE_URL: process.env.CIRCLECI_BASE_URL,
});

const server = new McpServer(
  {
    name: 'mcp-server-circleci',
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Register tools
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

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error('Server error:', error);
  process.exit(1);
});
