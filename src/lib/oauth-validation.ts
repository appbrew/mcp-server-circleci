export interface TokenData {
  clientId: string;
  scope: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
}

export async function validateToken(token: string, kvNamespace: KVNamespace): Promise<TokenData | null> {
  try {
    const tokenKey = `token:${token}`;
    const tokenDataString = await kvNamespace.get(tokenKey);
    
    if (!tokenDataString) {
      return null;
    }
    
    const tokenData = JSON.parse(tokenDataString) as TokenData;
    
    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      // Clean up expired token
      await kvNamespace.delete(tokenKey);
      return null;
    }
    
    return tokenData;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}