interface CircleCIEnvironment {
  CIRCLECI_TOKEN: string;
  CIRCLECI_BASE_URL?: string;
}

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