interface ConsentFormParams {
  clientId: string;
  redirectUri: string;
  state?: string;
  scope: string;
}

export function generateConsentForm(params: ConsentFormParams): string {
  const { clientId, redirectUri, state, scope } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CircleCI MCP Server - Authorization</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .app-name {
            color: #333;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }
        .subtitle {
            color: #666;
            margin-top: 8px;
        }
        .permission-section {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .permission-title {
            font-weight: 600;
            margin-bottom: 10px;
        }
        .permission-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .permission-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .permission-list li:last-child {
            border-bottom: none;
        }
        .button-group {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }
        .btn {
            flex: 1;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #007bff;
            color: white;
        }
        .btn-primary:hover {
            background: #0056b3;
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background: #545862;
        }
        .client-info {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .client-info strong {
            color: #1976d2;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="app-name">CircleCI MCP Server</h1>
            <p class="subtitle">Authorization Request</p>
        </div>
        
        <div class="client-info">
            <strong>Application:</strong> ${escapeHtml(clientId)}<br>
            <strong>Redirect URI:</strong> ${escapeHtml(redirectUri)}<br>
            <strong>Requested Scope:</strong> ${escapeHtml(scope)}
        </div>
        
        <div class="permission-section">
            <div class="permission-title">This application is requesting access to:</div>
            <ul class="permission-list">
                <li>🔍 Access your CircleCI projects and pipelines</li>
                <li>📊 View build logs and test results</li>
                <li>🔄 Trigger and manage pipeline runs</li>
                <li>📈 Access project insights and analytics</li>
            </ul>
        </div>
        
        <form method="POST" action="/oauth/consent">
            <input type="hidden" name="client_id" value="${escapeHtml(clientId)}">
            <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
            <input type="hidden" name="scope" value="${escapeHtml(scope)}">
            ${state ? `<input type="hidden" name="state" value="${escapeHtml(state)}">` : ''}
            
            <div class="button-group">
                <button type="submit" name="action" value="deny" class="btn btn-secondary">
                    Cancel
                </button>
                <button type="submit" name="action" value="allow" class="btn btn-primary">
                    Authorize Application
                </button>
            </div>
        </form>
    </div>
</body>
</html>`;
}

export async function encryptCookie(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(key.slice(0, 32).padEnd(32, '0'));
  const dataBuffer = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const combined = new Uint8Array(dataBuffer.length + signature.byteLength);
  combined.set(new Uint8Array(dataBuffer));
  combined.set(new Uint8Array(signature), dataBuffer.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptCookie(encryptedData: string, key: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(key.slice(0, 32).padEnd(32, '0'));

    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map((char) => char.charCodeAt(0))
    );

    const dataLength = combined.length - 32; // HMAC-SHA256 is 32 bytes
    const dataBuffer = combined.slice(0, dataLength);
    const signature = combined.slice(dataLength);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signature, dataBuffer);

    if (!isValid) {
      return null;
    }

    return new TextDecoder().decode(dataBuffer);
  } catch (error) {
    console.error('Cookie decryption failed:', error);
    return null;
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
