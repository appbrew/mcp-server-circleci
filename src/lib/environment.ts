interface CircleCIEnvironment {
  CIRCLECI_TOKEN: string;
  CIRCLECI_BASE_URL?: string;
}

export interface UserContext {
  userId: string;
  clientId: string;
}

// Per-user environment storage
const userEnvironments = new Map<string, CircleCIEnvironment>();

export function setUserEnvironment(userContext: UserContext, env: CircleCIEnvironment) {
  const key = `${userContext.clientId}:${userContext.userId}`;
  userEnvironments.set(key, env);
}

export function getUserEnvironment(userContext: UserContext): CircleCIEnvironment {
  const key = `${userContext.clientId}:${userContext.userId}`;
  const env = userEnvironments.get(key);
  
  if (!env) {
    throw new Error(`Environment not initialized for user ${userContext.userId}. Call setUserEnvironment() first.`);
  }
  
  return env;
}

// Legacy global environment functions (deprecated but kept for backward compatibility)
let currentEnvironment: CircleCIEnvironment | null = null;

export function setEnvironment(env: CircleCIEnvironment) {
  currentEnvironment = env;
}

export function getEnvironment(): CircleCIEnvironment {
  if (!currentEnvironment) {
    throw new Error('Environment not initialized. Call setEnvironment() first.');
  }
  return currentEnvironment;
}

export function clearEnvironment() {
  currentEnvironment = null;
}