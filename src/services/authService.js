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
  const callPasskey = async (action) => {
    requireEnabled();
    const { data, error } = await action();
    // WebAuthn errors contain the actionable RP/origin or cancellation detail.
    // Do not replace them with the generic data-access message.
    if (error) throw error;
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
    registerPasskey() { return callPasskey(() => client.auth.registerPasskey()); },
    signInWithPasskey() { return callPasskey(() => client.auth.signInWithPasskey()); },
    listPasskeys() { return callPasskey(() => client.auth.passkey.list()); },
    renamePasskey(passkeyId, friendlyName) {
      return callPasskey(() => client.auth.passkey.update({ passkeyId, friendlyName }));
    },
    removePasskey(passkeyId) {
      return callPasskey(() => client.auth.passkey.delete({ passkeyId }));
    },
    onAuthStateChange(callback) {
      requireEnabled();
      return client.auth.onAuthStateChange(callback).data.subscription;
    },
  });
}
