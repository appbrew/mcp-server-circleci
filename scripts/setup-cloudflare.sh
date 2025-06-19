#!/bin/bash

# CircleCI MCP Server - Cloudflare Setup Script

set -e

echo "🚀 Setting up CircleCI MCP Server for Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed. Installing..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI is already installed"
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔑 Please log in to Cloudflare..."
    wrangler login
else
    echo "✅ Already logged in to Cloudflare"
fi

# Create KV namespace for OAuth data
echo "📦 Creating KV namespace for OAuth data..."
KV_ID=$(wrangler kv namespace create "MCP_OAUTH_DATA" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
PREVIEW_KV_ID=$(wrangler kv namespace create "MCP_OAUTH_DATA" --preview | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

echo "✅ KV namespace created:"
echo "   Production ID: $KV_ID"
echo "   Preview ID: $PREVIEW_KV_ID"

# Update wrangler.jsonc with KV namespace IDs
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/your-kv-namespace-id/$KV_ID/g" wrangler.jsonc
    sed -i '' "s/your-preview-kv-namespace-id/$PREVIEW_KV_ID/g" wrangler.jsonc
else
    # Linux
    sed -i "s/your-kv-namespace-id/$KV_ID/g" wrangler.jsonc
    sed -i "s/your-preview-kv-namespace-id/$PREVIEW_KV_ID/g" wrangler.jsonc
fi

echo "✅ Updated wrangler.jsonc with KV namespace IDs"

# Create .dev.vars from example
if [ ! -f ".dev.vars" ]; then
    cp .dev.vars.example .dev.vars
    echo "📝 Created .dev.vars file. Please update it with your configuration:"
    echo "   - ACCESS_CLIENT_ID"
    echo "   - ACCESS_CLIENT_SECRET"
    echo "   - ACCESS_TOKEN_URL"
    echo "   - ACCESS_AUTHORIZATION_URL"
    echo "   - ACCESS_JWKS_URL"
    echo "   - COOKIE_ENCRYPTION_KEY (generate with: openssl rand -hex 32)"
    echo "   - CIRCLECI_TOKEN"
else
    echo "✅ .dev.vars already exists"
fi

# Generate TypeScript types
echo "🔧 Generating Cloudflare Workers types..."
wrangler types

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Update .dev.vars with your configuration"
echo "2. Set up Cloudflare Access for your domain"
echo "3. Run 'pnpm dev' to start local development"
echo "4. Run 'pnpm deploy' to deploy to Cloudflare Workers"
echo ""
echo "📚 For more information, see the README.md file"