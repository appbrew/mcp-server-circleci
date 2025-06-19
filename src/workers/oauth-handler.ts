import { decryptCookie, encryptCookie, generateConsentForm } from './oauth-utils';

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

export async function handleOAuthRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  switch (url.pathname) {
    case '/authorize':
      return handleAuthorizeRequest(request, env);
    case '/token':
      return handleTokenRequest(request, env);
    case '/oauth/consent':
      return handleConsentRequest(request, env);
    case '/oauth/callback':
      return handleCallbackRequest(request, env);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function handleAuthorizeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const responseType = url.searchParams.get('response_type');
  const state = url.searchParams.get('state');
  const scope = url.searchParams.get('scope');

  if (!clientId || !redirectUri || responseType !== 'code') {
    return new Response('Invalid request parameters', { status: 400 });
  }

  // Check if client is already authorized
  const authKey = `auth:${clientId}`;
  const existingAuth = await env.MCP_OAUTH_DATA.get(authKey);

  if (existingAuth) {
    // Generate authorization code
    const code = crypto.randomUUID();
    const codeKey = `code:${code}`;
    await env.MCP_OAUTH_DATA.put(
      codeKey,
      JSON.stringify({
        clientId,
        redirectUri,
        scope,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      }),
      { expirationTtl: 600 }
    );

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return Response.redirect(redirectUrl.toString(), 302);
  }

  // Show consent form
  const consentForm = generateConsentForm({
    clientId,
    redirectUri,
    state: state || undefined,
    scope: scope || 'read',
  });

  return new Response(consentForm, {
    headers: { 'Content-Type': 'text/html' },
  });
}

async function handleConsentRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const formData = await request.formData();
  const clientId = formData.get('client_id') as string;
  const redirectUri = formData.get('redirect_uri') as string;
  const state = formData.get('state') as string | null;
  const scope = formData.get('scope') as string;
  const action = formData.get('action') as string;

  if (action !== 'allow') {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', 'access_denied');
    if (state) redirectUrl.searchParams.set('state', state);
    return Response.redirect(redirectUrl.toString(), 302);
  }

  // Redirect to Cloudflare Access for authentication
  const accessUrl = new URL(env.ACCESS_AUTHORIZATION_URL);
  accessUrl.searchParams.set('client_id', env.ACCESS_CLIENT_ID);
  accessUrl.searchParams.set('response_type', 'code');
  accessUrl.searchParams.set('redirect_uri', `${new URL(request.url).origin}/oauth/callback`);
  accessUrl.searchParams.set('scope', 'openid profile email');

  // Store OAuth state in encrypted cookie
  const oauthState = {
    clientId,
    redirectUri,
    state,
    scope,
    originalState: crypto.randomUUID(),
  };

  const encryptedState = await encryptCookie(JSON.stringify(oauthState), env.COOKIE_ENCRYPTION_KEY);
  accessUrl.searchParams.set('state', oauthState.originalState);

  return new Response('', {
    status: 302,
    headers: {
      Location: accessUrl.toString(),
      'Set-Cookie': `oauth_state=${encryptedState}; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
    },
  });
}

async function handleTokenRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const formData = await request.formData();
  const grantType = formData.get('grant_type') as string;
  const code = formData.get('code') as string;
  const clientId = formData.get('client_id') as string;
  const clientSecret = formData.get('client_secret') as string;

  if (grantType !== 'authorization_code' || !code || !clientId) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify client credentials (basic validation)
  if (clientSecret && clientSecret !== 'valid-secret') {
    return new Response(JSON.stringify({ error: 'invalid_client' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify authorization code
  const codeKey = `code:${code}`;
  const codeData = await env.MCP_OAUTH_DATA.get(codeKey);

  if (!codeData) {
    return new Response(JSON.stringify({ error: 'invalid_grant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsedCodeData = JSON.parse(codeData);
  if (parsedCodeData.expiresAt < Date.now()) {
    await env.MCP_OAUTH_DATA.delete(codeKey);
    return new Response(JSON.stringify({ error: 'invalid_grant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generate access token
  const accessToken = crypto.randomUUID();
  const tokenKey = `token:${accessToken}`;
  await env.MCP_OAUTH_DATA.put(
    tokenKey,
    JSON.stringify({
      clientId: parsedCodeData.clientId,
      scope: parsedCodeData.scope,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    }),
    { expirationTtl: 3600 }
  );

  // Clean up authorization code
  await env.MCP_OAUTH_DATA.delete(codeKey);

  return new Response(
    JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: parsedCodeData.scope,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function handleCallbackRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Check for authorization errors
  if (error) {
    return new Response(`Authorization failed: ${error}`, { status: 400 });
  }

  if (!code || !state) {
    return new Response('Missing authorization code or state', { status: 400 });
  }

  // Retrieve OAuth state from cookie
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return new Response('Missing OAuth state cookie', { status: 400 });
  }

  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(cookie => {
      const [name, value] = cookie.split('=');
      return [name, value];
    })
  );

  const encryptedState = cookies.oauth_state;
  if (!encryptedState) {
    return new Response('Missing OAuth state cookie', { status: 400 });
  }

  // Decrypt and parse OAuth state
  const decryptedState = await decryptCookie(encryptedState, env.COOKIE_ENCRYPTION_KEY);
  if (!decryptedState) {
    return new Response('Invalid OAuth state cookie', { status: 400 });
  }

  let oauthState: {
    clientId: string;
    redirectUri: string;
    state: string | null;
    scope: string;
    originalState: string;
  };
  try {
    oauthState = JSON.parse(decryptedState);
  } catch {
    return new Response('Invalid OAuth state format', { status: 400 });
  }

  // Verify state parameter matches
  if (oauthState.originalState !== state) {
    return new Response('State mismatch', { status: 400 });
  }

  // Exchange authorization code for access token with Cloudflare Access
  try {
    const tokenResponse = await fetch(env.ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.ACCESS_CLIENT_ID,
        client_secret: env.ACCESS_CLIENT_SECRET,
        code: code,
        redirect_uri: `${new URL(request.url).origin}/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response('Token exchange failed', { status: 500 });
    }

    const tokenData = await tokenResponse.json() as { access_token: string; token_type: string };
    
    // Verify the access token by fetching user info (optional validation)
    const userInfoResponse = await fetch(`${env.ACCESS_JWKS_URL.replace('/certs', '/userinfo')}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('User info fetch failed');
      return new Response('User verification failed', { status: 500 });
    }

    // Mark client as authorized
    const authKey = `auth:${oauthState.clientId}`;
    await env.MCP_OAUTH_DATA.put(
      authKey,
      JSON.stringify({
        authorizedAt: Date.now(),
        scope: oauthState.scope,
      }),
      { expirationTtl: 86400 * 30 } // 30 days
    );

    // Generate authorization code for the original OAuth flow
    const authCode = crypto.randomUUID();
    const codeKey = `code:${authCode}`;
    await env.MCP_OAUTH_DATA.put(
      codeKey,
      JSON.stringify({
        clientId: oauthState.clientId,
        redirectUri: oauthState.redirectUri,
        scope: oauthState.scope,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      }),
      { expirationTtl: 600 }
    );

    // Redirect back to the original client application
    const redirectUrl = new URL(oauthState.redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (oauthState.state) {
      redirectUrl.searchParams.set('state', oauthState.state);
    }

    return new Response('', {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Set-Cookie': 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0', // Clear the cookie
      },
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
}
