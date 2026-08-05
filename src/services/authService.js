import { disabledServiceError, normalizeDataError } from '../data/errors.js';

export function createAuthService({ client } = {}) {
  const requireEnabled = () => {
    if (!client) throw disabledServiceError('Authentication');
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
    registerPasskey() { return call('registerPasskey', () => client.auth.registerPasskey()); },
    signInWithPasskey() { return call('signInWithPasskey', () => client.auth.signInWithPasskey()); },
    listPasskeys() { return call('listPasskeys', () => client.auth.passkey.list()); },
    renamePasskey(passkeyId, friendlyName) {
      return call('renamePasskey', () => client.auth.passkey.update({ passkeyId, friendlyName }));
    },
    removePasskey(passkeyId) {
      return call('removePasskey', () => client.auth.passkey.delete({ passkeyId }));
    },
    onAuthStateChange(callback) {
      requireEnabled();
      return client.auth.onAuthStateChange(callback).data.subscription;
    },
  });
}
