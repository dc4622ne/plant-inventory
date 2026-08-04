import { featureFlags } from '../config/featureFlags.js';
import { disabledServiceError, normalizeDataError } from '../data/errors.js';

export function createAuthService({ client, flags = featureFlags } = {}) {
  const requireEnabled = () => {
    if (!flags.authEnabled || !client) throw disabledServiceError('Authentication');
  };
  const call = async (operation, action) => {
    requireEnabled();
    const { data, error } = await action();
    if (error) throw normalizeDataError(error, operation);
    return data;
  };
  return Object.freeze({
    signInWithPassword(email, password) {
      return call('signInWithPassword', () => client.auth.signInWithPassword({ email, password }));
    },
    signUp(email, password) {
      return call('signUp', () => client.auth.signUp({ email, password }));
    },
    signOut() { return call('signOut', () => client.auth.signOut()); },
    getCurrentUser() { return call('getCurrentUser', () => client.auth.getUser()).then((data) => data.user || null); },
    onAuthStateChange(callback) {
      requireEnabled();
      return client.auth.onAuthStateChange(callback).data.subscription;
    },
  });
}
