import { CircleCIPrivateClients } from './circleci-private/index.js';
import { CircleCIClients } from './circleci/index.js';
import { getEnvironment, getUserEnvironment, type UserContext } from '../lib/environment.js';

export function getCircleCIClient(userContext?: UserContext) {
  const env = userContext ? getUserEnvironment(userContext) : getEnvironment();
  if (!env.CIRCLECI_TOKEN) {
    throw new Error('CIRCLECI_TOKEN is not set');
  }

  return new CircleCIClients({
    token: env.CIRCLECI_TOKEN,
  });
}

export function getCircleCIPrivateClient(userContext?: UserContext) {
  const env = userContext ? getUserEnvironment(userContext) : getEnvironment();
  if (!env.CIRCLECI_TOKEN) {
    throw new Error('CIRCLECI_TOKEN is not set');
  }

  return new CircleCIPrivateClients({
    token: env.CIRCLECI_TOKEN,
  });
}
